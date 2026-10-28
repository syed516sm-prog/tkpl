import type { ReceiptPayload } from '../types/tkpl';
import {
  createRazorpayOrder,
  PaymentRequestError,
  razorpayFailureMessage,
  verifyRazorpayPayment,
  type CreateOrderResponse,
} from './paymentApi';
import { startCheckout } from './razorpay';
import { getReceipt } from './tournamentData';
import { getSupabase } from './supabase';

/** Total capture-confirmation wait: 4 checks, ~3s apart (~9s). */
const CAPTURE_WAIT_ATTEMPTS = 4;
const CAPTURE_WAIT_MS = 3000;

export interface CheckoutParams {
  registration_no: string;
  phone: string;
  date_of_birth: string;
  /** Player name shown in the Razorpay modal (server prefill wins if present). */
  full_name?: string;
}

export type CheckoutResult = { type: 'success'; receipt: ReceiptPayload } | { type: 'cancelled' };

/** Codes worth retrying: the payment exists but is not captured/recorded yet. */
const RETRYABLE_CODES = new Set(['PAYMENT_NOT_CAPTURED', 'DEPENDENCY_UNAVAILABLE']);

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One full "pay the registration fee" run:
 * create order on the server -> open Razorpay Checkout -> verify on the server.
 *
 * Resolves `success` with the verified receipt, or `cancelled` when the player
 * closes the checkout (no money taken, no receipt). Throws a friendly Error for
 * every other failure; retrying simply re-runs the same steps, and the server
 * always returns the same receipt for an already-verified payment.
 */
export async function runRegistrationPayment(params: CheckoutParams): Promise<CheckoutResult> {
  // Step 1 (docs: "Create an Order in Server"). The amount is read server-side.
  const order: CreateOrderResponse = await createRazorpayOrder({
    registration_no: params.registration_no,
    phone: params.phone,
    date_of_birth: params.date_of_birth,
  });

  // Steps 2-4 (docs: handler returns payment/order/signature).
  const outcome = await startCheckout({
    key_id: order.key_id,
    order_id: order.order_id,
    amount_paise: order.amount_paise,
    currency: order.currency,
    name: order.prefill?.name || params.full_name || params.registration_no,
    contact: order.prefill?.contact || params.phone,
    registration_no: params.registration_no,
  });

  if (outcome.type === 'dismissed') return { type: 'cancelled' };
  if (outcome.type === 'failed') {
    throw new Error(razorpayFailureMessage(outcome.code, outcome.description));
  }

  // Steps 5-6 (docs: verify the signature server-side, then confirm `captured`).
  // The handler fires before the capture always lands, so retry briefly while
  // the server reports "not captured yet"; any other error is final.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < CAPTURE_WAIT_ATTEMPTS; attempt += 1) {
    try {
      const verified = await verifyRazorpayPayment({
        razorpay_order_id: outcome.response.razorpay_order_id,
        razorpay_payment_id: outcome.response.razorpay_payment_id,
        razorpay_signature: outcome.response.razorpay_signature,
      });
      return { type: 'success', receipt: verified.receipt };
    } catch (error) {
      lastError = error;
      const code = error instanceof PaymentRequestError ? error.code : '';
      if (!RETRYABLE_CODES.has(code)) break;
      if (attempt < CAPTURE_WAIT_ATTEMPTS - 1) await wait(CAPTURE_WAIT_MS);
    }
  }

  // A retried "Pay" created a new order; the player may have paid an older one.
  // The background reconcile pass would catch this within 10 minutes, but the
  // receipt should not make them wait: look for it now.
  if (order.replaced_order_ids?.length) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const receipt = await getReceipt(
          getSupabase(),
          params.registration_no,
          params.phone,
          params.date_of_birth
        );
        if (receipt) return { type: 'success', receipt };
      } catch {
        // No cloud client (demo mode): fall through to the error below.
      }
      if (attempt === 0) await wait(CAPTURE_WAIT_MS);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('We could not confirm this payment. Please retry.');
}
