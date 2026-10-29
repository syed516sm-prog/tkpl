import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle,
  WarningCircle,
  CalendarBlank,
  UploadSimple,
  ShieldCheck,
  LockSimple,
  Copy,
  Check,
  SealCheck,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import {
  formatInrFromPaise,
  validatePhotoFile,
  validateRegistrationForm,
} from '../../core/lib/validation';
import type { BattingHand, BowlingStyle, PlayingRole, RegistrationFormInput } from '../../core/types/tkpl';
import { buildPayPrompt, fetchPaymentGatewayHealth } from '../../core/lib/paymentApi';
import { runRegistrationPayment } from '../../core/lib/checkout';
import type { RegistrationSubmitResponse } from '../../core/context/TournamentContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, submitRegistration } = useTournament();

  const [idempotencyKey] = useState<string>(
    () => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const [form, setForm] = useState<RegistrationFormInput>({
    full_name: '',
    phone: '',
    date_of_birth: '',
    locality: '',
    role: 'all_rounder',
    batting_hand: 'right_hand',
    bowling_style: 'right_arm_pace',
    experience: '',
    emergency_contact: '',
    photo_data_url: '',
    photo_file_name: '',
    rules_acknowledged: false,
    marketing_consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // The saved registration that is waiting for payment.
  const [savedRegistration, setSavedRegistration] = useState<RegistrationSubmitResponse | null>(null);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [payError, setPayError] = useState<string>('');
  const [copiedRegNo, setCopiedRegNo] = useState<boolean>(false);
  const [gatewayAvailable, setGatewayAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPaymentGatewayHealth().then((health) => {
      if (!cancelled) setGatewayAvailable(health.configured);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const feeLabel = formatInrFromPaise(settings.fee_paise);
  const isDeadlinePassed = new Date().getTime() > new Date(settings.deadline).getTime();
  const isRegistrationBlocked = !settings.registration_open || isDeadlinePassed;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validatePhotoFile(file);
    if (!check.valid) {
      setErrors((prev) => ({ ...prev, photo: check.error || 'Invalid photograph.' }));
      setForm((prev) => ({ ...prev, photo_data_url: '', photo_file_name: '' }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        photo_data_url: typeof reader.result === 'string' ? reader.result : 'data:image/jpeg;base64,valid',
        photo_file_name: file.name,
      }));
    };
    reader.onerror = () => {
      setErrors((prev) => ({ ...prev, photo: 'Could not read image file. Please try another photo.' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    const validationErrors = validateRegistrationForm(form, settings);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await submitRegistration(form, idempotencyKey);
      // Stay on this page: the pay step opens next, under the saved form.
      setSavedRegistration(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to submit registration right now. Your entered details have been kept safe; please retry.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!savedRegistration || isPaying) return;
    setPayError('');
    setIsPaying(true);
    try {
      const result = await runRegistrationPayment({
        registration_no: savedRegistration.registration_no,
        phone: form.phone,
        date_of_birth: form.date_of_birth,
        full_name: savedRegistration.full_name,
      });
      if (result.type === 'success') {
        navigate('/receipt', {
          state: {
            receipt: result.receipt,
            phone: form.phone,
            date_of_birth: form.date_of_birth,
          },
        });
      }
    } catch (err) {
      setPayError(
        err instanceof Error
          ? err.message
          : 'We could not confirm this payment. Retry or contact the organizers.'
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleCopyRegNo = async () => {
    if (!savedRegistration) return;
    try {
      await navigator.clipboard.writeText(savedRegistration.registration_no);
      setCopiedRegNo(true);
      setTimeout(() => setCopiedRegNo(false), 2200);
    } catch {
      // Clipboard blocked — the number is on screen.
    }
  };

  if (savedRegistration) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-brand-ink py-10 sm:py-14">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-3xl border border-brand-lime/30 bg-brand-surface/70 p-6 sm:p-10">
            <div className="flex items-center gap-3 text-brand-lime">
              <SealCheck size={30} weight="fill" />
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase">
                  Registration saved
                </p>
                <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
                  One step left, {savedRegistration.full_name}
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-brand-muted">
              {buildPayPrompt(savedRegistration.registration_no, feeLabel)} Your receipt number is
              created the moment Razorpay confirms the payment.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-line bg-brand-ink p-5">
              <div>
                <span className="text-[10px] font-semibold tracking-[0.16em] text-brand-muted uppercase">
                  Registration number
                </span>
                <p className="font-mono text-xl font-black text-brand-yellow sm:text-2xl">
                  {savedRegistration.registration_no}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyRegNo}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-line px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-brand-lime/50"
              >
                {copiedRegNo ? (
                  <Check size={14} weight="bold" className="text-brand-lime" />
                ) : (
                  <Copy size={14} />
                )}
                <span>{copiedRegNo ? 'Copied' : 'Copy number'}</span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-brand-line bg-brand-ink/60 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-brand-muted">Registration fee</span>
                <span className="font-display text-2xl font-black text-white">{feeLabel}</span>
              </div>
              <p className="mt-1 text-xs text-brand-muted">
                Secure online payment · UPI (PhonePe, Google Pay, Paytm) via Razorpay.
              </p>
            </div>

            {payError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200"
              >
                <WarningCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
                <span>{payError}</span>
              </div>
            )}

            {gatewayAvailable === false && (
              <div
                role="status"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-950/20 p-4 text-xs text-amber-200"
              >
                <LockSimple size={16} className="mt-0.5 shrink-0 text-amber-400" />
                <span>
                  Online payment is not switched on for this deployment yet. Your registration is
                  saved — contact {settings.contact_text} with your Registration Number to pay.
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-lime px-6 py-3.5 text-sm font-black tracking-wide text-brand-ink uppercase shadow-[0_16px_40px_-16px_rgba(182,255,46,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                <LockSimple size={17} weight="bold" />
                <span>
                  {isPaying ? 'Opening secure checkout…' : `Pay Securely with Razorpay · ${feeLabel}`}
                </span>
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
                <ShieldCheck size={15} className="text-brand-lime" />
                <span>Payment verified by signature · receipt issued instantly</span>
              </span>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-brand-muted">
              Closed the checkout by mistake? Your registration is safe — press Pay again, or use
              <strong className="text-zinc-200"> Check Status </strong>
              with your Registration Number, Mobile Number and Date of Birth to complete the payment
              later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {settings.season}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
                Player Registration Form
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-right">
                <span className="block text-[11px] font-medium text-emerald-300">
                  Registration Fee
                </span>
                <span className="text-lg font-bold text-zinc-50">
                  {formatInrFromPaise(settings.fee_paise)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank size={15} className="text-amber-400" />
              <span>
                Deadline:{' '}
                <strong className="text-zinc-100">
                  {new Date(settings.deadline).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Kolkata',
                  })}
                </strong>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockSimple size={15} className="text-emerald-400" />
              <span>
                Pay online securely · <strong className="text-zinc-100">UPI (PhonePe, GPay, Paytm)</strong>
              </span>
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            By registering you agree to our{' '}
            <Link to="/policies/terms" className="underline hover:text-brand-lime">Terms</Link>,{' '}
            <Link to="/policies/refund" className="underline hover:text-brand-lime">Refund Policy</Link> and{' '}
            <Link to="/policies/privacy" className="underline hover:text-brand-lime">Privacy Policy</Link>.
          </p>
        </div>

        {/* Closed / Deadline Alert */}
        {isRegistrationBlocked && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-5 text-rose-200"
          >
            <WarningCircle size={24} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <h2 className="text-base font-bold text-rose-100">
                Registrations Are Currently Closed
              </h2>
              <p className="mt-1 text-sm text-rose-200/90">
                {!settings.registration_open
                  ? 'The tournament organizers have paused new player registrations.'
                  : 'The official registration deadline for this season has passed.'}{' '}
                For assistance, contact {settings.contact_text}.
              </p>
            </div>
          </div>
        )}

        {/* Top-level Submission Error */}
        {(submitError || errors.form) && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/50 p-5 text-rose-200"
          >
            <WarningCircle size={22} className="mt-0.5 shrink-0 text-rose-400" />
            <div className="text-sm font-medium">{submitError || errors.form}</div>
          </div>
        )}

        {/* Registration Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8"
        >
          {/* Section 1: Player Identity & Locality */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2">
              1. Player Identity & Contact
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Full Name */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="full_name" className="text-sm font-semibold text-zinc-200">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Enter full name for the auction roster"
                />
                <span className="text-xs text-zinc-400">
                  Use the exact name you want printed on team sheets and auction cards.
                </span>
                {errors.full_name && (
                  <p role="alert" className="text-xs font-medium text-rose-400">
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-sm font-semibold text-zinc-200">
                  WhatsApp / Mobile Number <span className="text-rose-400">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="10-digit mobile number"
                />
                <span className="text-xs text-zinc-400">
                  Used for status lookup and official organizer updates.
                </span>
                {errors.phone && (
                  <p role="alert" className="text-xs font-medium text-rose-400">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-2">
                <label htmlFor="date_of_birth" className="text-sm font-semibold text-zinc-200">
                  Date of Birth <span className="text-rose-400">*</span>
                </label>
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  required
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <span className="text-xs text-zinc-400">
                  Required for player identity verification and official player pass.
                </span>
                {errors.date_of_birth && (
                  <p role="alert" className="text-xs font-medium text-rose-400">
                    {errors.date_of_birth}
                  </p>
                )}
              </div>

              {/* Locality / Town */}
              <div className="flex flex-col gap-2">
                <label htmlFor="locality" className="text-sm font-semibold text-zinc-200">
                  Locality / Town <span className="text-rose-400">*</span>
                </label>
                <input
                  id="locality"
                  name="locality"
                  type="text"
                  required
                  value={form.locality}
                  onChange={(e) => setForm({ ...form, locality: e.target.value })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="e.g. Kadapa Seven Roads, Proddatur"
                />
                {errors.locality && (
                  <p role="alert" className="text-xs font-medium text-rose-400">
                    {errors.locality}
                  </p>
                )}
              </div>

              {/* Emergency Contact (Optional) */}
              <div className="flex flex-col gap-2">
                <label htmlFor="emergency_contact" className="text-sm font-semibold text-zinc-200">
                  Emergency Contact Number <span className="text-xs font-normal text-zinc-400">(Optional)</span>
                </label>
                <input
                  id="emergency_contact"
                  name="emergency_contact"
                  type="tel"
                  inputMode="numeric"
                  value={form.emergency_contact}
                  onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Alternate family/friend number"
                />
                {errors.emergency_contact && (
                  <p role="alert" className="text-xs font-medium text-rose-400">
                    {errors.emergency_contact}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Cricket Profile & Photograph */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2">
              2. Cricket Profile & Auction Photograph
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Playing Role */}
              <div className="flex flex-col gap-2">
                <label htmlFor="role" className="text-sm font-semibold text-zinc-200">
                  Primary Playing Role <span className="text-rose-400">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as PlayingRole })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="all_rounder">All-Rounder</option>
                  <option value="batter">Batter</option>
                  <option value="bowler">Bowler</option>
                  <option value="wicketkeeper">Wicketkeeper</option>
                </select>
              </div>

              {/* Batting Hand */}
              <div className="flex flex-col gap-2">
                <label htmlFor="batting_hand" className="text-sm font-semibold text-zinc-200">
                  Batting Hand
                </label>
                <select
                  id="batting_hand"
                  name="batting_hand"
                  value={form.batting_hand}
                  onChange={(e) => setForm({ ...form, batting_hand: e.target.value as BattingHand })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="right_hand">Right-Hand Bat</option>
                  <option value="left_hand">Left-Hand Bat</option>
                </select>
              </div>

              {/* Bowling Style */}
              <div className="flex flex-col gap-2">
                <label htmlFor="bowling_style" className="text-sm font-semibold text-zinc-200">
                  Bowling Style
                </label>
                <select
                  id="bowling_style"
                  name="bowling_style"
                  value={form.bowling_style}
                  onChange={(e) => setForm({ ...form, bowling_style: e.target.value as BowlingStyle })}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="right_arm_pace">Right-Arm Pace</option>
                  <option value="right_arm_spin">Right-Arm Spin</option>
                  <option value="left_arm_pace">Left-Arm Pace</option>
                  <option value="left_arm_spin">Left-Arm Spin</option>
                  <option value="none">Does Not Bowl</option>
                </select>
              </div>
            </div>

            {/* Playing Experience */}
            <div className="flex flex-col gap-2">
              <label htmlFor="experience" className="text-sm font-semibold text-zinc-200">
                Local Tournament Experience / Club History <span className="text-xs font-normal text-zinc-400">(Optional)</span>
              </label>
              <textarea
                id="experience"
                name="experience"
                rows={2}
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Mention previous clubs, tournaments or notable achievements"
              />
            </div>

            {/* Player Photograph Upload */}
            <div className="flex flex-col gap-2">
              <label htmlFor="player_photo" className="text-sm font-semibold text-zinc-200">
                Player Photograph (JPEG, PNG or WebP · Max 5 MB) <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/90 p-4">
                {form.photo_data_url ? (
                  <img
                    src={form.photo_data_url}
                    alt="Uploaded player preview"
                    className="h-20 w-20 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 shrink-0">
                    <Camera size={28} weight="duotone" />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    id="player_photo"
                    name="player_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="block w-full text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-emerald-300 hover:file:bg-zinc-700"
                  />
                  <p className="text-xs text-zinc-400">
                    Upload a clear front-facing photo without sunglasses or face cover. Stored in private bucket for auction display and verification.
                  </p>
                  {form.photo_file_name && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <UploadSimple size={14} weight="bold" />
                      <span>Selected: {form.photo_file_name}</span>
                    </p>
                  )}
                </div>
              </div>
              {errors.photo && (
                <p role="alert" className="text-xs font-medium text-rose-400">
                  {errors.photo}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Online Fee Payment */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2">
              3. Registration Fee Payment
            </h2>

            <div className="rounded-xl border border-brand-lime/30 bg-brand-lime/[0.06] p-4 text-xs text-zinc-300 space-y-1.5">
              <p className="font-semibold text-brand-lime">
                Official Fee: {feeLabel} · Paid online, securely
              </p>
              <p>
                No UTR or screenshot needed. Save your details below and pay the {feeLabel} fee with
                Razorpay (UPI: PhonePe, Google Pay, Paytm). Your receipt number is issued the moment
                the payment is verified.
              </p>
              {gatewayAvailable === false && (
                <p className="flex items-start gap-1.5 font-medium text-amber-300">
                  <WarningCircle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Online payment is not switched on yet. You can still save your details and pay
                    later through Check Status.
                  </span>
                </p>
              )}
            </div>

            <ol className="grid grid-cols-1 gap-2 text-xs text-zinc-400 sm:grid-cols-3">
              <li className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                <span className="font-bold text-emerald-400">1. Save details</span>
                <p className="mt-0.5">Your profile and photo are stored privately.</p>
              </li>
              <li className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                <span className="font-bold text-emerald-400">2. Pay {feeLabel}</span>
                <p className="mt-0.5">Secure Razorpay checkout on the next screen.</p>
              </li>
              <li className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                <span className="font-bold text-emerald-400">3. Get receipt</span>
                <p className="mt-0.5">Download or print your official receipt instantly.</p>
              </li>
            </ol>
          </div>

          {/* Section 4: Rules & Privacy Consent */}
          <div className="space-y-4 border-t border-zinc-800 pt-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rules_acknowledged}
                onChange={(e) => setForm({ ...form, rules_acknowledged: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                I have read and accept the official TKPL tournament rules, eligibility requirements and refund policy. I understand that the {feeLabel} fee confirms my slot for the official on-ground selection trials, and that only qualified players advance to the final auction pool. <span className="text-rose-400">*</span>
              </span>
            </label>
            {errors.rules_acknowledged && (
              <p role="alert" className="text-xs font-medium text-rose-400">
                {errors.rules_acknowledged}
              </p>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.marketing_consent}
                onChange={(e) => setForm({ ...form, marketing_consent: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Optional: I consent to my player name, role and uploaded photograph being featured on official TKPL auction graphics and tournament announcements.
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <span>Protected against accidental duplicate submission</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isRegistrationBlocked}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm sm:text-base font-bold text-zinc-950 shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              <CheckCircle size={20} weight="bold" />
              <span>
                {isSubmitting
                  ? 'Saving Details...'
                  : `Save Details & Pay ${feeLabel}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
