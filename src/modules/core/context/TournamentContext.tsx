import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AdminRole,
  AdminSession,
  AuctionStatus,
  AuditLogEntry,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PlayerRecord,
  ReceiptPayload,
  RegistrationFormInput,
  RegistrationStatus,
  SafeStatusLookupResult,
  TournamentSettings,
} from '../types/tkpl';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_PAYMENTS,
  INITIAL_PLAYERS,
  INITIAL_TOURNAMENT_SETTINGS,
} from '../lib/seedData';
import {
  canRolePerform,
  normalizeIndianPhone,
  validateRegistrationForm,
} from '../lib/validation';
import { createSupabaseBackend, readSupabaseConfig, type SupabaseBackend } from '../lib/supabaseBackend';
import * as data from '../lib/tournamentData';
import type { RegistrationSubmitResponse } from '../lib/tournamentData';
import { TournamentContext, useTournament, type TournamentContextValue } from './TournamentContextScope';

export { useTournament };
export type { RegistrationSubmitResponse, TournamentContextValue };

const STORAGE_KEYS = {
  SETTINGS: 'tkpl_v3_settings',
  PLAYERS: 'tkpl_v3_players',
  PAYMENTS: 'tkpl_v3_payments',
  AUDIT: 'tkpl_v3_audit_logs',
  SEQ: 'tkpl_v3_reg_seq',
  ADMIN: 'tkpl_v3_admin_session',
  IDEMPOTENCY: 'tkpl_v3_idempotency_keys',
};

const DEFAULT_ADMIN_PROFILE: AdminSession = {
  user_id: 'adm-lead',
  email: 'syed516.sm@gmail.com',
  full_name: 'Syed · Tournament Administrator',
  role: 'super_admin',
};

const ROLE_DEFAULT_PROFILES: Record<AdminRole, Omit<AdminSession, 'role'>> = {
  super_admin: {
    user_id: 'adm-lead',
    email: 'syed516.sm@gmail.com',
    full_name: 'Syed · Tournament Administrator',
  },
  registration_reviewer: {
    user_id: 'adm-lead',
    email: 'syed516.sm@gmail.com',
    full_name: 'Tournament Administrator',
  },
  payment_verifier: {
    user_id: 'adm-lead',
    email: 'syed516.sm@gmail.com',
    full_name: 'Tournament Administrator',
  },
  read_only_helper: {
    user_id: 'adm-lead',
    email: 'syed516.sm@gmail.com',
    full_name: 'Tournament Administrator',
  },
};

export interface TournamentProviderProps {
  children: React.ReactNode;
  /** Defaults to the `VITE_SUPABASE_*` env; tests inject a fake backend here. */
  supabase?: SupabaseBackend | null;
  /** Explicit cloud on/off. Defaults to "are the public keys present?". */
  isCloudMode?: boolean;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / restricted-environment errors.
  }
}

function isRazorpayPayment(payment: PaymentRecord | undefined): boolean {
  return payment?.method === 'razorpay';
}

/**
 * DEMO BRANCH (no Supabase keys): everything below runs on localStorage seeded
 * with the sample players so the UI can be previewed. Online payments are
 * rejected here because there is no server to verify them.
 */
