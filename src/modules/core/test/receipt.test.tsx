import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiptCard } from '../../payments/components/ReceiptCard';
import { formatInrFromPaise } from '../lib/validation';
import { buildReceiptPayloadForPlayer, playerTicketFileName } from '../lib/receipt';
import type { PaymentRecord, PlayerRecord, ReceiptPayload } from '../types/tkpl';

const receipt: ReceiptPayload = {
  registration_no: 'TKPL-2026-0106',
  full_name: 'N. Kiran Kumar Reddy',
  locality: 'Kadapa RIMS Road',
  role: 'all_rounder',
  photo_url: 'https://signed.example/registrations/abc.jpg',
  amount_paise: 39900,
  currency: 'INR',
  receipt_no: 'TKPL-RCPT-2026-0001',
  paid_at: '2026-10-27T15:10:00.000Z',
  razorpay_payment_id: 'pay_TEST123456789',
  razorpay_handler: 'upi',
  razorpay_mode: 'test',
  status: 'verified',
  submitted_at: '2026-10-27T14:00:00.000Z',
};

describe('ReceiptCard', () => {
  it('shows the receipt number, amount and player identity', () => {
    render(<ReceiptCard receipt={receipt} />);

    expect(screen.getByTestId('receipt-card')).toBeInTheDocument();
    expect(screen.getByText('TKPL-RCPT-2026-0001')).toBeInTheDocument();
    expect(screen.getByText(formatInrFromPaise(39900))).toBeInTheDocument();
    expect(screen.getByText('N. Kiran Kumar Reddy')).toBeInTheDocument();
    expect(screen.getByText('TKPL-2026-0106')).toBeInTheDocument();
    expect(screen.getByText('All-Rounder')).toBeInTheDocument();
    expect(screen.getByText(/pay_TEST123456789/)).toBeInTheDocument();
    expect(screen.getByAltText(/player photograph/i)).toHaveAttribute(
      'src',
      'https://signed.example/registrations/abc.jpg'
    );
    // Verification QR and link are present.
    expect(screen.getByRole('img', { name: /verification qr/i })).toBeInTheDocument();
    expect(screen.getByText(/reg=TKPL-2026-0106/)).toBeInTheDocument();
  });

  it('renders an empty state instead of a receipt when receipt_no is missing', () => {
    render(<ReceiptCard receipt={{ ...receipt, receipt_no: '' }} />);

    expect(screen.queryByTestId('receipt-card')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/no receipt has been issued/i);
  });

  it('renders an empty state when no receipt is passed at all', () => {
    render(<ReceiptCard receipt={null} />);

    expect(screen.queryByTestId('receipt-card')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('falls back to a placeholder when the player has no photo', () => {
    render(<ReceiptCard receipt={{ ...receipt, photo_url: null }} />);

    expect(screen.queryByAltText(/player photograph/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no photo/i)).toBeInTheDocument();
  });

  describe('buildReceiptPayloadForPlayer', () => {
    const dummyPlayer: PlayerRecord = {
      id: 'p-1',
      registration_no: 'TKPL-2026-0373',
      full_name: 'Rayyan Darban',
      phone: '9676558382',
      date_of_birth: '2003-08-10',
      locality: 'Proddatur',
      role: 'bowler',
      batting_hand: 'right_hand',
      bowling_style: 'right_arm_pace',
      experience: '',
      emergency_contact: '',
      photo_url: 'https://example.com/photo.jpg',
      photo_file_name: 'photo.jpg',
      registration_status: 'approved',
      auction_status: 'eligible',
      review_notes: '',
      rules_acknowledged: true,
      marketing_consent: true,
      consent_at: '2026-11-02T18:00:00.000Z',
      created_at: '2026-11-02T18:00:00.000Z',
      updated_at: '2026-11-02T18:00:00.000Z',
    };

    const dummyVerifiedPayment: PaymentRecord = {
      id: 'pay-1',
      player_id: 'p-1',
      registration_no: 'TKPL-2026-0373',
      player_name: 'Rayyan Darban',
      player_phone: '9676558382',
      amount_paise: 39900,
      currency: 'INR',
      method: 'razorpay',
      transaction_ref: 'pay_TvPX4a4N1lU0US',
      receipt_file_name: '',
      status: 'verified',
      verified_by: 'admin-1',
      verifier_name: 'Syed',
      verified_at: '2026-11-02T18:47:00.000Z',
      refund_ref: '',
      notes: '',
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_TvPX4a4N1lU0US',
      receipt_no: 'TKPL-REC-0373',
      paid_at: '2026-11-02T18:47:00.000Z',
      receipt_issued_at: '2026-11-02T18:47:00.000Z',
      razorpay_handler: 'upi',
      razorpay_mode: 'live',
      created_at: '2026-11-02T18:00:00.000Z',
      updated_at: '2026-11-02T18:47:00.000Z',
    };

    it('builds a complete ReceiptPayload when payment is verified', () => {
      const payload = buildReceiptPayloadForPlayer(dummyPlayer, dummyVerifiedPayment);
      expect(payload).not.toBeNull();
      expect(payload?.registration_no).toBe('TKPL-2026-0373');
      expect(payload?.full_name).toBe('Rayyan Darban');
      expect(payload?.receipt_no).toBe('TKPL-REC-0373');
      expect(payload?.status).toBe('verified');
      expect(payload?.amount_paise).toBe(39900);
    });

    it('returns null when payment is not verified', () => {
      const payload = buildReceiptPayloadForPlayer(dummyPlayer, {
        ...dummyVerifiedPayment,
        status: 'pending',
      });
      expect(payload).toBeNull();
    });

    it('generates clean filename for ticket downloads', () => {
      const fileName = playerTicketFileName(dummyPlayer);
      expect(fileName).toBe('TKPL-2026-0373_Rayyan_Darban.png');
    });
  });
});
