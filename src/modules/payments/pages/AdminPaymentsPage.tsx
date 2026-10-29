import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CurrencyInr,
  ShieldCheck,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  LockKey,
  PencilSimple,
  FileCsv,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import {
  buildPaymentsCsv,
  canRolePerform,
  formatInrFromPaise,
  maskPhoneForReadOnly,
} from '../../core/lib/validation';
import type { PaymentMethod, PaymentRecord, PaymentStatus } from '../../core/types/tkpl';
import { PaymentBadge, paymentMethodLabel } from '../../core/components/StatusBadge';

const isOnlinePayment = (pay: PaymentRecord) => pay.method === 'razorpay';

export const AdminPaymentsPage: React.FC = () => {
  const { payments, adminSession, updatePaymentVerification, recordCsvExportAudit } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  const [editStatus, setEditStatus] = useState<PaymentStatus>('verified');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('upi');
  const [editTxRef, setEditTxRef] = useState<string>('');
  const [editRefundRef, setEditRefundRef] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const canVerifyPayment = canRolePerform(adminSession?.role, 'verify_payment');
  const canExport = canRolePerform(adminSession?.role, 'export_csv');

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((py) => {
      if (statusFilter !== 'all' && py.status !== statusFilter) return false;
      if (!q) return true;
      return (
        py.registration_no.toLowerCase().includes(q) ||
        py.player_name.toLowerCase().includes(q) ||
        py.transaction_ref.toLowerCase().includes(q) ||
        py.razorpay_payment_id.toLowerCase().includes(q) ||
        py.receipt_no.toLowerCase().includes(q) ||
        py.player_phone.includes(q)
      );
    });
  }, [payments, searchQuery, statusFilter]);

  const reconciledLegacyCount = payments.filter(
    (py) => !isOnlinePayment(py) && (py.status === 'submitted' || py.status === 'pending')
  ).length;

  const openReconcileModal = (pay: PaymentRecord) => {
    setEditingPayment(pay);
    setEditStatus(pay.status === 'submitted' ? 'verified' : pay.status);
    setEditMethod(pay.method);
    setEditTxRef(pay.transaction_ref);
    setEditRefundRef(pay.refund_ref);
    setEditNotes(pay.notes);
    setFeedback(null);
  };

  const handleSaveReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setFeedback(null);
    setIsSaving(true);

    try {
      await updatePaymentVerification({
        paymentId: editingPayment.id,
        status: editStatus,
        method: editMethod,
        transactionRef: editTxRef,
        refundRef: editRefundRef,
        notes: editNotes,
      });
      setFeedback({
        type: 'success',
        message: `Updated payment for ${editingPayment.player_name} (${editingPayment.registration_no}) to ${editStatus.toUpperCase()}.`,
      });
      setEditingPayment(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not update payment status.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (!canExport) return;
    const csv = buildPaymentsCsv(filteredPayments);
    void recordCsvExportAudit('payments', filteredPayments.length).catch(() => {
      // The download must not fail just because the audit insert did.
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TKPL_Payments_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onlineEditing = editingPayment ? isOnlinePayment(editingPayment) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
            Payment Verification & Receipt Ledger
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Online fees are verified by Razorpay signature; only legacy offline rows need a manual
            statement match.
          </p>
        </div>

        {canExport ? (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 hover:bg-amber-300 active:scale-[0.98]"
          >
            <FileCsv size={18} weight="bold" />
            <span>Export Payments CSV</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-400">
            <LockKey size={15} className="text-amber-400" />
            <span>CSV export restricted to Super Admin &amp; Reviewer roles</span>
          </div>
        )}
      </div>

      {/* Reconciliation policy */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 sm:p-5 text-xs sm:text-sm text-emerald-100">
        <ShieldCheck size={24} className="mt-0.5 shrink-0 text-emerald-400" />
        <div>
          <p className="font-bold text-emerald-200">
            Online payments are verified automatically — no screenshot, no UTR needed.
          </p>
          <p className="mt-1 text-zinc-300 leading-relaxed">
            Every Razorpay payment is checked against its HMAC signature and re-fetched from
            Razorpay before the receipt number is issued, so the ledger below is already matched to
            a real capture.
            {reconciledLegacyCount > 0
              ? ` ${reconciledLegacyCount} legacy offline row${reconciledLegacyCount === 1 ? '' : 's'} still need a manual statement check.`
              : ' Manual reconciliation now only applies to any legacy/offline rows.'}{' '}
            Refunds still need a refund reference.
          </p>
        </div>
      </div>

      {!canVerifyPayment && (
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-300">
          <LockKey size={18} className="text-amber-400 shrink-0" />
          <span>
            Your current role (<strong className="text-zinc-100">{adminSession?.role}</strong>) has
            view-only access to the payment ledger. Switch to{' '}
            <strong className="text-emerald-300">Payment Verifier</strong> or{' '}
            <strong className="text-emerald-300">Super Admin</strong> to reconcile legacy payments
            or record refunds.
          </span>
        </div>
      )}

      {feedback && !editingPayment && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl p-4 text-xs sm:text-sm font-medium ${
            feedback.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle size={18} weight="fill" />
          ) : (
            <WarningCircle size={18} weight="fill" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Registration ID, Player Name, Receipt No, Razorpay ID or Phone..."
            aria-label="Search payments"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter payments by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs sm:text-sm text-zinc-200"
        >
          <option value="all">All Payment Statuses ({payments.length})</option>
          <option value="verified">
            Verified ({payments.filter((p) => p.status === 'verified').length})
          </option>
          <option value="pending">
            Pending · Payment Not Completed ({payments.filter((p) => p.status === 'pending').length})
          </option>
          <option value="submitted">
            Submitted · Legacy Unverified ({payments.filter((p) => p.status === 'submitted').length})
          </option>
          <option value="failed">
            Failed / Abandoned ({payments.filter((p) => p.status === 'failed').length})
          </option>
          <option value="refunded">
            Refunded ({payments.filter((p) => p.status === 'refunded').length})
          </option>
        </select>
      </div>

      {/* Inline Reconciliation Panel when a row is selected */}
      {editingPayment && canVerifyPayment && (
        <form
          onSubmit={handleSaveReconciliation}
          className="rounded-2xl border border-emerald-500/40 bg-zinc-900 p-6 shadow-2xl space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-emerald-400">
                Reconciling {editingPayment.registration_no}
              </span>
              <h2 className="text-lg font-bold text-zinc-50">
                {editingPayment.player_name} · {formatInrFromPaise(editingPayment.amount_paise)}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditingPayment(null)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>

          {onlineEditing && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-950/20 p-3.5 text-xs text-amber-200">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <span>
                This is a Razorpay payment verified by signature ({editingPayment.razorpay_payment_id}).
                It cannot be moved back to Submitted/Pending or re-pointed at another reference — only
                a refund can be recorded here.
              </span>
            </div>
          )}

          {feedback && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs font-medium text-rose-200"
            >
              <WarningCircle size={18} className="text-rose-400 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reconcile_status" className="text-xs font-semibold text-zinc-300">
                Decision
              </label>
              <select
                id="reconcile_status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as PaymentStatus)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
              >
                {onlineEditing ? (
                  <>
                    <option value="verified">Verified (Razorpay signature)</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                  </>
                ) : (
                  <>
                    <option value="verified">Verified (Matched in Statement)</option>
                    <option value="submitted">Submitted (Unverified)</option>
                    <option value="pending">Pending (No Ref)</option>
                    <option value="failed">Failed / Could Not Match UTR</option>
                    <option value="refunded">Refunded</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reconcile_method" className="text-xs font-semibold text-zinc-300">
                Payment Method
              </label>
              <select
                id="reconcile_method"
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                disabled={onlineEditing}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 disabled:opacity-60"
              >
                {onlineEditing && <option value="razorpay">Razorpay (Online)</option>}
                <option value="upi">UPI Transfer</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash_organizer">Cash to Organizer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reconcile_tx_ref" className="text-xs font-semibold text-zinc-300">
                Transaction Ref / Cash Receipt No.
              </label>
              <input
                id="reconcile_tx_ref"
                type="text"
                value={editTxRef}
                onChange={(e) => setEditTxRef(e.target.value)}
                readOnly={onlineEditing}
                placeholder="12-digit UTR or CASH-RCPT-#"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-zinc-100 read-only:opacity-70"
              />
            </div>
          </div>

          {editStatus === 'refunded' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reconcile_refund_ref" className="text-xs font-semibold text-amber-300">
                Refund Reference Number <span className="text-rose-400">*</span>
              </label>
              <input
                id="reconcile_refund_ref"
                type="text"
                value={editRefundRef}
                onChange={(e) => setEditRefundRef(e.target.value)}
                placeholder="Razorpay refund id (rfnd_...) or UPI refund UTR / cash voucher"
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-zinc-100"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reconcile_notes" className="text-xs font-semibold text-zinc-300">
              Reconciliation Notes
            </label>
            <input
              id="reconcile_notes"
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Refund issued in Razorpay dashboard on 12 Nov"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75"
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
                  <span>Updating Status...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} weight="bold" />
                  <span>Confirm Payment Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Receipts users can press against the Razorpay dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Receipts issued
          </p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-50">
            {payments.filter((p) => p.receipt_no).length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Received online
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-400">
            {formatInrFromPaise(
              payments
                .filter((p) => p.status === 'verified' && isOnlinePayment(p))
                .reduce((acc, p) => acc + p.amount_paise, 0)
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Refunded
          </p>
          <p className="mt-1 text-2xl font-extrabold text-purple-300">
            {payments.filter((p) => p.status === 'refunded').length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Legacy manual checks
          </p>
          <p className="mt-1 text-2xl font-extrabold text-amber-300">{reconciledLegacyCount}</p>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 pl-5 pr-3">Registration & Player</th>
                <th className="py-3.5 px-3">Amount & Method</th>
                <th className="py-3.5 px-3">Receipt No</th>
                <th className="py-3.5 px-3">Razorpay Payment ID</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-400">
                    No payments match the current search or filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-zinc-800/35 transition">
                    <td className="py-4 pl-5 pr-3">
                      <Link
                        to={`/admin/players/${pay.player_id}`}
                        className="font-mono text-xs font-bold text-emerald-400 hover:underline"
                      >
                        {pay.registration_no}
                      </Link>
                      <p className="font-bold text-zinc-100">{pay.player_name}</p>
                      <p className="font-mono text-xs text-zinc-400">
                        {maskPhoneForReadOnly(pay.player_phone, adminSession?.role)}
                      </p>
                    </td>

                    <td className="py-4 px-3">
                      <span className="inline-flex items-center font-bold text-zinc-100">
                        <CurrencyInr size={14} className="text-emerald-400" />
                        {Math.round(pay.amount_paise / 100)}
                      </span>
                      <span className="block text-xs text-zinc-400">
                        {paymentMethodLabel(pay.method)}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      {pay.receipt_no ? (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-semibold text-emerald-300">
                          {pay.receipt_no}
                        </span>
                      ) : (
                        <span className="text-xs italic text-zinc-500">Not issued</span>
                      )}
                      {pay.refund_ref && (
                        <span className="mt-1 block font-mono text-[11px] text-purple-300">
                          Refund: {pay.refund_ref}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-3">
                      {pay.razorpay_payment_id || pay.transaction_ref ? (
                        <span className="block max-w-[160px] truncate rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-amber-300">
                          {pay.razorpay_payment_id || pay.transaction_ref}
                        </span>
                      ) : (
                        <span className="text-xs italic text-zinc-500">—</span>
                      )}
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {pay.paid_at
                          ? `Paid ${new Date(pay.paid_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                              timeZone: 'Asia/Kolkata',
                            })}`
                          : pay.notes || 'No remarks'}
                      </p>
                    </td>

                    <td className="py-4 px-3">
                      <PaymentBadge status={pay.status} />
                    </td>

                    <td className="py-4 pl-3 pr-5 text-right">
                      {canVerifyPayment ? (
                        <button
                          type="button"
                          onClick={() => openReconcileModal(pay)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-emerald-500/50 hover:text-emerald-300"
                        >
                          <PencilSimple size={14} />
                          <span>{isOnlinePayment(pay) ? 'Refund' : 'Reconcile'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">Locked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
