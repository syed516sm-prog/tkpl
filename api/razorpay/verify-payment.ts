import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { readServerConfig, razorpayKeyMode } from '../_lib/config.js';
import {
  fetchOrder,
  fetchPayment,
  RazorpayRequestError,
  verifyRazorpaySignature,
} from '../_lib/razorpay.js';
import { errorMessage, supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { loadReceiptForRegistration } from '../_lib/receipt.js';

interface VerifyBody {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
}

function fail(res: ApiResponse, status: number, error: string, message: string, details?: unknown) {
  res.status(status).json(details === undefined ? { error, message } : { error, message, details });
}

export interface VerifyHandlerDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

/**
 * POST /api/razorpay/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * 1. HMAC check against RAZORPAY_KEY_SECRET (constant time).
 * 2. Re-fetch the payment from Razorpay and require captured + matching amount
 *    + matching order (blocks a replayed or mismatched signature).
 * 3. RPC `verify_razorpay_payment` marks it verified and mints the receipt no.
 * 4. RPC `get_receipt` returns the receipt payload for immediate rendering.
 *
 * Repeating the call with the same payment id returns the same receipt.
 */
export function createVerifyPaymentHandler(deps: VerifyHandlerDeps = {}) {
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

    const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as VerifyBody | null;
    const orderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
    const paymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
    const signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';

    if (!orderId || !paymentId || !signature) {
      return fail(res, 400, 'INVALID_REQUEST', 'Order id, payment id and signature are required.');
    }

    const supabase = supabaseAdmin(config.supabaseUrl, config.supabaseServiceRoleKey);

    // Docs: sign with the order id *stored on your server*, not the one Checkout
    // sent back. The browser can only verify an order this server issued, and a
    // paid order keeps its id on our own row even after a refetch.
    const serverOrder = await supabase.rpc('razorpay_order_for_payment', { p_order_id: orderId });
    if (serverOrder.error) {
      return fail(res, 502, 'DEPENDENCY_UNAVAILABLE', 'Could not read the payment order. Please retry.');
    }
    const storedOrder = serverOrder.data as { order_id?: string } | null;
    if (!storedOrder?.order_id) {
      return fail(res, 404, 'NOT_FOUND', 'No registration is linked to this Razorpay order.');
    }
    const serverOrderId = storedOrder.order_id;

    const signatureOk = verifyRazorpaySignature({
      orderId: serverOrderId,
      paymentId,
      signature,
      keySecret: config.razorpayKeySecret,
    });
    if (!signatureOk) {
      return fail(
        res,
        400,
        'SIGNATURE_MISMATCH',
        'We could not confirm this payment. Retry, or contact the organizers with your payment id.'
      );
    }

    // Second gate: the money must actually be captured on this order.
    let order;
    let payment;
    try {
      [order, payment] = await Promise.all([
        fetchOrder({ keyId: config.razorpayKeyId, keySecret: config.razorpayKeySecret, orderId: serverOrderId, fetchImpl }),
        fetchPayment({ keyId: config.razorpayKeyId, keySecret: config.razorpayKeySecret, paymentId, fetchImpl }),
      ]);
    } catch (error) {
      if (error instanceof RazorpayRequestError && error.status === 404) {
        return fail(res, 404, 'PAYMENT_NOT_FOUND', 'Razorpay does not recognise this payment.');
      }
      return fail(res, 502, 'RAZORPAY_UNAVAILABLE', 'Razorpay is not reachable right now. Please retry.');
    }

    if (payment.order_id !== serverOrderId) {
      return fail(res, 400, 'SIGNATURE_MISMATCH', 'This payment does not belong to that order.');
    }
    if (payment.status !== 'captured') {
      return fail(
        res,
        409,
        'PAYMENT_NOT_CAPTURED',
        'Razorpay has not captured this payment yet. Press Retry confirmation in a few seconds.',
        { razorpay_payment_id: paymentId, status: payment.status }
      );
    }
    if (Number(payment.amount) !== Number(order.amount)) {
      return fail(res, 409, 'AMOUNT_MISMATCH', 'The amount received does not match the registration fee.', {
        razorpay_payment_id: paymentId,
      });
    }

    const verified = await supabase.rpc('verify_razorpay_payment', {
      p_order_id: serverOrderId,
      p_payment_id: paymentId,
      p_signature_ok: true,
      p_handler: payment.method ?? null,
      p_mode: razorpayKeyMode(config.razorpayKeyId),
    });
    if (verified.error) {
      const message = errorMessage(verified.error);
      if (/ORDER_NOT_FOUND/.test(message)) {
        return fail(res, 404, 'NOT_FOUND', 'No registration is linked to this Razorpay order.');
      }
      if (/ALREADY_PAID/.test(message)) {
        return fail(
          res,
          409,
          'ALREADY_PAID',
          'This registration fee was already verified with a different payment.',
          { razorpay_payment_id: paymentId }
        );
      }
      return fail(
        res,
        502,
        'DEPENDENCY_UNAVAILABLE',
        'The payment was captured but could not be recorded yet. Your money is safe — press Retry confirmation.',
        { razorpay_payment_id: paymentId }
      );
    }

    const stored = (verified.data ?? {}) as { registration_no?: string; receipt_no?: string };

    // The receipt is rendered for the player who owns this registration. The
    // phone and date of birth never leave the server: they only satisfy the
    // same three-factor gate the public receipt page uses.
    const receipt = await loadReceiptForRegistration(supabase, stored.registration_no ?? '');
    if (!receipt.ok) {
      return fail(
        res,
        502,
        'RECEIPT_NOT_READY',
        'The payment is recorded but the receipt is still being prepared. Press Retry confirmation.',
        { razorpay_payment_id: paymentId }
      );
    }

    return res.status(200).json({
      receipt: receipt.receipt,
      receipt_no: receipt.receipt.receipt_no ?? stored.receipt_no ?? '',
      registration_no: receipt.receipt.registration_no ?? stored.registration_no ?? '',
    });
  };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default createVerifyPaymentHandler();
