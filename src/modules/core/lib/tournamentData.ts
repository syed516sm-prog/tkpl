import type {
  AdminRole,
  AdminSession,
  AuditLogEntry,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PlayerRecord,
  ReceiptPayload,
  RegistrationFormInput,
  SafeStatusLookupResult,
  TournamentSettings,
} from '../types/tkpl';
import { normalizeIndianPhone } from './validation';
import type { SupabaseBackend } from './supabaseBackend';

/**
 * All Supabase reads/writes for the tournament, kept out of the React provider
 * so the exact network calls (upload -> RPC -> mapping) can be tested.
 */

export interface RegistrationSubmitResponse {
  player_id: string;
  registration_no: string;
  full_name: string;
  payment_status: PaymentStatus;
  created_at: string;
}

const ERROR_MESSAGES: Array<[RegExp, string]> = [
  [
    /DUPLICATE_PHONE/i,
    'A registration already exists with this mobile number. Use the Check Status page with your Registration ID and Date of Birth.',
  ],
  [/REGISTRATIONS_CLOSED/i, 'Player registrations are currently closed by the tournament organizers.'],
  [/DEADLINE_PASSED/i, 'The registration deadline for this TKPL season has passed.'],
  [/AGE_NOT_ELIGIBLE/i, 'Your age is outside the eligible range for this TKPL season.'],
  [/INVALID_PHONE/i, 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.'],
  [/INVALID_DOB/i, 'Date of birth is required to verify age eligibility.'],
  [/PHOTO_REQUIRED/i, 'A clear player photograph is required.'],
  [/RULES_NOT_ACCEPTED/i, 'You must accept the official TKPL tournament rules.'],
  [/NOT_FOUND|PGRST116/i, 'Could not verify the Registration Number, Mobile Number and Date of Birth.'],
  [/ALREADY_PAID/i, 'This registration fee is already paid.'],
  [/row-level security|permission denied/i, 'Your account is not permitted to make this change.'],
];

/** Map a Postgres/Supabase error to copy a player can act on. */
export function mapRegistrationError(error: unknown): Error {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Unable to complete the request.';
  for (const [pattern, message] of ERROR_MESSAGES) {
    if (pattern.test(raw)) return new Error(message);
  }
  if (raw === 'Failed to fetch' || /network|load failed/i.test(raw)) {
    return new Error('Could not reach the server. Check your internet connection and retry.');
  }
  return new Error(raw);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('Could not read the selected photograph. Please choose the image again.');
  }
  const mime = match[1] || 'image/jpeg';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';
  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], { type: mime });
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function photoExtension(fileName: string, mime: string): string {
  const fromName = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function createUuid(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

const PAYMENT_COLUMNS =
  'id, player_id, amount_paise, currency, method, transaction_ref, receipt_path, status, verified_by, verifier_name, verified_at, refund_ref, notes, razorpay_order_id, razorpay_payment_id, receipt_no, paid_at, receipt_issued_at, razorpay_handler, razorpay_mode, created_at, updated_at';

const PLAYER_COLUMNS =
  'id, registration_no, full_name, phone, date_of_birth, locality, role, batting_hand, bowling_style, experience, emergency_contact, photo_path, registration_status, auction_status, review_notes, rules_acknowledged, marketing_consent, consent_at, created_at, updated_at';

const SETTINGS_COLUMNS =
  'id, tournament_name, organizer_line, partner_line, season, fee_paise, currency, upi_id, registration_open, deadline, min_age, max_age, rules_text, refund_policy, privacy_notice, contact_text, updated_by, updated_at';

function playableRole(value: unknown): PlayerRecord['role'] {
  const allowed: PlayerRecord['role'][] = ['batter', 'bowler', 'all_rounder', 'wicketkeeper'];
  return allowed.includes(value as PlayerRecord['role'])
    ? (value as PlayerRecord['role'])
    : 'all_rounder';
}

function mapPlayerRow(row: Record<string, unknown>, photoUrl?: string | null): PlayerRecord {
  return {
    id: String(row.id),
    registration_no: String(row.registration_no ?? ''),
    full_name: String(row.full_name ?? ''),
    phone: String(row.phone ?? ''),
    date_of_birth: String(row.date_of_birth ?? ''),
    locality: String(row.locality ?? ''),
    role: playableRole(row.role),
    batting_hand: (row.batting_hand as PlayerRecord['batting_hand']) ?? 'right_hand',
    bowling_style: (row.bowling_style as PlayerRecord['bowling_style']) ?? 'none',
    experience: String(row.experience ?? ''),
    emergency_contact: String(row.emergency_contact ?? ''),
    photo_url: photoUrl ?? String(row.photo_path ?? ''),
    photo_file_name: String(row.photo_path ?? '').split('/').pop() ?? '',
    registration_status:
      (row.registration_status as PlayerRecord['registration_status']) ?? 'submitted',
    auction_status: (row.auction_status as PlayerRecord['auction_status']) ?? 'not_reviewed',
    review_notes: String(row.review_notes ?? ''),
    rules_acknowledged: Boolean(row.rules_acknowledged),
    marketing_consent: Boolean(row.marketing_consent),
    consent_at: String(row.consent_at ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function mapPaymentRow(row: Record<string, unknown>, playerName = '', playerPhone = ''): PaymentRecord {
  return {
    id: String(row.id),
    player_id: String(row.player_id),
    registration_no: '',
    player_name: playerName,
    player_phone: playerPhone,
    amount_paise: Number(row.amount_paise ?? 0),
    currency: String(row.currency ?? 'INR'),
    method: (row.method as PaymentMethod) ?? 'upi',
    transaction_ref: String(row.transaction_ref ?? ''),
    receipt_file_name: String(row.receipt_path ?? ''),
    status: (row.status as PaymentStatus) ?? 'pending',
    verified_by: row.verified_by ? String(row.verified_by) : null,
    verifier_name: String(row.verifier_name ?? ''),
    verified_at: row.verified_at ? String(row.verified_at) : null,
    refund_ref: String(row.refund_ref ?? ''),
    notes: String(row.notes ?? ''),
    razorpay_order_id: String(row.razorpay_order_id ?? ''),
    razorpay_payment_id: String(row.razorpay_payment_id ?? ''),
    receipt_no: String(row.receipt_no ?? ''),
    paid_at: row.paid_at ? String(row.paid_at) : null,
    receipt_issued_at: row.receipt_issued_at ? String(row.receipt_issued_at) : null,
    razorpay_handler: String(row.razorpay_handler ?? ''),
    razorpay_mode: String(row.razorpay_mode ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function mapReceipt(value: unknown, supabase?: SupabaseBackend): ReceiptPayload | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!row.receipt_no) return null;

  let photoUrl: string | null = null;
  const rawPhoto = (row.photo_url || row.photo_path) as string | null | undefined;
  if (rawPhoto && typeof rawPhoto === 'string') {
    const trimmed = rawPhoto.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      photoUrl = trimmed;
    } else if (supabase && typeof supabase.storage?.from === 'function') {
      try {
        const pub = supabase.storage.from('player-photos').getPublicUrl(trimmed);
        if (pub?.data?.publicUrl) {
          photoUrl = pub.data.publicUrl;
        }
      } catch {
        photoUrl = trimmed;
      }
    }
  }

  return {
    registration_no: String(row.registration_no ?? ''),
    full_name: String(row.full_name ?? ''),
    locality: String(row.locality ?? ''),
    role: playableRole(row.role),
    photo_url: photoUrl,
    amount_paise: Number(row.amount_paise ?? 0),
    currency: String(row.currency ?? 'INR'),
    receipt_no: String(row.receipt_no),
    paid_at: row.paid_at ? String(row.paid_at) : null,
    razorpay_payment_id: String(row.razorpay_payment_id ?? ''),
    razorpay_handler: String(row.razorpay_handler ?? ''),
    razorpay_mode: String(row.razorpay_mode ?? ''),
    status: (row.status as PaymentStatus) ?? 'verified',
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
  };
}

async function signedPhotoUrl(
  supabase: SupabaseBackend,
  photoPath: string
): Promise<string | null> {
  if (!photoPath) return null;
  const { data } = await supabase.storage.from('player-photos').createSignedUrl(photoPath, 3600);
  return data?.signedUrl ?? null;
}

export async function fetchTournamentSettings(
  supabase: SupabaseBackend
): Promise<TournamentSettings | null> {
  const { data, error } = await supabase
    .from('tournament_settings')
    .select(SETTINGS_COLUMNS)
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(row as unknown as TournamentSettings),
    fee_paise: Number(row.fee_paise ?? 0),
    registration_open: Boolean(row.registration_open),
  };
}

export interface PublicTournamentStats {
  registered_count: number;
  confirmed_count: number;
  auction_eligible_count: number;
}

export async function fetchPublicStats(
  supabase?: SupabaseBackend | null
): Promise<PublicTournamentStats | null> {
  // 1. First try direct Supabase RPC (fast, directly reaches cloud, avoids proxy on localhost)
  if (supabase && typeof supabase.rpc === 'function') {
    try {
      const { data, error } = await supabase.rpc('get_public_stats');
      if (!error && data && typeof data === 'object') {
        const row = data as Record<string, unknown>;
        const registered = Number(row.registered_count ?? 0);
        const confirmed = Number(row.confirmed_count ?? row.auction_eligible_count ?? registered);
        const eligible = Number(row.auction_eligible_count ?? confirmed);
        return {
          registered_count: registered,
          confirmed_count: confirmed,
          auction_eligible_count: eligible,
        };
      }
    } catch {
      // Fall through to serverless endpoint
    }
  }

  // 2. Fallback: try serverless endpoint
  try {
    const res = await fetch('/api/public-stats', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const payload = await res.json();
      if (payload && typeof payload === 'object') {
        const registered = Number(payload.registered_count ?? 0);
        const confirmed = Number(payload.confirmed_count ?? payload.auction_eligible_count ?? registered);
        const eligible = Number(payload.auction_eligible_count ?? confirmed);
        return {
          registered_count: registered,
          confirmed_count: confirmed,
          auction_eligible_count: eligible,
        };
      }
    }
  } catch {
    // Ignore server error (e.g. offline dev without vercel dev)
  }

  return null;
}

export interface AdminDataBundle {
  players: PlayerRecord[];
  payments: PaymentRecord[];
  auditLogs: AuditLogEntry[];
}

/**
 * Admin reads. RLS already limits rows to signed-in organizers; the browser
 * session is clearly local-only (see AdminLayout), so the anon key is used and
 * the policies answer with an empty list when nobody is authorised.
 */
export async function fetchAdminData(supabase: SupabaseBackend): Promise<AdminDataBundle> {
  const [playersRes, paymentsRes, auditRes] = await Promise.all([
    supabase.from('players').select(PLAYER_COLUMNS).order('created_at', { ascending: false }),
    supabase.from('payments').select(PAYMENT_COLUMNS).order('created_at', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, old_values, new_values, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const playerRows = (playersRes.data ?? []) as Record<string, unknown>[];
  const paymentRows = (paymentsRes.data ?? []) as Record<string, unknown>[];
  const auditRows = (auditRes.data ?? []) as Record<string, unknown>[];

  const playerById = new Map<string, { name: string; phone: string; regNo: string }>();
  const players = playerRows.map((row) => {
    const mapped = mapPlayerRow(row);
    playerById.set(mapped.id, {
      name: mapped.full_name,
      phone: mapped.phone,
      regNo: mapped.registration_no,
    });
    return mapped;
  });

  const payments = paymentRows.map((row) => {
    const owner = playerById.get(String(row.player_id));
    const mapped = mapPaymentRow(row, owner?.name ?? '', owner?.phone ?? '');
    return { ...mapped, registration_no: owner?.regNo ?? '' };
  });

  // Photos are private: sign each one for 1 hour so the roster thumbnails work.
  await Promise.all(
    playerRows.map(async (row, index) => {
      const path = String(row.photo_path ?? '');
      if (!path) return;
      const url = await signedPhotoUrl(supabase, path);
      if (url) players[index] = { ...players[index], photo_url: url };
    })
  );

  const auditLogs: AuditLogEntry[] = auditRows.map((row) => ({
    id: String(row.id),
    actor_user_id: String(row.actor_user_id ?? ''),
    actor_name: String(row.actor_name ?? ''),
    actor_role: (row.actor_role as AuditLogEntry['actor_role']) ?? 'system',
    action: String(row.action ?? ''),
    entity_type: (row.entity_type as AuditLogEntry['entity_type']) ?? 'payment',
    entity_id: String(row.entity_id ?? ''),
    summary:
      typeof row.new_values === 'object' && row.new_values !== null
        ? String(
            (row.new_values as Record<string, unknown>).summary ??
              (row.new_values as Record<string, unknown>).status ??
              ''
          )
        : '',
    old_values: (row.old_values as Record<string, unknown> | null) ?? undefined,
    new_values: (row.new_values as Record<string, unknown> | null) ?? undefined,
    created_at: String(row.created_at ?? ''),
  }));

  return { players, payments, auditLogs };
}

export async function signInAdminWithPassword(
  supabase: SupabaseBackend,
  email: string,
  pass: string
): Promise<AdminSession> {
  if (!supabase.auth) {
    throw new Error('Supabase authentication is not configured in this environment.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  });

  if (authError || !authData?.user) {
    throw new Error(authError?.message || 'Invalid email or password.');
  }

  const user = authData.user;
  const { data: adminRow, error: profileError } = await supabase
    .from('admin_users')
    .select('user_id, email, full_name, role, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !adminRow || !adminRow.active) {
    await supabase.auth.signOut();
    throw new Error(
      'Access Denied: This account is not listed or active as an authorized TKPL organizer in the database.'
    );
  }

  return {
    user_id: String(adminRow.user_id),
    email: String(adminRow.email || user.email || cleanEmail),
    full_name: String(adminRow.full_name || 'Tournament Organizer'),
    role: adminRow.role as AdminRole,
  };
}

export async function getCurrentAdminSession(
  supabase: SupabaseBackend
): Promise<AdminSession | null> {
  if (!supabase.auth) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data: adminRow, error } = await supabase
      .from('admin_users')
      .select('user_id, email, full_name, role, active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !adminRow || !adminRow.active) {
      return null;
    }

    return {
      user_id: String(adminRow.user_id),
      email: String(adminRow.email || user.email || ''),
      full_name: String(adminRow.full_name || 'Tournament Organizer'),
      role: adminRow.role as AdminRole,
    };
  } catch {
    return null;
  }
}

export async function signOutAdmin(supabase: SupabaseBackend): Promise<void> {
  if (supabase.auth) {
    await supabase.auth.signOut();
  }
}

export async function submitRegistration(
  supabase: SupabaseBackend,
  input: RegistrationFormInput
): Promise<RegistrationSubmitResponse> {
  const fileName = input.photo_file_name || 'player-photo.jpg';
  const blob = dataUrlToBlob(input.photo_data_url);
  const type = blob.type || 'image/jpeg';
  const path = `registrations/${createUuid()}.${photoExtension(fileName, type)}`;

  const upload = await supabase.storage.from('player-photos').upload(path, blob, {
    contentType: type,
    upsert: false,
  });
  if (upload.error) {
    throw new Error(
      'Your photograph could not be uploaded. Your form is still filled in — check your connection and press Save Details again.'
    );
  }

  const { data, error } = await supabase.rpc('submit_player_registration', {
    p_full_name: input.full_name.trim(),
    p_phone: normalizeIndianPhone(input.phone),
    p_date_of_birth: input.date_of_birth,
    p_locality: input.locality.trim(),
    p_role: input.role,
    p_batting_hand: input.batting_hand,
    p_bowling_style: input.bowling_style,
    p_experience: input.experience.trim(),
    p_emergency_contact: input.emergency_contact
      ? normalizeIndianPhone(input.emergency_contact)
      : '',
    p_photo_path: path,
    p_rules_acknowledged: input.rules_acknowledged,
    p_marketing_consent: input.marketing_consent,
    // Legacy parameters are kept by the RPC for old callers but ignored
    // (online payment only). Sending explicit defaults keeps retries identical.
    p_payment_method: 'razorpay',
    p_transaction_ref: '',
  });

  if (error) throw mapRegistrationError(error);
  const result = (data ?? {}) as Record<string, unknown>;
  if (!result.registration_no) {
    throw new Error('The registration was not saved. Please retry.');
  }

  return {
    player_id: String(result.player_id ?? ''),
    registration_no: String(result.registration_no),
    full_name: String(result.full_name ?? input.full_name.trim()),
    payment_status: (result.payment_status as PaymentStatus) ?? 'pending',
    created_at: String(result.created_at ?? new Date().toISOString()),
  };
}

export async function lookupStatus(
  supabase: SupabaseBackend,
  registrationNo: string,
  phone: string,
  dateOfBirth: string
): Promise<SafeStatusLookupResult | null> {
  const cleanReg = registrationNo.trim().toUpperCase();
  const cleanPhone = normalizeIndianPhone(phone);
  const cleanDob = dateOfBirth.trim();
  if (!cleanReg || !cleanPhone || !cleanDob) return null;

  const { data, error } = await supabase.rpc('lookup_registration_status', {
    p_registration_no: cleanReg,
    p_phone: cleanPhone,
    p_date_of_birth: cleanDob,
  });
  if (error) throw mapRegistrationError(error);
  if (!data || typeof data !== 'object') return null;

  const row = data as Record<string, unknown>;
  let photoUrl: string | null = null;
  const rawPhoto = (row.photo_url || row.photo_path) as string | null | undefined;
  if (rawPhoto && typeof rawPhoto === 'string') {
    const trimmed = rawPhoto.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      photoUrl = trimmed;
    } else if (typeof supabase.storage?.from === 'function') {
      try {
        const pub = supabase.storage.from('player-photos').getPublicUrl(trimmed);
        if (pub?.data?.publicUrl) {
          photoUrl = pub.data.publicUrl;
        }
      } catch {
        photoUrl = trimmed;
      }
    }
  }

  return {
    registration_no: String(row.registration_no ?? ''),
    full_name: String(row.full_name ?? ''),
    locality: String(row.locality ?? ''),
    role: playableRole(row.role),
    photo_url: photoUrl,
    registration_status:
      (row.registration_status as SafeStatusLookupResult['registration_status']) ?? 'submitted',
    auction_status:
      (row.auction_status as SafeStatusLookupResult['auction_status']) ?? 'not_reviewed',
    review_notes: String(row.review_notes ?? ''),
    payment_status: (row.payment_status as PaymentStatus) ?? 'pending',
    transaction_ref: String(row.transaction_ref ?? ''),
    submitted_at: String(row.submitted_at ?? ''),
  };
}

export async function findRegistrationByPhoneDob(
  supabase: SupabaseBackend,
  phone: string,
  dateOfBirth: string
): Promise<{ registration_no: string; full_name: string } | null> {
  const cleanPhone = normalizeIndianPhone(phone);
  const cleanDob = dateOfBirth.trim();
  if (!cleanPhone || !cleanDob) return null;

  try {
    const { data, error } = await supabase.rpc('find_registration_by_phone_dob', {
      p_phone: cleanPhone,
      p_date_of_birth: cleanDob,
    });
    if (error || !data || typeof data !== 'object') return null;
    const row = data as Record<string, unknown>;
    if (!row.registration_no) return null;
    return {
      registration_no: String(row.registration_no),
      full_name: String(row.full_name ?? ''),
    };
  } catch {
    return null;
  }
}

export async function getReceipt(
  supabase: SupabaseBackend,
  registrationNo: string,
  phone: string,
  dateOfBirth: string
): Promise<ReceiptPayload | null> {
  const cleanReg = registrationNo.trim().toUpperCase();
  const cleanPhone = normalizeIndianPhone(phone);
  const cleanDob = dateOfBirth.trim();
  if (!cleanReg || !cleanPhone || !cleanDob) return null;

  // 1. Try server endpoint first (resolves photo directly using service role)
  try {
    const res = await fetch('/api/razorpay/get-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_no: cleanReg,
        phone: cleanPhone,
        date_of_birth: cleanDob,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.receipt) {
        return mapReceipt(json.receipt, supabase);
      }
    }
  } catch {
    // API endpoint not reachable (e.g. offline dev or unit test); fall through
  }

  // 2. Direct Supabase RPC fallback
  const { data, error } = await supabase.rpc('get_receipt', {
    p_registration_no: cleanReg,
    p_phone: cleanPhone,
    p_date_of_birth: cleanDob,
  });
  if (error || !data) return null;
  return mapReceipt(data, supabase);
}

export async function updatePlayerReview(
  supabase: SupabaseBackend,
  params: {
    playerId: string;
    registrationStatus: PlayerRecord['registration_status'];
    auctionStatus: PlayerRecord['auction_status'];
    reviewNotes: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update({
      registration_status: params.registrationStatus,
      auction_status: params.auctionStatus,
      review_notes: params.reviewNotes.trim(),
    })
    .eq('id', params.playerId);
  if (error) throw mapRegistrationError(error);
}

export async function updatePayment(
  supabase: SupabaseBackend,
  params: {
    paymentId: string;
    status: PaymentStatus;
    method: PaymentMethod;
    transactionRef: string;
    refundRef: string;
    notes: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: params.status,
      method: params.method,
      transaction_ref: params.transactionRef.trim(),
      refund_ref: params.refundRef,
      notes: params.notes.trim(),
    })
    .eq('id', params.paymentId);
  if (error) throw mapRegistrationError(error);
}

export async function updateSettings(
  supabase: SupabaseBackend,
  updates: Partial<TournamentSettings>
): Promise<void> {
  const { updated_by, updated_at, id, ...payload } = updates as Record<string, unknown>;
  void updated_by;
  void updated_at;
  void id;
  const { error } = await supabase.from('tournament_settings').update(payload).eq('id', 1);
  if (error) throw mapRegistrationError(error);
}

export async function recordExportAudit(
  supabase: SupabaseBackend,
  kind: 'all_players' | 'auction_eligible' | 'payments',
  count: number
): Promise<void> {
  await supabase.rpc('log_export', { p_kind: kind, p_count: count });
}
