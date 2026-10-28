/**
 * Razorpay Checkout loader + promise wrapper.
 *
 * The checkout script is injected lazily on the first click, so the landing and
 * registration pages never pay for it. No npm dependency is needed.
 */

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Maximum duration to keep the payment window active before timing out safely (8 minutes). */
export const TRANSACTION_TIMEOUT_MS = 8 * 60 * 1000;

export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    metadata?: { order_id?: string; payment_id?: string };
  };
}

export interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  method?: {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
    wallet?: boolean;
    emi?: boolean;
    paylater?: boolean;
  };
  /** Retry confirmation after a verified-looking success; skips a second capture. */
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean };
}

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Inject checkout.js exactly once; later calls reuse the same promise. */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay Checkout is only available in the browser.'));
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`
    );
    const script = existing ?? document.createElement('script');
    const onLoad = () => {
      if (window.Razorpay) resolve();
      else reject(new Error('Razorpay Checkout loaded but did not initialise.'));
    };
    const onError = () => {
      scriptPromise = null;
      reject(new Error('Could not load Razorpay Checkout. Check your connection and retry.'));
    };
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return scriptPromise;
}

export type CheckoutOutcome =
  | { type: 'success'; response: RazorpaySuccessResponse }
  | { type: 'dismissed' }
  | { type: 'failed'; code: string; description: string };

export interface StartCheckoutParams {
  key_id: string;
  order_id: string;
  amount_paise: number;
  currency: string;
  name: string;
  contact?: string;
  registration_no: string;
}

/**
 * Opens Razorpay Checkout and resolves once the modal closes:
 * - `success` with order/payment/signature (still must be verified server-side)
 * - `failed` with Razorpay's error code
 * - `dismissed` when the player closes the modal (money state unknown, no receipt)
 */
export async function startCheckout(
  params: StartCheckoutParams
): Promise<CheckoutOutcome> {
  await loadRazorpayScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error('Razorpay Checkout is not available in this browser.');
  }

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };

    const checkout = new Razorpay({
      key: params.key_id,
      order_id: params.order_id,
      amount: params.amount_paise,
      currency: params.currency,
      name: 'T-KPL · Kadapa Premier League',
      description: `Player registration fee · ${params.registration_no}`,
      prefill: {
        name: params.name,
        contact: params.contact,
      },
      notes: { registration_no: params.registration_no },
      theme: { color: '#10b981' },
      method: {
        upi: true,
        card: false,
        netbanking: false,
        wallet: false,
        emi: false,
        paylater: false,
      },
      handler: (response) => settle({ type: 'success', response }),
      modal: {
        confirm_close: true,
        ondismiss: () => settle({ type: 'dismissed' }),
      },
    });

    checkout.on('payment.failed', (payload) => {
      const failure = payload as RazorpayFailureResponse;
      settle({
        type: 'failed',
        code: failure.error?.code ?? 'PAYMENT_FAILED',
        description:
          failure.error?.description ??
          failure.error?.reason ??
          'The payment did not go through.',
      });
    });

    timer = setTimeout(() => {
      try {
        checkout.close();
      } catch {
        // Safe fallback if the modal was already closed
      }
      settle({
        type: 'failed',
        code: 'payment_timed_out',
        description: 'The payment window timed out.',
      });
    }, TRANSACTION_TIMEOUT_MS);

    checkout.open();
  });
}
