import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  CurrencyInr,
  Sparkle,
  LockSimple,
  Receipt,
  Ticket,
  Clock,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { formatInrFromPaise } from '../../core/lib/validation';
import type { SafeStatusLookupResult } from '../../core/types/tkpl';
import { buildPayPrompt } from '../../core/lib/paymentApi';
import { runRegistrationPayment } from '../../core/lib/checkout';
import {
  PaymentBadge,
  RegistrationBadge,
  RoleLabel,
} from '../../core/components/StatusBadge';

interface PrefillLocationState {
  prefillRegNo?: string;
  prefillPhone?: string;
  prefillDob?: string;
}

export const CheckStatusPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as PrefillLocationState | null) ?? null;
  const { settings, lookupStatus, findRegistrationByPhoneDob, getReceipt, isCloudConnected } = useTournament();

  const [registrationNo, setRegistrationNo] = useState(prefill?.prefillRegNo ?? '');
  const [phone, setPhone] = useState(prefill?.prefillPhone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(prefill?.prefillDob ?? '');

  const [lookupResult, setLookupResult] = useState<SafeStatusLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Recovery helper for forgotten registration numbers
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [recoveryPhone, setRecoveryPhone] = useState<string>('');
  const [recoveryDob, setRecoveryDob] = useState<string>('');
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoveryResult, setRecoveryResult] = useState<{ registration_no: string; full_name: string } | null>(null);
  const [recoveryError, setRecoveryError] = useState<string>('');

  // Auto-fill from local pending registration if player just registered and visited this page
  useEffect(() => {
    if (!prefill && !registrationNo) {
      try {
        const raw = localStorage.getItem('tkpl_pending_registration');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.registration_no) setRegistrationNo(parsed.registration_no);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.date_of_birth) setDateOfBirth(parsed.date_of_birth);
        }
      } catch {
        // Storage unavailable or disabled
      }
    } else if (prefill?.prefillPhone && prefill?.prefillDob && !registrationNo) {
      setIsSearching(true);
      setHasSearched(true);
      findRegistrationByPhoneDob(prefill.prefillPhone, prefill.prefillDob)
        .then(async (res) => {
          if (res) {
            setRegistrationNo(res.registration_no);
            const status = await lookupStatus(res.registration_no, prefill.prefillPhone!, prefill.prefillDob!);
            if (status) {
              setLookupResult(status);
            }
          }
        })
        .catch(() => {
          // ignore auto-lookup failure
        })
        .finally(() => {
          setIsSearching(false);
        });
    }
  }, [prefill, registrationNo, findRegistrationByPhoneDob, lookupStatus]);

  // Online payment + receipt actions
  const [isPaying, setIsPaying] = useState(false);
  const [isOpeningReceipt, setIsOpeningReceipt] = useState(false);
  const [payFeedback, setPayFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const feeLabel = formatInrFromPaise(settings.fee_paise);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setPayFeedback(null);
    setHasSearched(true);

    if (!registrationNo.trim() || !phone.trim() || !dateOfBirth.trim()) {
      setLookupResult(null);
      setLookupError(
        'Please enter all three verification details: Registration Number, Mobile Number and Date of Birth.'
      );
      return;
    }

    setIsSearching(true);
    try {
      const res = await lookupStatus(registrationNo, phone, dateOfBirth);
      if (!res) {
        setLookupResult(null);
        // Anti-enumeration message: never reveal whether the phone number alone exists
        setLookupError(
          'No matching registration found for the provided combination of Registration Number, Mobile Number and Date of Birth.'
        );
        return;
      }

      setLookupResult(res);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!lookupResult || isPaying) return;
    setPayFeedback(null);
    setIsPaying(true);
    try {
      const outcome = await runRegistrationPayment({
        registration_no: lookupResult.registration_no,
        phone,
        date_of_birth: dateOfBirth,
        full_name: lookupResult.full_name,
      });
      if (outcome.type === 'success') {
        navigate('/receipt', {
          state: { receipt: outcome.receipt, phone, date_of_birth: dateOfBirth },
        });
        return;
      }
      setPayFeedback({
        type: 'error',
        message: buildPayPrompt(lookupResult.registration_no, feeLabel),
      });
    } catch (err) {
      setPayFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not complete the payment. Please retry.',
      });
    } finally {
      setIsPaying(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!lookupResult || isOpeningReceipt) return;
    setPayFeedback(null);
    setIsOpeningReceipt(true);
    try {
      const receipt = await getReceipt(lookupResult.registration_no, phone, dateOfBirth);
      if (!receipt) {
        setPayFeedback({
          type: 'error',
          message: 'No receipt has been issued for this registration yet.',
        });
        return;
      }
      navigate('/receipt', {
        state: { receipt, phone, date_of_birth: dateOfBirth },
      });
    } catch {
      setPayFeedback({ type: 'error', message: 'Could not open the receipt. Please retry.' });
    } finally {
      setIsOpeningReceipt(false);
    }
  };

  const fillDemoPlayer = (reg: string, ph: string, dob: string) => {
    setRegistrationNo(reg);
    setPhone(ph);
    setDateOfBirth(dob);
    setLookupError('');
    setLookupResult(null);
    setPayFeedback(null);
  };

  const handleRecoverRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryResult(null);

    if (!recoveryPhone.trim() || !recoveryDob.trim()) {
      setRecoveryError('Please enter both your mobile number and date of birth.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await findRegistrationByPhoneDob(recoveryPhone, recoveryDob);
      if (!res) {
        setRecoveryError('No registration found matching this mobile number and date of birth.');
        return;
      }
      setRecoveryResult(res);
      setRegistrationNo(res.registration_no);
      setPhone(recoveryPhone);
      setDateOfBirth(recoveryDob);
    } catch {
      setRecoveryError('Could not recover registration number right now. Please retry.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Ticket size={24} weight="duotone" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Player Ticket & Entry Locker
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
            Find My Ticket & Registration
          </h1>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            Enter your registration details below to download your official T-KPL tournament entry pass or check your entry status.
          </p>

          {/* Quick Demo Fill Bar for Testing (Only shown in offline demo mode) */}
          {!isCloudConnected && (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3.5 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                  <Sparkle size={14} weight="fill" />
                  <span>Quick Test Profiles:</span>
                </span>
                <button
                  type="button"
                  onClick={() => fillDemoPlayer('TKPL-2026-0101', '9848011223', '1999-04-14')}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-300 transition"
                >
                  Syed Irfan (Approved & Confirmed Entry)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoPlayer('TKPL-2026-0105', '7989234561', '1998-07-30')}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-200 hover:border-amber-500/50 hover:text-amber-300 transition"
                >
                  P. Harish Kumar (Payment Pending)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoPlayer('TKPL-2026-0104', '8897633445', '2000-01-19')}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-200 hover:border-orange-500/50 hover:text-orange-300 transition"
                >
                  G. Sai Charan (Needs Photo Correction)
                </button>
              </div>
            </div>
          )}

          {/* Forgot Registration Number Helper */}
          {showForgotModal && (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-sm text-zinc-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <MagnifyingGlass size={18} weight="bold" />
                <span>Recover Your Registration Number</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Enter the mobile number and date of birth you registered with, and we will find your Registration Number.
              </p>

              <form onSubmit={handleRecoverRegistration} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="tel"
                  required
                  placeholder="Registered Mobile"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="date"
                  required
                  value={recoveryDob}
                  onChange={(e) => setRecoveryDob(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  {recoveryLoading ? 'Searching...' : 'Find My Number'}
                </button>
              </form>

              {recoveryError && (
                <p className="mt-2 text-xs text-rose-400 font-medium">{recoveryError}</p>
              )}

              {recoveryResult && (
                <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Found registration for <strong>{recoveryResult.full_name}</strong>:{' '}
                    <code className="font-mono font-bold text-white bg-black/40 px-1.5 py-0.5 rounded">
                      {recoveryResult.registration_no}
                    </code>{' '}
                    (Auto-filled below)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="text-emerald-300 underline font-semibold hover:text-white"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLookup} noValidate className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="lookup_reg_no" className="text-sm font-semibold text-zinc-200">
                    Registration Number <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal((prev) => !prev);
                      setRecoveryError('');
                      setRecoveryResult(null);
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    {showForgotModal ? 'Close helper' : 'Forgot ID?'}
                  </button>
                </div>
                <input
                  id="lookup_reg_no"
                  type="text"
                  required
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  placeholder="TKPL-2026-0101"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="lookup_phone" className="text-sm font-semibold text-zinc-200">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <input
                  id="lookup_phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="lookup_dob" className="text-sm font-semibold text-zinc-200">
                  Date of Birth <span className="text-rose-400">*</span>
                </label>
                <input
                  id="lookup_dob"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75"
            >
              {isSearching ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-zinc-950"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span>Searching Ticket...</span>
                </>
              ) : (
                <>
                  <Ticket size={18} weight="bold" />
                  <span>Find My Ticket & Registration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lookup Error */}
        {hasSearched && lookupError && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-5 text-rose-200"
          >
            <WarningCircle size={22} className="mt-0.5 shrink-0 text-rose-400" />
            <p className="text-sm">{lookupError}</p>
          </div>
        )}

        {/* Lookup Result Card */}
        {lookupResult && (
          <div className="mt-6 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
              <div className="flex items-start gap-4">
                {lookupResult.photo_url && (
                  <img
                    src={lookupResult.photo_url}
                    alt={`${lookupResult.full_name} photograph`}
                    crossOrigin="anonymous"
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-emerald-500/40 shrink-0 bg-zinc-950"
                  />
                )}
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {lookupResult.registration_no}
                  </span>
                  <h2 className="mt-1 text-2xl font-bold text-zinc-50">
                    {lookupResult.full_name}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {lookupResult.locality} · <RoleLabel role={lookupResult.role} />
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <span>Submitted on</span>
                <p className="font-medium text-zinc-200">
                  {new Date(lookupResult.submitted_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  })}
                </p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <span className="block text-xs font-medium text-zinc-400 mb-2">
                Registration & Entry Status
              </span>
              {lookupResult.payment_status === 'verified' ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle size={15} weight="fill" className="text-emerald-400" />
                  <span>Confirmed · Official Tournament Entry Ready</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
                  <Clock size={15} weight="fill" className="text-amber-400" />
                  <span>Awaiting Online Fee Payment</span>
                </div>
              )}
            </div>

            {/* Organizer Review Notes if any */}
            {lookupResult.review_notes && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Organizer Review Note
                </span>
                <p className="mt-1 text-sm text-zinc-200">{lookupResult.review_notes}</p>
              </div>
            )}

            {/* Payment + receipt actions by payment status */}
            {lookupResult.payment_status === 'verified' ? (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Ticket size={20} weight="bold" />
                  <h3 className="text-base font-bold text-zinc-100">
                    Tournament Entry Confirmed · Official Ticket Ready
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Your {feeLabel} registration fee was verified by Razorpay. Your entry into the tournament is confirmed! Download your official player ticket below as a PNG image or print to save as PDF.
                </p>
                <button
                  type="button"
                  onClick={handleViewReceipt}
                  disabled={isOpeningReceipt}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60 active:scale-[0.98]"
                >
                  <Ticket size={16} weight="bold" />
                  <span>{isOpeningReceipt ? 'Opening ticket…' : 'View / Download Official Ticket'}</span>
                </button>
              </div>
            ) : lookupResult.payment_status === 'refunded' ? (
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 text-sm text-purple-200">
                This registration fee has been refunded. Contact {settings.contact_text} if you
                think this is a mistake.
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-zinc-950 p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <CurrencyInr size={20} weight="bold" />
                  <h3 className="text-base font-bold text-zinc-100">
                    Payment not completed ({feeLabel})
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {buildPayPrompt(lookupResult.registration_no, feeLabel)} Pay online with UPI (PhonePe, Google Pay,
                  Paytm) — your receipt is issued immediately after verification.
                </p>
                <button
                  type="button"
                  onClick={handleCompletePayment}
                  disabled={isPaying}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60 active:scale-[0.98]"
                >
                  <LockSimple size={15} weight="bold" />
                  <span>{isPaying ? 'Opening secure checkout…' : `Complete Payment · ${feeLabel}`}</span>
                </button>
              </div>
            )}

            {payFeedback && (
              <div
                role="alert"
                className={payFeedback.type === 'success'
                  ? 'flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300'
                  : 'flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300'}
              >
                {payFeedback.type === 'success' ? (
                  <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                ) : (
                  <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                )}
                <span>{payFeedback.message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
