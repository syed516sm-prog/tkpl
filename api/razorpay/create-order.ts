import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { readServerConfig } from '../_lib/config.js';
import { createOrder, RazorpayRequestError } from '../_lib/razorpay.js';
import { errorCode, errorMessage, supabaseAdmin } from '../_lib/supabaseAdmin.js';

interface CreateOrderBody {
  registration_no?: unknown;
  phone?: unknown;
  date_of_birth?: unknown;
}

function fail(res: ApiResponse, status: number, error: string, message: string) {
  res.status(status).json({ error, message });
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * A unique, <=40 character order receipt. `receipt` is treated as unique by
 * Razorpay (a repeat returns "Duplicate receipt found"), so a second attempt for
 * the same registrant must not reuse it.
 */
export function orderReceiptFor(registrationNo: string, now: number = Date.now()): string {
  const base = registrationNo.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20) || 'TKPL';
  return `${base}-${now.toString(36).toUpperCase()}`.slice(0, 40);
}

export interface CreateOrderDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

/**
 * POST /api/razorpay/create-order
 * Body: { registration_no, phone, date_of_birth }
 *
 * Confirms the player exists and is still unpaid (three-factor gate), reads the
 * fee from tournament_settings server-side (never trusts the browser), creates
 * the Razorpay order and stores its id on the pending payment row.
 */
export function createCreateOrderHandler(deps: CreateOrderDeps = {}) {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');
    }

    const configResult = readServerConfig(deps.env);
    if (!configResult.ok) {
      return fail(res, 503, 'SERVER_MISCONFIGURED', 'Online payments are not configured on the server.');
    }
    const config = configResult.config;
    const fetchImpl: typeof fetch = deps.fetchImpl ?? (globalThis.fetch as typeof fetch);

    const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as CreateOrderBody | null;
    const registrationNo = typeof body?.registration_no === 'string' ? body.registration_no.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const dateOfBirth = typeof body?.date_of_birth === 'string' ? body.date_of_birth.trim() : '';
    const cleanPhone = phone.length === 12 && phone.startsWith('91') ? phone.slice(2) : phone;

    if (!registrationNo || !cleanPhone || !dateOfBirth) {
      return fail(
        res,
        400,
        'INVALID_REQUEST',
        'Registration number, mobile number and date of birth are required.'
      );
    }

    const supabase = supabaseAdmin(config.supabaseUrl, config.supabaseServiceRoleKey);

    const lookup = await supabase.rpc('lookup_registration_status', {
      p_registration_no: registrationNo,
      p_phone: cleanPhone,
      p_date_of_birth: dateOfBirth,
    });
    if (lookup.error) {
      return fail(res, 502, 'DEPENDENCY_UNAVAILABLE', 'Could not read the registration right now.');
    }
    const player = lookup.data as Record<string, unknown> | null;
    if (!player) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'We could not match that Registration Number, Mobile Number and Date of Birth.'
      );
    }

    const paymentStatus = String(player.payment_status ?? 'pending');
    if (paymentStatus === 'verified' || paymentStatus === 'refunded') {
      // Prevents a second payment from being started in a second tab.
      return fail(res, 409, 'ALREADY_PAID', 'This registration fee is already paid.');
    }

    const settings = await supabase
      .from('tournament_settings')
      .select('fee_paise, currency')
      .eq('id', 1)
      .maybeSingle();
    const settingsRow = settings.data as { fee_paise?: number; currency?: string } | null;
    const amountPaise = Number(settingsRow?.fee_paise ?? 0);
    const currency = String(settingsRow?.currency ?? 'INR');
    if (!amountPaise || amountPaise < 100) {
      return fail(res, 409, 'INVALID_REQUEST', 'The registration fee is not set. Contact the organizers.');
    }

    // Orders are single-attempt at Razorpay, so the previous unpaid order is
    // retired first and remembered: if the customer paid it anyway (a slow
    // network, then "Pay again"), the reconcile pass finds the capture.
    const retired = await supabase.rpc('register_replaced_razorpay_order', {
      p_registration_no: registrationNo,
      p_phone: cleanPhone,
      p_date_of_birth: dateOfBirth,
      p_keep_order_id: '',
    });
    const replacedOrderIds: string[] = Array.isArray(retired.data) ? (retired.data as string[]) : [];

    let order;
    try {
      order = await createOrder({
        keyId: config.razorpayKeyId,
        keySecret: config.razorpayKeySecret,
        amountPaise,
        currency,
        // Razorpay requires `receipt` to be unique per order (max 40 chars), so
        // a retried or abandoned pay gets a fresh value; the registration number
        // travels in `notes` and on our own pending payment row instead.
        receipt: orderReceiptFor(registrationNo),
        notes: { registration_no: registrationNo },
        fetchImpl,
      });
    } catch (error) {
      const detail = error instanceof RazorpayRequestError ? error.message : 'Razorpay is unreachable.';
      return fail(res, 502, 'RAZORPAY_UNAVAILABLE', `Razorpay rejected the order request: ${detail}`);
    }

    const persisted = await supabase.rpc('create_pending_razorpay_order', {
      p_registration_no: registrationNo,
      p_phone: cleanPhone,
      p_date_of_birth: dateOfBirth,
      p_order_id: order.id,
    });
    if (persisted.error) {
      const code = errorCode(persisted.error);
      if (code === 'P0001' && /ALREADY_PAID/.test(errorMessage(persisted.error))) {
        return fail(res, 409, 'ALREADY_PAID', 'This registration fee is already paid.');
      }
      return fail(res, 502, 'DEPENDENCY_UNAVAILABLE', 'Could not save the payment order. Please retry.');
    }

    const stored = (persisted.data ?? {}) as { status?: string };
    if (stored.status === 'verified' || stored.status === 'refunded') {
      return fail(res, 409, 'ALREADY_PAID', 'This registration fee is already paid.');
    }

    return res.status(200).json({
      order_id: order.id,
      amount_paise: order.amount ?? amountPaise,
      currency: order.currency ?? currency,
      key_id: config.razorpayKeyId,
      prefill: {
        name: String(player.full_name ?? ''),
        contact: cleanPhone,
      },
      replaced_order_ids: replacedOrderIds,
    });
  };
}

export default createCreateOrderHandler();
