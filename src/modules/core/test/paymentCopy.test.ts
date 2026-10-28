import { describe, it, expect } from 'vitest';
import {
  buildPayPrompt,
  friendlyPaymentError,
  nextPaymentAction,
  razorpayFailureMessage,
} from '../lib/paymentApi';
import { startCheckout } from '../lib/razorpay';

describe('player-facing payment copy', () => {
  it('names the registration and the fee in the pay prompt', () => {
    expect(buildPayPrompt('TKPL-2026-0106', '₹399')).toBe(
      'Your registration is saved as TKPL-2026-0106. Complete the ₹399 payment to confirm your slot.'
    );
  });

  it('gives specific advice for known Razorpay failure reasons', () => {
    expect(razorpayFailureMessage('payment_timed_out', 'Payment timed out')).toMatch(
      /timed out/i
    );
    expect(razorpayFailureMessage('insufficient_funds', '')).toMatch(/enough balance/i);
    // Every failure still tells the player their registration survived.
    expect(razorpayFailureMessage('some_new_code', 'Something odd')).toMatch(
      /registration is saved/i
    );
  });

  it('maps server error codes to actionable copy', () => {
    expect(friendlyPaymentError('ALREADY_PAID')).toMatch(/already paid/i);
    expect(friendlyPaymentError('PAYMENT_NOT_CAPTURED')).toMatch(/slot is held/i);
    expect(friendlyPaymentError('AMOUNT_MISMATCH')).toMatch(/₹399/);
    expect(friendlyPaymentError(undefined, 'fallback text')).toBe('fallback text');
  });

  it('chooses the right next action for every payment state', () => {
    expect(nextPaymentAction('verified')).toBe('receipt');
    expect(nextPaymentAction('refunded')).toBe('blocked');
    expect(nextPaymentAction('pending')).toBe('pay');
    expect(nextPaymentAction('submitted')).toBe('pay');
    expect(nextPaymentAction('failed')).toBe('pay');
  });

  it('configures Razorpay checkout for UPI only (no cards, netbanking or wallets)', async () => {
    let capturedOptions: any = null;
    (window as any).Razorpay = class {
      constructor(options: any) {
        capturedOptions = options;
      }
      open() {}
      close() {}
      on() {}
    };

    const promise = startCheckout({
      key_id: 'rzp_test_123',
      order_id: 'order_123',
      amount_paise: 39900,
      currency: 'INR',
      name: 'Test Player',
      contact: '9885012345',
      registration_no: 'TKPL-2026-0001',
    });

    await Promise.resolve();

    expect(capturedOptions.method).toEqual({
      upi: true,
      card: false,
      netbanking: false,
      wallet: false,
      emi: false,
      paylater: false,
    });

    // Dismiss modal to cleanly resolve promise
    capturedOptions.modal.ondismiss();
    const outcome = await promise;
    expect(outcome.type).toBe('dismissed');
  });
});
