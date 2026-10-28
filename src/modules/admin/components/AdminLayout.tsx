import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  ChartBar,
  Users,
  CurrencyInr,
  GearSix,
  ShieldCheck,
  ArrowCounterClockwise,
  SignOut,
  CloudCheck,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import type { AdminRole } from '../../core/types/tkpl';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { adminSession, isCloudConnected, loginAdmin, logoutAdmin, resetDemoDatabase } = useTournament();

  if (!adminSession) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { path: '/admin', label: 'Overview & Audit', icon: ChartBar, exact: true },
    { path: '/admin/players', label: 'Players & Roster', icon: Users, exact: false },
    { path: '/admin/payments', label: 'Payment Ledger', icon: CurrencyInr, exact: false },
    { path: '/admin/settings', label: 'Tournament Settings', icon: GearSix, exact: false },
  ];

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950 text-zinc-100">
      {/* Top Admin Context Bar with Role Switcher */}
      <div className="border-b border-zinc-800 bg-zinc-900/90">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} weight="duotone" className="text-amber-400" />
            <span className="text-xs sm:text-sm font-semibold text-zinc-200">
              Signed in as: <strong className="text-emerald-400">{adminSession.full_name}</strong>
            </span>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-emerald-300">
              Tournament Admin
            </span>
            {isCloudConnected ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <CloudCheck size={13} className="text-emerald-400" />
                <span>Supabase Cloud</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                <span>Demo Mode</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!isCloudConnected && (
              <button
                type="button"
                onClick={resetDemoDatabase}
                title="Reset sample data to initial state"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              >
                <ArrowCounterClockwise size={14} />
                <span>Reset Demo Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                await logoutAdmin();
              }}
              title="Sign out of the organizer portal"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/40 hover:border-red-500/50 transition"
            >
              <SignOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Sub-Navigation Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? 'border-emerald-400 text-emerald-300 bg-zinc-800/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Icon size={17} weight={active ? 'duotone' : 'regular'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Outlet */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
};
