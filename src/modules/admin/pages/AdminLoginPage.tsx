import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  EyeSlash,
  LockKey,
  EnvelopeSimple,
  SpinnerGap,
  CloudCheck,
  WarningCircle,
  Flask,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminSession, isCloudConnected, loginAdmin, loginAdminWithPassword } = useTournament();

  const [activeTab, setActiveTab] = useState<'cloud' | 'demo'>(
    isCloudConnected ? 'cloud' : 'demo'
  );

  // Cloud login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Demo login state
  const [organizerName, setOrganizerName] = useState<string>('');

  if (adminSession) {
    return <Navigate to="/admin" replace />;
  }

  const handleCloudLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      await loginAdminWithPassword(email, password);
      navigate('/admin');
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : 'Could not sign in. Please verify your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginAdmin(organizerName.trim() || 'Tournament Administrator');
    navigate('/admin');
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-950 py-12 sm:py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl">
          {/* Header & Connection Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-5">
            <div className="flex items-center gap-2.5 text-amber-400">
              <ShieldCheck size={28} weight="duotone" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Organizer Control Desk
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-50">
                  TKPL Admin Sign-In
                </h1>
              </div>
            </div>

            {isCloudConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <CloudCheck size={16} className="text-emerald-400" />
                <span>Supabase Cloud Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Flask size={16} className="text-amber-400" />
                <span>Offline Demo Mode</span>
              </span>
            )}
          </div>

          {/* Mode Switcher Tabs (when in cloud mode) */}
          {isCloudConnected && (
            <div className="mt-6 flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cloud');
                  setLoginError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'cloud'
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('demo');
                  setLoginError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'demo'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Demo Preview Mode
              </button>
            </div>
          )}

          {/* TAB 1: Production Supabase Auth Form */}
          {activeTab === 'cloud' && isCloudConnected ? (
            <form onSubmit={handleCloudLogin} className="mt-6 space-y-5">
              <p className="text-sm text-zinc-300">
                Sign in with your official administrator email and password to manage tournament registrations, auction pools, and settings.
              </p>

              {loginError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs sm:text-sm text-red-300">
                  <WarningCircle size={20} className="shrink-0 text-red-400" />
                  <div>
                    <span className="font-bold">Authentication failed: </span>
                    <span>{loginError}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="admin_email" className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <EnvelopeSimple size={18} />
                  </div>
                  <input
                    id="admin_email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. syed516.sm@gmail.com"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin_password" className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <LockKey size={18} />
                  </div>
                  <input
                    id="admin_password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your admin password"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-11 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm sm:text-base font-bold text-zinc-950 shadow-lg transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap size={20} className="animate-spin" />
                    <span>Signing in securely...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} weight="bold" />
                    <span>Sign In to Admin Portal</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: Demo Mode (Offline or Preview) */
            <form onSubmit={handleDemoLogin} className="mt-6 space-y-6">
              {!isCloudConnected && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 leading-relaxed">
                  <strong>Notice:</strong> Supabase cloud environment keys are not detected. Running in offline demo mode with sample player and payment data.
                </div>
              )}

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Full Administrator Access
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  You will enter with complete permissions: review player profiles, inspect live payment ledgers, download registered player CSVs, and update tournament rules.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="organizer_name" className="text-sm font-semibold text-zinc-200">
                  Display Name <span className="text-xs font-normal text-zinc-400">(Optional)</span>
                </label>
                <input
                  id="organizer_name"
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="Syed · Tournament Administrator"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm sm:text-base font-bold text-zinc-950 shadow-lg transition hover:bg-emerald-400 active:scale-[0.98]"
              >
                <LockKey size={20} weight="bold" />
                <span>Enter Demo Admin Dashboard</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
