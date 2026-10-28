import type { PlayingRole, ReceiptPayload } from '../types/tkpl';
import { formatInrFromPaise } from './validation';

export const RECEIPT_CANVAS_WIDTH = 1080;
export const RECEIPT_CANVAS_HEIGHT = 1350;

const ROLE_LABELS: Record<PlayingRole, string> = {
  batter: 'Batter',
  bowler: 'Bowler',
  all_rounder: 'All-Rounder',
  wicketkeeper: 'Wicketkeeper',
};

export function roleLabel(role: PlayingRole | string | null | undefined): string {
  if (!role) return '—';
  return ROLE_LABELS[role as PlayingRole] ?? String(role).replace(/_/g, ' ');
}

/** 25 Oct 2026, 9:10 pm (Asia/Kolkata). Deterministic given the same input. */
export function formatIstDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function formatReceiptAmount(receipt: Pick<ReceiptPayload, 'amount_paise'>): string {
  return formatInrFromPaise(receipt.amount_paise);
}

export function receiptDate(paidAt: string | null | undefined, fallback: string | null | undefined): string {
  return formatIstDateTime(paidAt ?? fallback);
}

/** `1234567890` -> `98******23` for printed receipts. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

/**
 * The on-card verification link. Kept short so the QR stays small; it opens
 * the receipt page, which still requires Registration No + Phone + DOB.
 */
export function receiptVerifyPath(receipt: Pick<ReceiptPayload, 'registration_no' | 'receipt_no'>): string {
  const params = new URLSearchParams({
    reg: receipt.registration_no,
    r: receipt.receipt_no,
  });
  return `/receipt?${params.toString()}`;
}

export function receiptVerifyUrl(
  receipt: Pick<ReceiptPayload, 'registration_no' | 'receipt_no'>,
  origin: string
): string {
  return `${origin.replace(/\/$/, '')}${receiptVerifyPath(receipt)}`;
}

/** A receipt can only be shown when it has been issued (a receipt number). */
export function isReceiptComplete(
  receipt: ReceiptPayload | null | undefined
): receipt is ReceiptPayload {
  return Boolean(receipt && receipt.receipt_no && receipt.receipt_no.trim().length > 0);
}

export function receiptFileName(receipt: Pick<ReceiptPayload, 'registration_no'>): string {
  const safe = receipt.registration_no.replace(/[^A-Za-z0-9-]/g, '') || 'TKPL';
  return `${safe}-Receipt.png`;
}
