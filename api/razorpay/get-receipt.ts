import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { readServerConfig } from '../_lib/config.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

interface GetReceiptBody {
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

export interface GetReceiptDeps {
  env?: Record<string, string | undefined>;
}

/**
 * POST /api/razorpay/get-receipt
 * Body: { registration_no, phone, date_of_birth }
 *
 * Verifies player exists with matching registration number, phone, and date of birth.
 * Confirms payment is verified and returns the receipt payload with the player's
 * photo URL resolved from storage.
 */
export function createGetReceiptHandler(deps: GetReceiptDeps = {}) {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');
    }

    const configResult = readServerConfig(deps.env);
    if (!configResult.ok) {
      return fail(res, 503, 'SERVER_MISCONFIGURED', 'Online service is not configured on the server.');
    }
    const config = configResult.config;

    const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as GetReceiptBody | null;
    const registrationNo = typeof body?.registration_no === 'string' ? body.registration_no.trim().toUpperCase() : '';
    let phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const dateOfBirth = typeof body?.date_of_birth === 'string' ? body.date_of_birth.trim() : '';

    if (phone.length === 12 && phone.startsWith('91')) {
      phone = phone.slice(2);
    }

    if (!registrationNo || !phone || !dateOfBirth) {
      return fail(
        res,
        400,
        'INVALID_REQUEST',
        'Enter all three details together: Registration Number, Mobile Number and Date of Birth.'
      );
    }

    const supabase = supabaseAdmin(config.supabaseUrl, config.supabaseServiceRoleKey);

    // 1. Fetch player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, registration_no, full_name, locality, role, photo_path, created_at')
      .eq('registration_no', registrationNo)
      .eq('phone', phone)
      .eq('date_of_birth', dateOfBirth)
      .maybeSingle();

    if (playerError || !player) {
      // Anti-enumeration: uniform message
      return fail(
        res,
        404,
        'NOT_FOUND',
        'No receipt found for this combination. A receipt exists only after a verified payment, and all three details must match.'
      );
    }

    // 2. Fetch verified payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('amount_paise, currency, receipt_no, paid_at, razorpay_payment_id, razorpay_handler, razorpay_mode, status')
      .eq('player_id', player.id)
      .eq('status', 'verified')
      .not('receipt_no', 'is', null)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (paymentError || !payment || !payment.receipt_no) {
      return fail(
        res,
        404,
        'RECEIPT_NOT_ISSUED',
        'No receipt has been issued for this registration yet. A receipt is issued once online payment is completed.'
      );
    }

    // 3. Resolve photo URL
    let photoUrl: string | null = null;
    if (player.photo_path) {
      const trimmed = player.photo_path.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        photoUrl = trimmed;
      } else {
        const pub = supabase.storage.from('player-photos').getPublicUrl(trimmed);
        photoUrl = pub?.data?.publicUrl || null;
      }
    }

    const receipt = {
      registration_no: player.registration_no,
      full_name: player.full_name,
      locality: player.locality,
      role: player.role,
      photo_url: photoUrl,
      amount_paise: Number(payment.amount_paise ?? 0),
      currency: String(payment.currency ?? 'INR'),
      receipt_no: String(payment.receipt_no),
      paid_at: payment.paid_at ? String(payment.paid_at) : null,
      razorpay_payment_id: String(payment.razorpay_payment_id ?? ''),
      razorpay_handler: String(payment.razorpay_handler ?? ''),
      razorpay_mode: String(payment.razorpay_mode ?? ''),
      status: payment.status,
      submitted_at: player.created_at ? String(player.created_at) : null,
    };

    return res.status(200).json({ receipt });
  };
}

export default createGetReceiptHandler();
