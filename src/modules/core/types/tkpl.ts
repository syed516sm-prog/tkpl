export type PlayingRole = 'batter' | 'bowler' | 'all_rounder' | 'wicketkeeper';

export type BattingHand = 'right_hand' | 'left_hand';

export type BowlingStyle =
  | 'right_arm_pace'
  | 'right_arm_spin'
  | 'left_arm_pace'
  | 'left_arm_spin'
  | 'none';

export type RegistrationStatus =
  | 'submitted'
  | 'under_review'
  | 'needs_correction'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type PaymentStatus =
  | 'pending'
  | 'submitted'
  | 'verified'
  | 'failed'
  | 'refunded';

export type PaymentMethod = 'razorpay' | 'upi' | 'bank_transfer' | 'cash_organizer';

export type AuctionStatus =
  | 'not_reviewed'
  | 'eligible'
  | 'ineligible'
  | 'drafted';

export type AdminRole =
  | 'super_admin'
  | 'registration_reviewer'
  | 'payment_verifier'
  | 'read_only_helper';

export interface PlayerRecord {
  id: string;
  registration_no: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  locality: string;
  role: PlayingRole;
  batting_hand: BattingHand;
  bowling_style: BowlingStyle;
  experience: string;
  emergency_contact: string;
  photo_url: string;
  photo_file_name: string;
  registration_status: RegistrationStatus;
  auction_status: AuctionStatus;
  review_notes: string;
  rules_acknowledged: boolean;
  marketing_consent: boolean;
  consent_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  player_id: string;
  registration_no: string;
  player_name: string;
  player_phone: string;
  amount_paise: number;
  currency: string;
  method: PaymentMethod;
  transaction_ref: string;
  receipt_file_name: string;
  status: PaymentStatus;
  verified_by: string | null;
  verifier_name: string;
  verified_at: string | null;
  refund_ref: string;
  notes: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  receipt_no: string;
  paid_at: string | null;
  receipt_issued_at: string | null;
  razorpay_handler: string;
  razorpay_mode: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentSettings {
  id: number;
  tournament_name: string;
  organizer_line: string;
  partner_line: string;
  season: string;
  fee_paise: number;
  currency: string;
  upi_id: string;
  registration_open: boolean;
  deadline: string;
  min_age: number;
  max_age: number;
  rules_text: string;
  refund_policy: string;
  privacy_notice: string;
  contact_text: string;
  updated_by: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: AdminRole | 'system' | 'applicant';
  action: string;
  entity_type: 'player' | 'payment' | 'settings' | 'export';
  entity_id: string;
  summary: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

export interface AdminSession {
  user_id: string;
  email: string;
  full_name: string;
  role: AdminRole;
}

export interface RegistrationFormInput {
  full_name: string;
  phone: string;
  date_of_birth: string;
  locality: string;
  role: PlayingRole;
  batting_hand: BattingHand;
  bowling_style: BowlingStyle;
  experience: string;
  emergency_contact: string;
  photo_data_url: string;
  photo_file_name: string;
  rules_acknowledged: boolean;
  marketing_consent: boolean;
  /** @deprecated fees are paid online; kept only for older callers. */
  payment_method?: PaymentMethod;
  /** @deprecated fees are paid online; kept only for older callers. */
  transaction_ref?: string;
}

/** Everything the receipt card needs. Rendered client-side only, never a file URL. */
export interface ReceiptPayload {
  registration_no: string;
  full_name: string;
  locality: string;
  role: PlayingRole;
  photo_url: string | null;
  amount_paise: number;
  currency: string;
  receipt_no: string;
  paid_at: string | null;
  razorpay_payment_id: string;
  razorpay_handler: string;
  razorpay_mode: string;
  status: PaymentStatus;
  submitted_at: string | null;
}

export interface SafeStatusLookupResult {
  registration_no: string;
  full_name: string;
  locality: string;
  role: PlayingRole;
  registration_status: RegistrationStatus;
  auction_status: AuctionStatus;
  review_notes: string;
  payment_status: PaymentStatus;
  transaction_ref: string;
  submitted_at: string;
}
