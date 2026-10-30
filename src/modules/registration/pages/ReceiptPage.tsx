import React, { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Copy,
  Check,
  DownloadSimple,
  LockSimple,
  Printer,
  WarningCircle,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import type { ReceiptPayload } from '../../core/types/tkpl';
import { isReceiptComplete, receiptFileName } from '../../core/lib/receipt';
import { downloadReceiptPng } from '../../core/lib/receiptCanvas';
import { ReceiptCard } from '../../payments/components/ReceiptCard';
import { InstagramFollowSection } from '../../core/components/InstagramFollowSection';

interface ReceiptLocationState {
  receipt?: ReceiptPayload;
  phone?: string;
  date_of_birth?: string;
}

export const ReceiptPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, getReceipt } = useTournament();

  const state = (location.state as ReceiptLocationState | null) ?? null;

  const [receipt, setReceipt] = useState<ReceiptPayload | null>(
    isReceiptComplete(state?.receipt) ? state!.receipt! : null
  );
  const [registrationNo, setRegistrationNo] = useState(
    state?.receipt?.registration_no ?? searchParams.get('reg') ?? ''
  );
  const [phone, setPhone] = useState(state?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(state?.date_of_birth ?? '');
  const [lookupError, setLookupError] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (!registrationNo.trim() || !phone.trim() || !dateOfBirth.trim()) {
      setLookupError(
        'Enter all three details together: Registration Number, Mobile Number and Date of Birth.'
      );
      return;
    }
    setIsLooking(true);
    try {
      const found = await getReceipt(registrationNo, phone, dateOfBirth);
      if (!found) {
        // Never reveal whether one of the three values alone is correct.
        setLookupError(
          'No receipt found for this combination. A receipt exists only after a verified payment, and all three details must match.'
        );
        setReceipt(null);
        return;
      }
      setReceipt(found);
      navigate(`/receipt?reg=${encodeURIComponent(found.registration_no)}`, {
        replace: true,
        state: { receipt: found, phone, date_of_birth: dateOfBirth },
      });
    } catch {
      setLookupError('Could not reach the server. Check your connection and retry.');
    } finally {
      setIsLooking(false);
    }
  };

  const handleCopy = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.receipt_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked — the number is still on screen.
    }
  };

  const handleDownload = useCallback(async () => {
    if (!receipt) return;
    setIsDownloading(true);
    try {
      await downloadReceiptPng(receipt, {
        fileName: receiptFileName(receipt),
        organizerLine: settings.organizer_line,
        partnerLine: settings.partner_line,
      });
    } finally {
      setIsDownloading(false);
    }
  }, [receipt, settings.organizer_line, settings.partner_line]);

  return (
    <div className="receipt-print-root min-h-[calc(100dvh-4rem)] bg-brand-ink py-10 sm:py-14">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="no-print">
          <div className="flex items-center gap-2.5 text-brand-lime">
            <CheckCircle size={24} weight="fill" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase">
              Official payment receipt
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            {receipt ? 'Your TKPL registration receipt' : 'Find your receipt'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            {receipt
              ? 'Payment verified by Razorpay. Download the PNG or print / save as PDF — this receipt is your proof of entry.'
              : 'If your payment went through, unlock the receipt with the same three details you used at registration.'}
          </p>
        </div>

        {!receipt && (
          <form
            onSubmit={handleUnlock}
            noValidate
            className="no-print mt-6 space-y-4 rounded-2xl border border-brand-line bg-brand-surface/70 p-6"
          >
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-line bg-brand-ink/60 p-3.5 text-xs text-brand-muted">
              <LockSimple size={16} className="mt-0.5 shrink-0 text-brand-lime" />
              <span>
                Receipts are private. The same anti-lookup rule as Check Status applies: all three
                details must match a verified payment.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="receipt_reg_no" className="text-xs font-semibold text-zinc-200">
                  Registration Number
                </label>
                <input
                  id="receipt_reg_no"
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  placeholder="TKPL-2026-0106"
                  autoComplete="off"
                  className="rounded-xl border border-brand-line bg-brand-ink px-3 py-2.5 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-brand-lime/60 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="receipt_phone" className="text-xs font-semibold text-zinc-200">
                  Mobile Number
                </label>
                <input
                  id="receipt_phone"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  autoComplete="tel"
                  className="rounded-xl border border-brand-line bg-brand-ink px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-brand-lime/60 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="receipt_dob" className="text-xs font-semibold text-zinc-200">
                  Date of Birth
                </label>
                <input
                  id="receipt_dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="rounded-xl border border-brand-line bg-brand-ink px-3 py-2.5 text-sm text-zinc-100 focus:border-brand-lime/60 focus:outline-none"
                />
              </div>
            </div>

            {lookupError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200"
              >
                <WarningCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                <span>{lookupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLooking}
              className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-5 py-2.5 text-sm font-black tracking-wide text-brand-ink uppercase transition hover:brightness-110 disabled:opacity-60"
            >
              <LockSimple size={16} weight="bold" />
              <span>{isLooking ? 'Checking…' : 'Unlock Receipt'}</span>
            </button>
          </form>
        )}

        {receipt && (
          <>
            <div className="receipt-print-area mt-6">
              <ReceiptCard
                receipt={receipt}
                organizerLine={settings.organizer_line}
                partnerLine={settings.partner_line}
                tournamentName={settings.tournament_name}
                season={settings.season}
              />
            </div>

            <div className="no-print mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-5 py-3 text-sm font-black tracking-wide text-brand-ink uppercase transition hover:brightness-110 disabled:opacity-60"
              >
                <DownloadSimple size={17} weight="bold" />
                <span>{isDownloading ? 'Preparing PNG…' : 'Download Receipt (PNG)'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-brand-line px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-brand-lime/50"
              >
                <Printer size={17} weight="bold" />
                <span>Print / Save as PDF</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-full border border-brand-line px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-brand-lime/50"
              >
                {copied ? (
                  <Check size={17} weight="bold" className="text-brand-lime" />
                ) : (
                  <Copy size={17} />
                )}
                <span>{copied ? 'Receipt No copied' : 'Copy Receipt No'}</span>
              </button>
            </div>

            {/* Official Instagram Channels for Players */}
            <div className="no-print mt-6">
              <InstagramFollowSection />
            </div>

            <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                to="/find-ticket"
                state={{
                  prefillRegNo: receipt.registration_no,
                  prefillPhone: phone,
                  prefillDob: dateOfBirth,
                }}
                className="font-semibold text-brand-lime hover:brightness-110"
              >
                Track approval & auction status →
              </Link>
              <Link to="/" className="text-brand-muted transition hover:text-white">
                Return to TKPL home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
