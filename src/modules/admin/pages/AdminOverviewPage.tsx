import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  CurrencyInr,
  ClockCountdown,
  Trophy,
  ArrowRight,
  ClockCounterClockwise,
  LockKey,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { canRolePerform, formatInrFromPaise } from '../../core/lib/validation';

export const AdminOverviewPage: React.FC = () => {
  const { players, payments, auditLogs, adminSession } = useTournament();

  const totalPlayers = players.length;
  const approvedPlayers = players.filter((p) => p.registration_status === 'approved').length;
  const pendingReviewPlayers = players.filter(
    (p) => p.registration_status === 'submitted' || p.registration_status === 'under_review'
  ).length;

  const verifiedPayments = payments.filter((py) => py.status === 'verified');
  const submittedUnverifiedPayments = payments.filter((py) => py.status === 'submitted').length;
  const totalVerifiedPaise = verifiedPayments.reduce((acc, item) => acc + item.amount_paise, 0);
  const razorpayPaise = verifiedPayments
    .filter((py) => py.method === 'razorpay')
    .reduce((acc, item) => acc + item.amount_paise, 0);

  // Pending rows older than 30 minutes: the checkout was opened and abandoned.
  const abandonedCutoff = Date.now() - 30 * 60 * 1000;
  const abandonedCheckouts = payments.filter(
    (py) => py.status === 'pending' && new Date(py.created_at).getTime() < abandonedCutoff
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
            Tournament Operations Overview
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Live player registration counts, Razorpay collections, abandoned checkouts and the security audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/players"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            <span>Review Players ({pendingReviewPlayers} pending)</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 hover:bg-emerald-400"
          >
            <span>Payment Ledger ({submittedUnverifiedPayments} legacy to check)</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Registered</span>
            <Users size={20} className="text-sky-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-zinc-50">{totalPlayers}</p>
          <p className="mt-1 text-xs text-zinc-400">{pendingReviewPlayers} awaiting profile review</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved Profiles</span>
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-400">{approvedPlayers}</p>
          <p className="mt-1 text-xs text-zinc-400">Identity & photo verified</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Collected via Razorpay</span>
            <CurrencyInr size={20} className="text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-zinc-50">
            {formatInrFromPaise(razorpayPaise)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {verifiedPayments.length} verified ({formatInrFromPaise(totalVerifiedPaise)} incl. legacy)
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-amber-300">
            <span className="text-xs font-semibold uppercase tracking-wider">Abandoned Checkouts</span>
            <ClockCountdown size={20} className="text-amber-400" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-300">{abandonedCheckouts}</p>
          <p className="mt-1 text-xs text-zinc-400">Pending &gt; 30 min · player can still pay</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/20 p-5">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Entries</span>
            <Trophy size={20} className="text-amber-300" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-300">{verifiedPayments.length}</p>
          <p className="mt-1 text-xs text-zinc-300">Paid & confirmed players</p>
        </div>
      </div>

      {/* Audit Log Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ClockCounterClockwise size={22} className="text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                Organizer Security & Action Audit Log
              </h2>
              <p className="text-xs text-zinc-400">
                Every player approval, payment reconciliation, CSV export and settings update is recorded with actor and timestamp.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400">
                <th className="py-3 pr-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 pl-4">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {auditLogs.slice(0, 15).map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-800/30">
                  <td className="py-3 pr-4 font-mono text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'Asia/Kolkata',
                    })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-zinc-200">{entry.actor_name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-emerald-400 whitespace-nowrap">
                    {entry.action}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-amber-300 whitespace-nowrap">
                    {entry.entity_id}
                  </td>
                  <td className="py-3 pl-4 text-zinc-300">{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
