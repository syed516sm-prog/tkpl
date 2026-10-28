import React from 'react';
import type {
  AuctionStatus,
  PaymentMethod,
  PaymentStatus,
  PlayingRole,
  RegistrationStatus,
} from '../types/tkpl';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  razorpay: 'Razorpay (Online)',
  upi: 'UPI Transfer',
  bank_transfer: 'Bank Transfer',
  cash_organizer: 'Cash to Organizer',
};

export function paymentMethodLabel(method: PaymentMethod | string | null | undefined): string {
  if (!method) return 'Unknown';
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method.replace(/_/g, ' ');
}

const REGISTRATION_STYLES: Record<RegistrationStatus, { label: string; classes: string }> = {
  submitted: {
    label: 'Submitted',
    classes: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  under_review: {
    label: 'Under Review',
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  needs_correction: {
    label: 'Needs Correction',
    classes: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  approved: {
    label: 'Approved',
    classes: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    classes: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
  },
  withdrawn: {
    label: 'Withdrawn',
    classes: 'border-zinc-700 bg-zinc-800/80 text-zinc-400',
  },
};

const PAYMENT_STYLES: Record<PaymentStatus, { label: string; classes: string }> = {
  pending: {
    label: 'Payment Pending',
    classes: 'border-zinc-700 bg-zinc-800/80 text-zinc-300',
  },
  submitted: {
    label: 'Ref Submitted (Legacy)',
    classes: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
  },
  verified: {
    label: 'Payment Verified',
    classes: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
  },
  failed: {
    label: 'Failed / Unmatched',
    classes: 'border-rose-500/35 bg-rose-500/15 text-rose-300',
  },
  refunded: {
    label: 'Refunded',
    classes: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  },
};

const AUCTION_STYLES: Record<AuctionStatus, { label: string; classes: string }> = {
  not_reviewed: {
    label: 'Not in Pool Yet',
    classes: 'border-zinc-700 bg-zinc-800/80 text-zinc-400',
  },
  eligible: {
    label: 'Auction Eligible',
    classes: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
  },
  ineligible: {
    label: 'Ineligible',
    classes: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  },
  drafted: {
    label: 'Drafted to Team',
    classes: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
  },
};

const ROLE_LABELS: Record<PlayingRole, string> = {
  batter: 'Batter',
  bowler: 'Bowler',
  all_rounder: 'All-Rounder',
  wicketkeeper: 'Wicketkeeper',
};

export const RegistrationBadge: React.FC<{ status: RegistrationStatus }> = ({ status }) => {
  const cfg = REGISTRATION_STYLES[status] ?? REGISTRATION_STYLES.submitted;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
};

export const PaymentBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const cfg = PAYMENT_STYLES[status] ?? PAYMENT_STYLES.pending;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
};

export const AuctionBadge: React.FC<{ status: AuctionStatus }> = ({ status }) => {
  const cfg = AUCTION_STYLES[status] ?? AUCTION_STYLES.not_reviewed;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
};

export const RoleLabel: React.FC<{ role: PlayingRole }> = ({ role }) => {
  return (
    <span className="inline-flex items-center rounded-md border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-xs font-medium text-zinc-200">
      {ROLE_LABELS[role] ?? role}
    </span>
  );
};
