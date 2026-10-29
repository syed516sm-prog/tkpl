import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { readServerConfig, razorpayKeyMode } from '../_lib/config.js';
import {
  fetchOrder,
  fetchPayment,
  verifyRazorpayWebhookSignature,
} from '../_lib/razorpay.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        method?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
}

/**
 * POST /api/razorpay/webhook
 *
 * Receives background payment capture events directly from Razorpay.
 * Guarantees zero missed registrations even if the player drops their connection
 * or closes the browser right after paying.
 */
export async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const configResult = readServerConfig();
  if (!configResult.ok) {
    return res.status(503).json({ error: 'SERVER_MISCONFIGURED' });
  }
  const config = configResult.config;

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const signature = (req.headers['x-razorpay-signature'] as string) || '';

  // 1. Signature check: if RAZORPAY_WEBHOOK_SECRET is set, verify HMAC
  if (config.razorpayWebhookSecret) {
    const signatureValid = verifyRazorpayWebhookSignature({
      rawBody,
      signature,
      webhookSecret: config.razorpayWebhookSecret,
    });
    if (!signatureValid) {
      return res.status(400).json({ error: 'INVALID_SIGNATURE' });
    }
  }

  let eventData: RazorpayWebhookPayload;
  try {
    eventData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'INVALID_JSON' });
  }

  const eventName = eventData?.event;
  if (eventName !== 'payment.captured' && eventName !== 'order.paid') {
    // Acknowledge other events gracefully
    return res.status(200).json({ status: 'ignored', event: eventName });
  }

  const paymentEntity = eventData.payload?.payment?.entity;
  const orderEntity = eventData.payload?.order?.entity;

  const paymentId = paymentEntity?.id;
  const orderId = paymentEntity?.order_id || orderEntity?.id;

  if (!paymentId || !orderId) {
    return res.status(400).json({ error: 'MISSING_PAYMENT_OR_ORDER_ID' });
  }

  // 2. Double-check authenticity by querying Razorpay API directly
  try {
    const [remoteOrder, remotePayment] = await Promise.all([
      fetchOrder({ keyId: config.razorpayKeyId, keySecret: config.razorpayKeySecret, orderId }),
      fetchPayment({ keyId: config.razorpayKeyId, keySecret: config.razorpayKeySecret, paymentId }),
    ]);

    if (remotePayment.status !== 'captured' || remotePayment.order_id !== orderId) {
      return res.status(400).json({ error: 'PAYMENT_NOT_CAPTURED' });
    }

    if (Number(remotePayment.amount) !== Number(remoteOrder.amount)) {
      return res.status(400).json({ error: 'AMOUNT_MISMATCH' });
    }

    // 3. Mark payment as verified in Supabase
    const supabase = supabaseAdmin(config.supabaseUrl, config.supabaseServiceRoleKey);

    const verified = await supabase.rpc('verify_razorpay_payment', {
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_signature_ok: true,
      p_handler: remotePayment.method ?? null,
      p_mode: razorpayKeyMode(config.razorpayKeyId),
    });

    if (verified.error) {
      console.error('[Razorpay Webhook] Verification RPC error:', verified.error);
      return res.status(500).json({ error: verified.error.message });
    }

    const stored = (verified.data ?? {}) as { registration_no?: string; receipt_no?: string };

    // 4. Automatically confirm and approve the player registration
    if (stored.registration_no) {
      await supabase
        .from('players')
        .update({
          registration_status: 'approved',
          auction_status: 'eligible',
          review_notes: 'Registration confirmed automatically via Razorpay Webhook.',
        })
        .eq('registration_no', stored.registration_no);
    }

    return res.status(200).json({
      status: 'success',
      registration_no: stored.registration_no,
      receipt_no: stored.receipt_no,
    });
  } catch (err) {
    console.error('[Razorpay Webhook] Processing error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export default handler;
