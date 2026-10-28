import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlass,
  FileCsv,
  ArrowRight,
  Funnel,
  LockKey,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import {
  buildSafePlayerRosterCsv,
  canRolePerform,
  maskPhoneForReadOnly,
} from '../../core/lib/validation';
import {
  PaymentBadge,
  RegistrationBadge,
  RoleLabel,
} from '../../core/components/StatusBadge';

export const AdminPlayersPage: React.FC = () => {
  const { players, payments, adminSession, recordCsvExportAudit } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [payStatusFilter, setPayStatusFilter] = useState<string>('all');
  const [exportFeedback, setExportFeedback] = useState<string>('');

  const paymentByPlayerId = useMemo(() => {
    const map = new Map<string, (typeof payments)[number]>();
    for (const p of payments) {
      map.set(p.player_id, p);
    }
    return map;
  }, [payments]);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return players.filter((pl) => {
      const pay = paymentByPlayerId.get(pl.id);
      const payStatus = pay?.status ?? 'pending';

      if (roleFilter !== 'all' && pl.role !== roleFilter) return false;
      if (regStatusFilter !== 'all' && pl.registration_status !== regStatusFilter) return false;
      if (payStatusFilter !== 'all' && payStatus !== payStatusFilter) return false;

      if (!q) return true;
      return (
        pl.registration_no.toLowerCase().includes(q) ||
        pl.full_name.toLowerCase().includes(q) ||
        pl.locality.toLowerCase().includes(q) ||
        pl.phone.includes(q)
      );
    });
  }, [payStatusFilter, paymentByPlayerId, players, regStatusFilter, roleFilter, searchQuery]);

  const handleDownloadCsv = () => {
    const csv = buildSafePlayerRosterCsv(players, payments, { onlyAuctionEligible: false });
    const rowCount = csv.split('\n').length - 1;
    recordCsvExportAudit('all_players', rowCount);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TKPL_Registered_Players_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(
      `Exported ${rowCount} registered player records and logged to security audit trail.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
            Registered Players Roster
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Search, filter, and review player profiles. Export clean player lists anytime.
          </p>
        </div>

        {/* CSV Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 hover:bg-emerald-400 active:scale-[0.98]"
          >
            <FileCsv size={18} weight="bold" />
            <span>Export Registered Players CSV</span>
          </button>
        </div>
      </div>

      {exportFeedback && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs font-medium text-emerald-300"
        >
          {exportFeedback}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Input */}
          <div className="relative lg:col-span-1">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, ID, locality, phone..."
              aria-label="Search players"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              aria-label="Filter by Playing Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs sm:text-sm text-zinc-200"
            >
              <option value="all">All Playing Roles</option>
              <option value="all_rounder">All-Rounder</option>
              <option value="batter">Batter</option>
              <option value="bowler">Bowler</option>
              <option value="wicketkeeper">Wicketkeeper</option>
            </select>
          </div>

          {/* Registration Status Filter */}
          <div>
            <select
              aria-label="Filter by Registration Status"
              value={regStatusFilter}
              onChange={(e) => setRegStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs sm:text-sm text-zinc-200"
            >
              <option value="all">All Profile Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="needs_correction">Needs Correction</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              aria-label="Filter by Payment Status"
              value={payStatusFilter}
              onChange={(e) => setPayStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs sm:text-sm text-zinc-200"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Payment Pending</option>
              <option value="submitted">Ref Submitted (Unverified)</option>
              <option value="verified">Payment Verified</option>
              <option value="failed">Failed / Unmatched</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Funnel size={14} className="text-emerald-400" />
            <span>
              Showing <strong className="text-zinc-200">{filteredPlayers.length}</strong> of{' '}
              {players.length} registered players
            </span>
          </span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 pl-5 pr-3">Player</th>
                <th className="py-3.5 px-3">Locality & Phone</th>
                <th className="py-3.5 px-3">Role</th>
                <th className="py-3.5 px-3">Profile Status</th>
                <th className="py-3.5 px-3">Payment Status</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-400">
                    No players match the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((pl) => {
                  const pay = paymentByPlayerId.get(pl.id);
                  return (
                    <tr key={pl.id} className="hover:bg-zinc-800/35 transition">
                      <td className="py-4 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={pl.photo_url}
                            alt={pl.full_name}
                            className="h-10 w-10 rounded-xl object-cover border border-zinc-700 shrink-0 bg-zinc-950"
                          />
                          <div>
                            <p className="font-mono text-xs font-bold text-emerald-400">
                              {pl.registration_no}
                            </p>
                            <p className="font-bold text-zinc-100">{pl.full_name}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3">
                        <p className="text-zinc-200 font-medium">{pl.locality}</p>
                        <p className="font-mono text-xs text-zinc-400">
                          {maskPhoneForReadOnly(pl.phone, adminSession?.role)}
                        </p>
                      </td>

                      <td className="py-4 px-3">
                        <RoleLabel role={pl.role} />
                      </td>

                      <td className="py-4 px-3">
                        <RegistrationBadge status={pl.registration_status} />
                      </td>

                      <td className="py-4 px-3">
                        <PaymentBadge status={pay?.status ?? 'pending'} />
                      </td>

                      <td className="py-4 pl-3 pr-5 text-right">
                        <Link
                          to={`/admin/players/${pl.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-300"
                        >
                          <span>Inspect</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
