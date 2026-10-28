import type { ApiRequest, ApiResponse } from '../_lib/http';
import { headerValue } from '../_lib/http';
import { readServerConfig, razorpayKeyMode } from '../_lib/config';
import { fetchOrder, fetchOrderPayments, RazorpayRequestError } from '../_lib/razorpay';
import { errorMessage, supabaseAdmin } from '../_lib/supabaseAdmin';
import { loadReceiptForRegistration } from '../_lib/receipt';

/**
 * GET /api/razorpay/reconcile   (Vercel Cron; requires CRON_SECRET)
 *
 * The docs' "Poll APIs" safety net for a lost checkout callback: the player paid,
 * but closed the tab / lost connectivity before the browser re-verified.
 *
 * 1. Take pending orders older than 10 minutes (the browser verify window is
 *    seconds, so anything older was abandoned and never confirmed).
 * 2. Ask Razorpay for each order; if it is `paid`, fetch the captured payment,
 *    re-check method + amount, then run the same `verify_razorpay_payment` RPC
 *    the browser uses — so the receipt is issued idempotently.
 *
 * Never processes money that was not captured, never trusts the browser.
 */

interface PendingRow {
  registration_no?: string;
  razorpay_order_id?: string;
}

interface Outcome {
  order_id: string;
  registration_no: string;
  result: 'receipt_issued' | 'not_paid' | 'skipped' | 'error';
  detail?: string;
}

export interface ReconcileDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

function isAuthorised(req: ApiRequest, env: Record<string, string | undefined>): boolean {
  // Bearer CRON_SECRET is the only safe trigger: Vercel Cron sends
  // "Authorization: Bearer $CRON_SECRET" automatically when that variable is
  // set, and proxies can forge a user-agent but not the secret.
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return false;
  return headerValue(req, 'authorization') === `Bearer ${secret}`;
}

export function createReconcileHandler(deps: ReconcileDeps = {}) {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }
    if (!isAuthorised(req, deps.env ?? process.env)) {
      res.status(401).json({ error: 'UNAUTHORISED' });
      return;
    }

    const configResult = readServerConfig(deps.env);
    if (!configResult.ok) {
      res.status(503).json({ error: 'SERVER_MISCONFIGURED' });
      return;
    }
    const config = configResult.config;
    const fetchImpl: typeof fetch = deps.fetchImpl ?? (globalThis.fetch as typeof fetch);
    const supabase = supabaseAdmin(config.supabaseUrl, config.supabaseServiceRoleKey);

    const pending = await supabase.rpc('pending_razorpay_orders_for_reconcile', {
      p_older_than: '10 minutes',
    });
    if (pending.error) {
      res.status(502).json({ error: 'DEPENDENCY_UNAVAILABLE' });
      return;
    }

    const rows = (Array.isArray(pending.data) ? pending.data : []) as PendingRow[];
    const outcomes: Outcome[] = [];

    for (const row of rows) {
      const orderId = row.razorpay_order_id ?? '';
      const registrationNo = row.registration_no ?? '';
      if (!orderId || !registrationNo) {
        outcomes.push({ order_id: orderId, registration_no: registrationNo, result: 'skipped' });
        continue;
      }

      try {
        const order = await fetchOrder({
          keyId: config.razorpayKeyId,
          keySecret: config.razorpayKeySecret,
          orderId,
          fetchImpl,
        });
        if (order.status !== 'paid') {
          outcomes.push({ order_id: orderId, registration_no: registrationNo, result: 'not_paid' });
          continue;
        }

        // An order can carry several attempts; find the captured one.
        const payment = await findCapturedPayment({
          orderId,
          keyId: config.razorpayKeyId,
          keySecret: config.razorpayKeySecret,
          fetchImpl,
        });
        if (!payment) {
          outcomes.push({
            order_id: orderId,
            registration_no: registrationNo,
            result: 'not_paid',
            detail: 'order paid but no captured payment found yet',
          });
          continue;
        }

        if (Number(payment.amount) !== Number(order.amount)) {
          outcomes.push({
            order_id: orderId,
            registration_no: registrationNo,
            result: 'error',
            detail: 'captured amount does not match the order amount',
          });
          continue;
        }

        const verified = await supabase.rpc('verify_razorpay_payment', {
          p_order_id: orderId,
          p_payment_id: payment.id,
          p_signature_ok: true,
          p_handler: payment.method ?? null,
          p_mode: razorpayKeyMode(config.razorpayKeyId),
        });
        if (verified.error) {
          const locked = /ALREADY_PAID/.test(errorMessage(verified.error));
          outcomes.push({
            order_id: orderId,
            registration_no: registrationNo,
            result: locked ? 'skipped' : 'error',
            detail: errorMessage(verified.error),
          });
          continue;
        }

        const receipt = await loadReceiptForRegistration(supabase, registrationNo);
        outcomes.push({
          order_id: orderId,
          registration_no: registrationNo,
          result: 'receipt_issued',
          detail: receipt.ok ? String(receipt.receipt.receipt_no ?? '') : 'receipt pending',
        });
      } catch (error) {
        outcomes.push({
          order_id: orderId,
          registration_no: registrationNo,
          result: 'error',
          detail: error instanceof RazorpayRequestError ? error.message : 'razorpay unreachable',
        });
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      checked: rows.length,
      issued: outcomes.filter((o) => o.result === 'receipt_issued').length,
      outcomes,
    });
  };
}

/** First captured attempt on an order (an order can have several). */
async function findCapturedPayment(params: {
  orderId: string;
  keyId: string;
  keySecret: string;
  fetchImpl: typeof fetch;
}) {
  const payments = await fetchOrderPayments({
    keyId: params.keyId,
    keySecret: params.keySecret,
    orderId: params.orderId,
    fetchImpl: params.fetchImpl,
  });
  return payments.find((payment) => payment.status === 'captured') ?? null;
}

export default createReconcileHandler();