export const TournamentProvider: React.FC<TournamentProviderProps> = ({
  children,
  supabase,
  isCloudMode,
}) => {
  const envConfig = useMemo(
    () =>
      readSupabaseConfig({
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      }),
    []
  );
  const fallbackClient = useMemo<SupabaseBackend | null>(() => {
    if (!envConfig.configured || !envConfig.url || !envConfig.anonKey) return null;
    return createSupabaseBackend(envConfig.url, envConfig.anonKey);
  }, [envConfig]);

  const client = supabase === undefined ? fallbackClient : supabase;
  const cloud = isCloudMode ?? Boolean(client);

  const [settings, setSettings] = useState<TournamentSettings>(() =>
    cloud ? INITIAL_TOURNAMENT_SETTINGS : loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_TOURNAMENT_SETTINGS)
  );
  const [players, setPlayers] = useState<PlayerRecord[]>(() =>
    cloud ? [] : loadFromStorage(STORAGE_KEYS.PLAYERS, INITIAL_PLAYERS)
  );
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    cloud ? [] : loadFromStorage(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    cloud ? [] : loadFromStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS)
  );
  const [seqCounter, setSeqCounter] = useState<number>(() =>
    loadFromStorage(STORAGE_KEYS.SEQ, 106)
  );
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() =>
    loadFromStorage<AdminSession | null>(STORAGE_KEYS.ADMIN, null)
  );
  const [processedKeys, setProcessedKeys] = useState<Record<string, RegistrationSubmitResponse>>(
    () => loadFromStorage(STORAGE_KEYS.IDEMPOTENCY, {})
  );

  useEffect(() => {
    if (cloud) return;
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [cloud, settings]);
  useEffect(() => {
    if (cloud) return;
    saveToStorage(STORAGE_KEYS.PLAYERS, players);
  }, [cloud, players]);
  useEffect(() => {
    if (cloud) return;
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
  }, [cloud, payments]);
  useEffect(() => {
    if (cloud) return;
    saveToStorage(STORAGE_KEYS.AUDIT, auditLogs);
  }, [cloud, auditLogs]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SEQ, seqCounter);
  }, [seqCounter]);
  useEffect(() => {
    try {
      if (adminSession) localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(adminSession));
      else localStorage.removeItem(STORAGE_KEYS.ADMIN);
    } catch {
      // Ignore
    }
  }, [adminSession]);
  useEffect(() => {
    if (cloud) return;
    saveToStorage(STORAGE_KEYS.IDEMPOTENCY, processedKeys);
  }, [cloud, processedKeys]);

  const refreshAdminData = useCallback(async () => {
    if (!client) return;
    const bundle = await data.fetchAdminData(client);
    setPlayers(bundle.players);
    setPayments(bundle.payments);
    setAuditLogs(bundle.auditLogs);
  }, [client]);

  // Public settings come from the one row everyone may read.
  useEffect(() => {
    let cancelled = false;
    if (!client) return;
    data
      .fetchTournamentSettings(client)
      .then((row) => {
        if (!cancelled && row) setSettings(row);
      })
      .catch(() => {
        // Keep the bundled defaults if settings cannot be read yet.
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const appendDemoAudit = useCallback((entry: Omit<AuditLogEntry, 'id' | 'created_at'>) => {
    setAuditLogs((prev) => [
      {
        ...entry,
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  useEffect(() => {
    if (!cloud || !client) return;
    let cancelled = false;
    data
      .getCurrentAdminSession(client)
      .then((session) => {
        if (!cancelled && session) {
          setAdminSession(session);
          void refreshAdminData();
        }
      })
      .catch(() => {
        // Ignore initial session restoration failure
      });
    return () => {
      cancelled = true;
    };
  }, [client, cloud, refreshAdminData]);

  const loginAdmin = useCallback(
    (roleOrName?: string, customName?: string) => {
      let displayName = DEFAULT_ADMIN_PROFILE.full_name;
      if (customName && customName.trim()) {
        displayName = customName.trim();
      } else if (
        roleOrName &&
        !['super_admin', 'registration_reviewer', 'payment_verifier', 'read_only_helper'].includes(
          roleOrName
        )
      ) {
        displayName = roleOrName.trim();
      }

      setAdminSession({
        ...DEFAULT_ADMIN_PROFILE,
        full_name: displayName,
      });
      if (client) {
        void refreshAdminData().catch(() => {});
      }
    },
    [client, refreshAdminData]
  );

  const loginAdminWithPassword = useCallback(
    async (email: string, pass: string) => {
      if (!client) {
        throw new Error('Supabase client is not configured.');
      }
      const session = await data.signInAdminWithPassword(client, email, pass);
      setAdminSession(session);
      await refreshAdminData();
    },
    [client, refreshAdminData]
  );

  const logoutAdmin = useCallback(async () => {
    if (client) {
      try {
        await data.signOutAdmin(client);
      } catch {
        // Ignore signout error
      }
    }
    setAdminSession(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.ADMIN);
    } catch {
      // Ignore storage error
    }
  }, [client]);

  const submitRegistration = useCallback(
    async (
      input: RegistrationFormInput,
      idempotencyKey: string
    ): Promise<RegistrationSubmitResponse> => {
      if (idempotencyKey && processedKeys[idempotencyKey]) {
        return processedKeys[idempotencyKey];
      }

      const validationErrors = validateRegistrationForm(input, settings);
      const firstError = Object.values(validationErrors)[0];
      if (firstError) throw new Error(firstError);

      if (cloud && client) {
        const result = await data.submitRegistration(client, input);
        const response: RegistrationSubmitResponse = result;
        if (idempotencyKey) {
          setProcessedKeys((prev) => ({ ...prev, [idempotencyKey]: response }));
        }
        return response;
      }

      // ---- demo branch (localStorage) ----
      const normalizedPhone = normalizeIndianPhone(input.phone);
      if (players.some((p) => normalizeIndianPhone(p.phone) === normalizedPhone)) {
        throw new Error(
          'A registration already exists with this mobile number. Use the Check Status page with your Registration ID and Date of Birth.'
        );
      }

      const nowIso = new Date().toISOString();
      const nextNum = seqCounter;
      setSeqCounter((n) => n + 1);

      const registrationNo = `TKPL-2026-${String(nextNum).padStart(4, '0')}`;
      const playerId = `plr-${Date.now()}`;

      const newPlayer: PlayerRecord = {
        id: playerId,
        registration_no: registrationNo,
        full_name: input.full_name.trim(),
        phone: normalizedPhone,
        date_of_birth: input.date_of_birth,
        locality: input.locality.trim(),
        role: input.role,
        batting_hand: input.batting_hand,
        bowling_style: input.bowling_style,
        experience: input.experience.trim(),
        emergency_contact: input.emergency_contact
          ? normalizeIndianPhone(input.emergency_contact)
          : '',
        photo_url: input.photo_data_url,
        photo_file_name: input.photo_file_name,
        registration_status: 'submitted',
        auction_status: 'not_reviewed',
        review_notes: '',
        rules_acknowledged: input.rules_acknowledged,
        marketing_consent: input.marketing_consent,
        consent_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const newPayment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        player_id: playerId,
        registration_no: registrationNo,
        player_name: newPlayer.full_name,
        player_phone: normalizedPhone,
        amount_paise: settings.fee_paise,
        currency: settings.currency,
        method: 'razorpay',
        transaction_ref: '',
        receipt_file_name: '',
        status: 'pending',
        verified_by: null,
        verifier_name: '',
        verified_at: null,
        refund_ref: '',
        notes: 'Demo mode: online payment is not available until Supabase and Razorpay are configured.',
        razorpay_order_id: '',
        razorpay_payment_id: '',
        receipt_no: '',
        paid_at: null,
        receipt_issued_at: null,
        razorpay_handler: '',
        razorpay_mode: '',
        created_at: nowIso,
        updated_at: nowIso,
      };

      setPlayers((prev) => [newPlayer, ...prev]);
      setPayments((prev) => [newPayment, ...prev]);

      appendDemoAudit({
        actor_user_id: 'public-applicant',
        actor_name: newPlayer.full_name,
        actor_role: 'applicant',
        action: 'REGISTRATION_SUBMITTED',
        entity_type: 'player',
        entity_id: registrationNo,
        summary: `New registration ${registrationNo} submitted (${newPlayer.locality}, ${newPlayer.role}). Payment pending.`,
        new_values: {
          registration_no: registrationNo,
          registration_status: 'submitted',
          payment_status: 'pending',
        },
      });

      const result: RegistrationSubmitResponse = {
        player_id: playerId,
        registration_no: registrationNo,
        full_name: newPlayer.full_name,
        payment_status: 'pending',
        created_at: nowIso,
      };

      if (idempotencyKey) {
        setProcessedKeys((prev) => ({ ...prev, [idempotencyKey]: result }));
      }
      return result;
    },
    [appendDemoAudit, client, cloud, players, processedKeys, seqCounter, settings]
  );

  const lookupStatus = useCallback(
    async (
      registrationNo: string,
      phone: string,
      dateOfBirth: string
    ): Promise<SafeStatusLookupResult | null> => {
      if (cloud && client) {
        return data.lookupStatus(client, registrationNo, phone, dateOfBirth);
      }

      const cleanReg = registrationNo.trim().toUpperCase();
      const cleanPhone = normalizeIndianPhone(phone);
      const cleanDob = dateOfBirth.trim();
      if (!cleanReg || !cleanPhone || !cleanDob) return null;

      const matchedPlayer = players.find(
        (p) =>
          p.registration_no.toUpperCase() === cleanReg &&
          normalizeIndianPhone(p.phone) === cleanPhone &&
          p.date_of_birth === cleanDob
      );
      if (!matchedPlayer) return null;

      const matchedPayment = payments.find((pay) => pay.player_id === matchedPlayer.id);
      return {
        registration_no: matchedPlayer.registration_no,
        full_name: matchedPlayer.full_name,
        locality: matchedPlayer.locality,
        role: matchedPlayer.role,
        registration_status: matchedPlayer.registration_status,
        auction_status: matchedPlayer.auction_status,
        review_notes: matchedPlayer.review_notes,
        payment_status: matchedPayment?.status ?? 'pending',
        transaction_ref: matchedPayment?.transaction_ref ?? '',
        submitted_at: matchedPlayer.created_at,
      };
    },
    [client, cloud, payments, players]
  );

  const getReceipt = useCallback(
    async (
      registrationNo: string,
      phone: string,
      dateOfBirth: string
    ): Promise<ReceiptPayload | null> => {
      if (cloud && client) {
        return data.getReceipt(client, registrationNo, phone, dateOfBirth);
      }

      const cleanReg = registrationNo.trim().toUpperCase();
      const cleanPhone = normalizeIndianPhone(phone);
      const cleanDob = dateOfBirth.trim();
      const matchedPlayer = players.find(
        (p) =>
          p.registration_no.toUpperCase() === cleanReg &&
          normalizeIndianPhone(p.phone) === cleanPhone &&
          p.date_of_birth === cleanDob
      );
      if (!matchedPlayer) return null;

      const matchedPayment = payments.find((pay) => pay.player_id === matchedPlayer.id);
      if (!matchedPayment || matchedPayment.status !== 'verified' || !matchedPayment.receipt_no) {
        return null;
      }
      return {
        registration_no: matchedPlayer.registration_no,
        full_name: matchedPlayer.full_name,
        locality: matchedPlayer.locality,
        role: matchedPlayer.role,
        photo_url: matchedPlayer.photo_url || null,
        amount_paise: matchedPayment.amount_paise,
        currency: matchedPayment.currency,
        receipt_no: matchedPayment.receipt_no,
        paid_at: matchedPayment.paid_at,
        razorpay_payment_id: matchedPayment.razorpay_payment_id,
        razorpay_handler: matchedPayment.razorpay_handler,
        razorpay_mode: matchedPayment.razorpay_mode,
        status: matchedPayment.status,
        submitted_at: matchedPlayer.created_at,
      };
    },
    [client, cloud, payments, players]
  );

  const updatePlayerReview = useCallback(
    async (params: {
      playerId: string;
      registrationStatus: RegistrationStatus;
      auctionStatus: AuctionStatus;
      reviewNotes: string;
    }) => {
      if (!adminSession) {
        throw new Error('Access denied: You must be signed in as an administrator.');
      }

      if (cloud && client) {
        await data.updatePlayerReview(client, params);
        await refreshAdminData();
        return;
      }

      const targetPlayer = players.find((p) => p.id === params.playerId);
      if (!targetPlayer) throw new Error('Player record not found.');

      const targetPayment = payments.find((pay) => pay.player_id === params.playerId);

      if (params.auctionStatus === 'eligible' || params.auctionStatus === 'drafted') {
        if (params.registrationStatus !== 'approved') {
          throw new Error(
            'A player must have Registration Status set to Approved before becoming Auction Eligible.'
          );
        }
        if (targetPayment?.status !== 'verified') {
          throw new Error(
            'A player cannot be marked Auction Eligible until their registration fee payment is Verified.'
          );
        }
      }

      const nowIso = new Date().toISOString();
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === params.playerId
            ? {
                ...p,
                registration_status: params.registrationStatus,
                auction_status: params.auctionStatus,
                review_notes: params.reviewNotes.trim(),
                updated_at: nowIso,
              }
            : p
        )
      );

      appendDemoAudit({
        actor_user_id: adminSession.user_id,
        actor_name: adminSession.full_name,
        actor_role: adminSession.role,
        action: 'PLAYER_REVIEW_UPDATED',
        entity_type: 'player',
        entity_id: targetPlayer.registration_no,
        summary: `Updated ${targetPlayer.full_name} (${targetPlayer.registration_no}): registration=${params.registrationStatus}, auction=${params.auctionStatus}.`,
        old_values: {
          registration_status: targetPlayer.registration_status,
          auction_status: targetPlayer.auction_status,
        },
        new_values: {
          registration_status: params.registrationStatus,
          auction_status: params.auctionStatus,
          review_notes: params.reviewNotes.trim(),
        },
      });
    },
    [adminSession, appendDemoAudit, client, cloud, payments, players, refreshAdminData]
  );

  const updatePaymentVerification = useCallback(
    async (params: {
      paymentId: string;
      status: PaymentStatus;
      method?: PaymentMethod;
      transactionRef: string;
      refundRef?: string;
      notes: string;
    }) => {
      if (!adminSession) {
        throw new Error('Access denied: You must be signed in as an administrator.');
      }

      const targetPayment = payments.find((pay) => pay.id === params.paymentId);
      if (!targetPayment) throw new Error('Payment record not found.');

      if (isRazorpayPayment(targetPayment) && params.status !== 'refunded') {
        throw new Error(
          'Online Razorpay payments are verified automatically by signature. They cannot be changed by hand.'
        );
      }

      const cleanTx = params.transactionRef.trim();
      if (params.status === 'verified' && cleanTx.length < 3) {
        throw new Error(
          'Cannot verify payment without recording a valid UPI UTR, bank reference or cash receipt number.'
        );
      }

      const cleanRefund = (params.refundRef ?? '').trim();
      if (params.status === 'refunded' && cleanRefund.length < 3) {
        throw new Error('Please provide a refund reference number when marking a payment as refunded.');
      }

      if (cloud && client) {
        await data.updatePayment(client, {
          paymentId: params.paymentId,
          status: params.status,
          method: params.method ?? targetPayment.method,
          transactionRef: cleanTx,
          refundRef: cleanRefund,
          notes: params.notes,
        });
        await refreshAdminData();
        return;
      }

      const nowIso = new Date().toISOString();
      setPayments((prev) =>
        prev.map((pay) =>
          pay.id === params.paymentId
            ? {
                ...pay,
                status: params.status,
                method: params.method ?? pay.method,
                transaction_ref: cleanTx,
                refund_ref: cleanRefund,
                notes: params.notes.trim(),
                verified_by: params.status === 'verified' ? adminSession.user_id : pay.verified_by,
                verifier_name:
                  params.status === 'verified' ? adminSession.full_name : pay.verifier_name,
                verified_at: params.status === 'verified' ? nowIso : pay.verified_at,
                updated_at: nowIso,
              }
            : pay
        )
      );

      if (params.status !== 'verified') {
        setPlayers((prev) =>
          prev.map((pl) =>
            pl.id === targetPayment.player_id && pl.auction_status === 'eligible'
              ? { ...pl, auction_status: 'not_reviewed', updated_at: nowIso }
              : pl
          )
        );
      }

      appendDemoAudit({
        actor_user_id: adminSession.user_id,
        actor_name: adminSession.full_name,
        actor_role: adminSession.role,
        action: `PAYMENT_${params.status.toUpperCase()}`,
        entity_type: 'payment',
        entity_id: targetPayment.registration_no,
        summary: `Payment for ${targetPayment.player_name} (${targetPayment.registration_no}) marked ${params.status} (Ref: ${cleanTx || 'N/A'}).`,
        old_values: {
          status: targetPayment.status,
          transaction_ref: targetPayment.transaction_ref,
        },
        new_values: {
          status: params.status,
          transaction_ref: cleanTx,
          refund_ref: cleanRefund,
          notes: params.notes.trim(),
        },
      });
    },
    [adminSession, appendDemoAudit, client, cloud, payments, refreshAdminData]
  );

  const updateTournamentSettings = useCallback(
    async (updates: Partial<TournamentSettings>) => {
      if (!adminSession) {
        throw new Error('Access denied: You must be signed in as an administrator.');
      }

      if (cloud && client) {
        await data.updateSettings(client, updates);
        const row = await data.fetchTournamentSettings(client);
        if (row) setSettings(row);
        return;
      }

      const nowIso = new Date().toISOString();
      setSettings((prev) => ({
        ...prev,
        ...updates,
        updated_by: adminSession.full_name,
        updated_at: nowIso,
      }));

      appendDemoAudit({
        actor_user_id: adminSession.user_id,
        actor_name: adminSession.full_name,
        actor_role: adminSession.role,
        action: 'SETTINGS_UPDATED',
        entity_type: 'settings',
        entity_id: 'tournament_settings_1',
        summary: `Updated tournament configuration (Registration open: ${updates.registration_open ?? settings.registration_open}, Fee paise: ${updates.fee_paise ?? settings.fee_paise}).`,
        old_values: {
          fee_paise: settings.fee_paise,
          registration_open: settings.registration_open,
          deadline: settings.deadline,
        },
        new_values: updates as Record<string, unknown>,
      });
    },
    [adminSession, appendDemoAudit, client, cloud, settings]
  );

  const recordCsvExportAudit = useCallback(
    async (exportKind: 'all_players' | 'auction_eligible' | 'payments', count: number) => {
      if (!adminSession) {
        throw new Error('Access denied: You must be signed in as an administrator to export data.');
      }
      if (cloud && client) {
        await data.recordExportAudit(client, exportKind, count);
        return;
      }
      appendDemoAudit({
        actor_user_id: adminSession.user_id,
        actor_name: adminSession.full_name,
        actor_role: adminSession.role,
        action: exportKind === 'payments' ? 'PAYMENTS_CSV_EXPORTED' : 'ROSTER_CSV_EXPORTED',
        entity_type: 'export',
        entity_id: exportKind,
        summary: `Exported ${count} records (${
          exportKind === 'auction_eligible'
            ? 'Auction-Eligible Pool Only'
            : exportKind === 'payments'
              ? 'Payment Ledger'
              : 'Full Roster CSV'
        }).`,
        new_values: { exportKind, count },
      });
    },
    [adminSession, appendDemoAudit, client, cloud]
  );

  const resetDemoDatabase = useCallback(() => {
    if (cloud) {
      throw new Error('Reset is only available in local demo mode; the cloud database is never wiped from the browser.');
    }
    setSettings(INITIAL_TOURNAMENT_SETTINGS);
    setPlayers(INITIAL_PLAYERS);
    setPayments(INITIAL_PAYMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSeqCounter(106);
    setProcessedKeys({});
  }, [cloud]);

  return (
    <TournamentContext.Provider
      value={{
        settings,
        players,
        payments,
        auditLogs,
        adminSession,
        isCloudConnected: cloud,
        loginAdmin,
        loginAdminWithPassword,
        logoutAdmin,
        submitRegistration,
        lookupStatus,
        getReceipt,
        updatePlayerReview,
        updatePaymentVerification,
        updateTournamentSettings,
        recordCsvExportAudit,
        resetDemoDatabase,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

