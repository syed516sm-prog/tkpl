import React from 'react';
import type { ReceiptPayload } from '../../core/types/tkpl';
import {
  formatReceiptAmount,
  isReceiptComplete,
  receiptDate,
  receiptVerifyUrl,
  roleLabel,
} from '../../core/lib/receipt';
import { BRAND_MARK_SRC } from '../../core/components/BrandLogo';
import { ReceiptQr } from './ReceiptQr';

interface ReceiptCardProps {
  receipt: ReceiptPayload | null | undefined;
  organizerLine?: string;
  partnerLine?: string;
  tournamentName?: string;
  season?: string;
  className?: string;
}

/**
 * The on-screen receipt (logical 1080x1350, scaled with CSS). The PNG download
 * is drawn separately in canvas — this DOM card is what `window.print()` uses.
 */
export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  organizerLine = 'SULTAN SPORTS (KADAPA) · 9110744945',
  partnerLine = 'NR SPORTS (VEMPALLI) · 8919155512',
  tournamentName = 'Tennis Ball Kadapa Premier League',
  season,
  className = '',
}) => {
  if (!isReceiptComplete(receipt)) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-200"
      >
        No receipt has been issued yet. A receipt number is created only after the
        registration fee is successfully paid.
      </div>
    );
  }

  const verifyUrl = receiptVerifyUrl(
    receipt,
    typeof window !== 'undefined' ? window.location.origin : 'https://tkpl.in'
  );
  const paidOn = receiptDate(receipt.paid_at, receipt.submitted_at);

  return (
    <article
      data-testid="receipt-card"
      aria-label={`TKPL receipt ${receipt.receipt_no}`}
      className={`receipt-card relative w-full overflow-hidden rounded-[28px] border border-brand-line bg-brand-ink text-zinc-100 shadow-2xl ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_15%_-10%,rgba(182,255,46,0.20),transparent_60%),radial-gradient(ellipse_40%_35%_at_100%_0%,rgba(255,210,30,0.14),transparent_60%)]"
      />

      <div className="relative p-6 sm:p-8">
        <header className="flex items-start justify-between gap-4 border-b border-brand-line pb-5">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_MARK_SRC}
              alt=""
              aria-hidden="true"
              className="h-12 w-12 rounded-xl object-contain sm:h-14 sm:w-14"
            />
            <div>
              <p className="font-display text-lg font-black tracking-[0.18em] text-brand-lime uppercase sm:text-xl">
                T-KPL
              </p>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
                {tournamentName}
              </p>
              <p className="text-[10px] tracking-[0.18em] text-brand-muted uppercase">
                Official player registration receipt
              </p>
            </div>
          </div>
          <span className="rotate-[-6deg] rounded-xl border-2 border-brand-lime/70 px-3 py-1.5 font-display text-lg font-black tracking-wider text-brand-lime sm:text-xl">
            PAID
          </span>
        </header>

        <section className="mt-6 flex items-start gap-4 sm:gap-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-brand-lime/50 bg-brand-surface-2 sm:h-32 sm:w-32">
            {receipt.photo_url ? (
              <img
                src={receipt.photo_url}
                alt={`${receipt.full_name} player photograph`}
                crossOrigin="anonymous"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold tracking-wider text-brand-muted uppercase">
                No photo
              </div>
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-brand-lime/40 px-2 py-0.5 text-[10px] font-black tracking-[0.14em] text-brand-lime uppercase">
              {roleLabel(receipt.role)}
            </span>
            <h2 className="mt-1 font-display text-xl leading-tight font-black break-words text-white uppercase sm:text-2xl">
              {receipt.full_name}
            </h2>
            <p className="mt-1 text-xs text-brand-muted">{receipt.locality}</p>
            <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-brand-muted uppercase">
              Registration No
            </p>
            <p className="font-mono text-base font-bold text-brand-yellow sm:text-lg">
              {receipt.registration_no}
            </p>
          </div>
        </section>

        <section className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-brand-line bg-brand-surface px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-brand-muted uppercase">
              Registration fee paid
            </p>
            <p className="font-display text-3xl font-black text-brand-lime sm:text-4xl">
              {formatReceiptAmount(receipt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-brand-muted uppercase">
              Payment date (IST)
            </p>
            <p className="text-sm font-semibold text-white">{paidOn}</p>
            <p className="font-mono text-[11px] text-brand-muted">
              {receipt.razorpay_payment_id ? `RZP ${receipt.razorpay_payment_id}` : 'PAID ONLINE'}
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-brand-lime/40 bg-brand-lime/10 px-5 py-4">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-brand-lime uppercase">
            Receipt number
          </p>
          <p className="font-mono text-xl font-black tracking-tight text-white sm:text-2xl">
            {receipt.receipt_no}
          </p>
        </section>

        <footer className="mt-5 flex items-center gap-4 border-t border-brand-line pt-4">
          <ReceiptQr value={verifyUrl} size={88} />
          <div className="min-w-0 text-[11px] leading-relaxed text-brand-muted">
            <p className="font-semibold text-white">Scan to verify this receipt</p>
            <p>Needs Registration No + Mobile No + Date of Birth.</p>
            <p className="truncate font-mono text-brand-lime">
              {verifyUrl.replace(/^https?:\/\//, '')}
            </p>
          </div>
        </footer>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-brand-line pt-3 text-[10px] text-brand-muted">
          <span>{organizerLine}</span>
          <span>{partnerLine}</span>
        </div>
        <p className="mt-1 text-[10px] text-brand-muted">
          {season ? `${season} · ` : ''}Paid online securely via Razorpay. Keep this receipt for your records.
        </p>
      </div>
    </article>
  );
};
