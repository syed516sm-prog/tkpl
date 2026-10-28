import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  LockKey,
  CurrencyInr,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { canRolePerform, maskPhoneForReadOnly } from '../../core/lib/validation';
import type { RegistrationStatus } from '../../core/types/tkpl';
import {
  PaymentBadge,
  RegistrationBadge,
  RoleLabel,
} from '../../core/components/StatusBadge';

export const AdminPlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { players, payments, adminSession, updatePlayerReview } = useTournament();

  const player = players.find((p) => p.id === id);
  const payment = payments.find((py) => py.player_id === id);

  const [regStatus, setRegStatus] = useState<RegistrationStatus>(
    player?.registration_status ?? 'submitted'
  );
  const [reviewNotes, setReviewNotes] = useState<string>(player?.review_notes ?? '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!player) {
    return <Navigate to="/admin/players" replace />;
  }

  const canReview = canRolePerform(adminSession?.role, 'review_player');
  const isPaymentVerified = payment?.status === 'verified';

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      updatePlayerReview({
        playerId: player.id,
        registrationStatus: regStatus,
        auctionStatus: regStatus === 'approved' ? 'eligible' : 'not_reviewed',
        reviewNotes,
      });
      setFeedback({
        type: 'success',
        message: 'Player review decision saved and recorded in the organizer audit log.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to update player status.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/players"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft size={16} />
          <span>Back to Player Roster</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 5 cols: Player Card & Private Photograph */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <div className="flex items-start gap-4">
              <img
                src={player.photo_url}
                alt={player.full_name}
                className="h-28 w-28 rounded-2xl object-cover border border-zinc-700 bg-zinc-950 shrink-0"
              />
              <div className="space-y-1.5">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {player.registration_no}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-50">
                  {player.full_name}
                </h1>
                <p className="text-sm text-zinc-300">{player.locality}</p>
                <div className="pt-1">
                  <RoleLabel role={player.role} />
                </div>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-5 text-xs sm:text-sm">
              <div>
                <dt className="text-xs text-zinc-400">Mobile Number</dt>
                <dd className="mt-0.5 font-mono font-semibold text-zinc-100">
                  {maskPhoneForReadOnly(player.phone, adminSession?.role)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Date of Birth</dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">{player.date_of_birth}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Batting Hand</dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {player.batting_hand.replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Bowling Style</dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {player.bowling_style.replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-zinc-400">Tournament Experience</dt>
                <dd className="mt-0.5 text-zinc-200 leading-relaxed">
                  {player.experience || 'None specified'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-zinc-400">Marketing & Poster Photo Consent</dt>
                <dd className="mt-0.5 text-zinc-200">
                  {player.marketing_consent ? 'Yes (Consented)' : 'No (Tournament operations only)'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Linked Payment Summary */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <CurrencyInr size={20} weight="bold" />
                <h2 className="text-base font-bold text-zinc-100">Linked Fee Record</h2>
              </div>
              <PaymentBadge status={payment?.status ?? 'pending'} />
            </div>

            <div className="text-xs sm:text-sm text-zinc-300 space-y-1.5 pt-2 border-t border-zinc-800">
              <p>
                Method: <strong className="uppercase text-zinc-100">{payment?.method ?? 'upi'}</strong>
              </p>
              <p>
                Submitted Reference:{' '}
                <strong className="font-mono text-amber-300">
                  {payment?.transaction_ref || 'None submitted'}
                </strong>
              </p>
              {payment?.verified_at && (
                <p className="text-xs text-emerald-400">
                  Verified by {payment.verifier_name} on{' '}
                  {new Date(payment.verified_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Kolkata',
                  })}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Link
                to="/admin/payments"
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline"
              >
                Open Payment Reconciliation Ledger →
              </Link>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Organizer Review Decision */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-50">
                  Profile Review & Decision
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                  Review the player photograph and details before approving or requesting corrections.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RegistrationBadge status={player.registration_status} />
              </div>
            </div>

            {!canReview ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 text-sm text-amber-200">
                <LockKey size={22} className="mt-0.5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-bold">Admin Authorization Required</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    Sign in with your tournament admin credentials to approve profiles or request corrections.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveReview} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="review_reg_status" className="text-sm font-semibold text-zinc-200">
                      1. Registration Review Status
                    </label>
                    <select
                      id="review_reg_status"
                      value={regStatus}
                      onChange={(e) => setRegStatus(e.target.value as RegistrationStatus)}
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="needs_correction">Needs Correction (Photo / Details)</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="review_notes" className="text-sm font-semibold text-zinc-200">
                    Reviewer Notes (Visible to Applicant on Status Check)
                  </label>
                  <textarea
                    id="review_notes"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Record verification remarks or specify what correction is needed (e.g. 'Please re-upload a clear front-facing photo without cap')"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {feedback && (
                  <div
                    role="alert"
                    className={`flex items-center gap-2.5 rounded-xl p-4 text-xs sm:text-sm font-medium ${
                      feedback.type === 'success'
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle size={20} weight="fill" />
                    ) : (
                      <WarningCircle size={20} weight="fill" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 active:scale-[0.98]"
                >
                  <CheckCircle size={18} weight="bold" />
                  <span>Save Review Decision</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
