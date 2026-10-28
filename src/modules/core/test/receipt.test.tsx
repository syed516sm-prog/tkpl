import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiptCard } from '../../payments/components/ReceiptCard';
import { formatInrFromPaise } from '../lib/validation';
import type { ReceiptPayload } from '../types/tkpl';

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
});
