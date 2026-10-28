import type {
  AdminRole,
  PaymentRecord,
  PlayerRecord,
  RegistrationFormInput,
  TournamentSettings,
} from '../types/tkpl';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function normalizeIndianPhone(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

export function isValidIndianMobile(phone: string): boolean {
  const normalized = normalizeIndianPhone(phone);
  return /^[6-9][0-9]{9}$/.test(normalized);
}

export function calculateAgeYears(dobIso: string, nowDate: Date = new Date()): number {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) {
    return -1;
  }
  let age = nowDate.getFullYear() - dob.getFullYear();
  const monthDiff = nowDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && nowDate.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePhotoFile(file: { type: string; size: number; name: string } | null | undefined): PhotoValidationResult {
  if (!file) {
    return { valid: false, error: 'Player photograph is required for auction profile verification.' };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported photo format. Please upload a JPEG, PNG or WebP image.',
    };
  }
  if (file.size <= 0) {
    return { valid: false, error: 'Uploaded image file is empty.' };
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Photo exceeds the 5 MB limit. Please choose a smaller photograph.',
    };
  }
  return { valid: true };
}

export function validateRegistrationForm(
  input: RegistrationFormInput,
  settings: TournamentSettings,
  nowDate: Date = new Date()
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!settings.registration_open) {
    errors.form = 'Player registrations are currently closed by the tournament organizers.';
  } else if (nowDate.getTime() > new Date(settings.deadline).getTime()) {
    errors.form = 'The registration deadline for this TKPL season has passed.';
  }

  if (!input.full_name || input.full_name.trim().length < 3) {
    errors.full_name = 'Enter your full name (at least 3 characters) as it should appear on the roster.';
  }

  if (!isValidIndianMobile(input.phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.';
  }

  if (!input.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required to verify age eligibility.';
  } else {
    const age = calculateAgeYears(input.date_of_birth, nowDate);
    if (age < settings.min_age || age > settings.max_age) {
      errors.date_of_birth = `Players must be between ${settings.min_age} and ${settings.max_age} years old.`;
    }
  }

  if (!input.locality || input.locality.trim().length < 2) {
    errors.locality = 'Enter your locality, ward or town name (for example Kadapa, Proddatur, Rayachoti).';
  }

  if (!input.photo_data_url || !input.photo_file_name) {
    errors.photo = 'Please upload a clear front-facing player photograph.';
  }

  if (input.emergency_contact && input.emergency_contact.trim() !== '') {
    if (!isValidIndianMobile(input.emergency_contact)) {
      errors.emergency_contact = 'Emergency contact must be a valid 10-digit mobile number.';
    }
  }

  if (!input.rules_acknowledged) {
    errors.rules_acknowledged = 'You must read and accept the official TKPL tournament rules and privacy notice.';
  }

  return errors;
}

export type PrivilegedAction =
  | 'review_player'
  | 'verify_payment'
  | 'manage_settings'
  | 'export_csv'
  | 'view_audit'
  | 'view_full_phone';

export function canRolePerform(role: AdminRole | null | undefined, _action?: PrivilegedAction): boolean {
  return Boolean(role);
}

export function formatInrFromPaise(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function maskPhoneForReadOnly(phone: string, _role?: AdminRole | null | undefined): string {
  return phone;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? '').trim();
  // Prevent CSV formula injection in spreadsheet apps
  const safeStr = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (safeStr.includes(',') || safeStr.includes('"') || safeStr.includes('\n')) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }
  return safeStr;
}

export function buildSafePlayerRosterCsv(
  players: PlayerRecord[],
  payments: PaymentRecord[],
  options: { onlyAuctionEligible: boolean }
): string {
  const paymentByPlayerId = new Map<string, PaymentRecord>();
  for (const p of payments) {
    paymentByPlayerId.set(p.player_id, p);
  }

  const filtered = options.onlyAuctionEligible
    ? players.filter(
        (pl) =>
          pl.registration_status === 'approved' &&
          pl.auction_status === 'eligible' &&
          paymentByPlayerId.get(pl.id)?.status === 'verified'
      )
    : players;

  const headers = [
    'Registration No',
    'Full Name',
    'Mobile Number',
    'Date of Birth',
    'Locality / Town',
    'Playing Role',
    'Batting Hand',
    'Bowling Style',
    'Experience',
    'Registration Status',
    'Payment Status',
    'Transaction Ref',
    'Auction Status',
    'Submitted At (IST)',
  ];

  const rows = filtered.map((pl) => {
    const pay = paymentByPlayerId.get(pl.id);
    const istDate = new Date(pl.created_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    });
    return [
      pl.registration_no,
      pl.full_name,
      pl.phone,
      pl.date_of_birth,
      pl.locality,
      pl.role,
      pl.batting_hand,
      pl.bowling_style,
      pl.experience,
      pl.registration_status,
      pay?.status ?? 'pending',
      pay?.transaction_ref ?? '',
      pl.auction_status,
      istDate,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/** Columns that make up the payments export header row. */
export const PAYMENT_CSV_HEADERS = [
  'Receipt No',
  'Registration No',
  'Player Name',
  'Amount (INR)',
  'Razorpay Payment ID',
  'Payment Status',
  'Paid At (IST)',
] as const;

export function buildPaymentsCsv(payments: PaymentRecord[]): string {
  const rows = payments.map((pay) =>
    [
      pay.receipt_no,
      pay.registration_no,
      pay.player_name,
      Math.round(pay.amount_paise / 100),
      pay.razorpay_payment_id,
      pay.status,
      pay.paid_at
        ? new Date(pay.paid_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [[...PAYMENT_CSV_HEADERS].map(escapeCsvCell).join(','), ...rows].join('\n');
}
