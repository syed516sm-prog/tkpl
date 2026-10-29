import React, { useEffect, useState } from 'react';
import {
  GearSix,
  CheckCircle,
  WarningCircle,
  LockKey,
  DownloadSimple,
  CreditCard,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { canRolePerform } from '../../core/lib/validation';
import { fetchPaymentGatewayHealth, type GatewayHealth } from '../../core/lib/paymentApi';

export const AdminSettingsPage: React.FC = () => {
  const { settings, players, payments, auditLogs, adminSession, updateTournamentSettings } =
    useTournament();

  const canManage = canRolePerform(adminSession?.role, 'manage_settings');

  const [tournamentName, setTournamentName] = useState(settings.tournament_name);
  const [season, setSeason] = useState(settings.season);
  const [organizerLine, setOrganizerLine] = useState(settings.organizer_line);
  const [partnerLine, setPartnerLine] = useState(settings.partner_line);
  const [feeRupees, setFeeRupees] = useState(String(Math.round(settings.fee_paise / 100)));
  const [upiId, setUpiId] = useState(settings.upi_id);
  const [registrationOpen, setRegistrationOpen] = useState(settings.registration_open);
  const [deadlineDate, setDeadlineDate] = useState(settings.deadline.slice(0, 16));
  const [minAge, setMinAge] = useState(String(settings.min_age));
  const [maxAge, setMaxAge] = useState(String(settings.max_age));
  const [rulesText, setRulesText] = useState(settings.rules_text);
  const [refundPolicy, setRefundPolicy] = useState(settings.refund_policy);
  const [privacyNotice, setPrivacyNotice] = useState(settings.privacy_notice);
  const [contactText, setContactText] = useState(settings.contact_text);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [gateway, setGateway] = useState<GatewayHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPaymentGatewayHealth().then((health) => {
      if (!cancelled) setGateway(health);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSaved(false);

    const parsedFeeRupees = Number(feeRupees);
    if (Number.isNaN(parsedFeeRupees) || parsedFeeRupees < 0) {
      setFeedback({ type: 'error', message: 'Registration fee must be a valid non-negative amount.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateTournamentSettings({
        tournament_name: tournamentName.trim(),
        season: season.trim(),
        organizer_line: organizerLine.trim(),
        partner_line: partnerLine.trim(),
        fee_paise: Math.round(parsedFeeRupees * 100),
        upi_id: upiId.trim(),
        registration_open: registrationOpen,
        deadline: new Date(deadlineDate).toISOString(),
        min_age: Number(minAge) || 15,
        max_age: Number(maxAge) || 50,
        rules_text: rulesText.trim(),
        refund_policy: refundPolicy.trim(),
        privacy_notice: privacyNotice.trim(),
        contact_text: contactText.trim(),
      });
      setIsSaved(true);
      setFeedback({
        type: 'success',
        message: 'Tournament settings updated across all public pages and recorded in the audit log.',
      });
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackupJson = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      exported_by: adminSession?.full_name ?? 'Super Admin',
      settings,
      players,
      payments,
      audit_logs: auditLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TKPL_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
            Tournament Settings & Partner Governance
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure the registration fee, deadline, open/closed switch, partner credits and full ledger backup.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleDownloadBackupJson}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-100 hover:bg-zinc-800 active:scale-[0.98]"
          >
            <DownloadSimple size={18} className="text-emerald-400" />
            <span>Download Full Ledger JSON Backup</span>
          </button>
        )}
      </div>

      {/* Read-only payment gateway status. No key or secret is ever shown. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex items-center gap-3">
          <CreditCard size={22} className="text-emerald-400" />
          <div>
            <p className="text-sm font-bold text-zinc-100">Payment gateway: Razorpay (online checkout)</p>
            <p className="text-xs text-zinc-400">
              Keys live only in the server environment; the browser never sees them.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            gateway === null
              ? 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
              : gateway.configured
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          {gateway === null
            ? 'Checking…'
            : gateway.configured
              ? 'Connected · online payments live'
              : 'Not configured · players are told to pay via the organizers'}
        </span>
      </div>

      {!canManage ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-200">
          <LockKey size={24} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="font-bold text-amber-100">
              Super Admin Permission Required ({adminSession?.role})
            </p>
            <p className="mt-1 text-xs sm:text-sm text-zinc-300">
              Only the <strong className="text-zinc-100">Super Admin / Tournament Lead</strong> can change tournament fees, deadlines, registration open/close state or partner credits. Switch to Super Admin in the top bar to edit these settings.
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8"
        >
          {feedback && (
            <div
              role="alert"
              className={`flex items-center gap-2 rounded-xl p-4 text-xs sm:text-sm font-medium ${
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

          {/* Registration Open/Closed Master Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div>
              <span className="text-sm font-bold text-zinc-100">
                Accept New Player Registrations
              </span>
              <p className="text-xs text-zinc-400">
                When turned off, the registration form is immediately blocked server-side.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.target.checked)}
                className="h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold uppercase text-emerald-400">
                {registrationOpen ? 'Open' : 'Closed'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_name" className="text-sm font-semibold text-zinc-200">
                Tournament Title
              </label>
              <input
                id="cfg_name"
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_season" className="text-sm font-semibold text-zinc-200">
                Season Label
              </label>
              <input
                id="cfg_season"
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_organizer" className="text-sm font-semibold text-zinc-200">
                Organizer Credit Line (Brother&apos;s Name & Title)
              </label>
              <input
                id="cfg_organizer"
                type="text"
                value={organizerLine}
                onChange={(e) => setOrganizerLine(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_partner" className="text-sm font-semibold text-zinc-200">
                Business Association Line (Sultan Sports & Co-Partner)
              </label>
              <input
                id="cfg_partner"
                type="text"
                value={partnerLine}
                onChange={(e) => setPartnerLine(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_fee" className="text-sm font-semibold text-zinc-200">
                Registration Fee (in INR ₹)
              </label>
              <input
                id="cfg_fee"
                type="number"
                min={0}
                value={feeRupees}
                onChange={(e) => setFeeRupees(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_deadline" className="text-sm font-semibold text-zinc-200">
                Registration Deadline
              </label>
              <input
                id="cfg_deadline"
                type="datetime-local"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_rules" className="text-sm font-semibold text-zinc-200">
                Published Tournament Rules & Eligibility Text
              </label>
              <textarea
                id="cfg_rules"
                rows={3}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_refund" className="text-sm font-semibold text-zinc-200">
                Published Refund & Reconciliation Policy
              </label>
              <textarea
                id="cfg_refund"
                rows={2}
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cfg_contact" className="text-sm font-semibold text-zinc-200">
                Official Helpdesk Contact Line
              </label>
              <input
                id="cfg_contact"
                type="text"
                value={contactText}
                onChange={(e) => setContactText(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className={`inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-all duration-300 active:scale-[0.98] disabled:cursor-wait ${
              isSaved
                ? 'bg-emerald-400 text-zinc-950 ring-2 ring-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.5)]'
                : isSaving
                ? 'bg-emerald-600 text-zinc-950 opacity-90'
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isSaving ? (
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
                <span>Saving Settings...</span>
              </>
            ) : isSaved ? (
              <>
                <CheckCircle size={18} weight="fill" className="text-zinc-950 animate-bounce" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <GearSix size={18} weight="bold" />
                <span>Save Tournament Settings</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
