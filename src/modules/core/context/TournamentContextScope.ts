import { createContext, useContext } from 'react';
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
import type { PublicTournamentStats, RegistrationSubmitResponse } from '../lib/tournamentData';

export type { PublicTournamentStats, RegistrationSubmitResponse };

export interface TournamentContextValue {
  settings: TournamentSettings;
  players: PlayerRecord[];
  payments: PaymentRecord[];
  auditLogs: AuditLogEntry[];
  adminSession: AdminSession | null;
  publicStats: PublicTournamentStats | null;
  isCloudConnected: boolean;
  refreshPublicStats: () => Promise<void>;
  loginAdmin: (roleOrName?: string, customName?: string) => void;
  loginAdminWithPassword: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void> | void;
  submitRegistration: (
    input: RegistrationFormInput,
    idempotencyKey: string
  ) => Promise<RegistrationSubmitResponse>;
  lookupStatus: (
    registrationNo: string,
    phone: string,
    dateOfBirth: string
  ) => Promise<SafeStatusLookupResult | null>;
  findRegistrationByPhoneDob: (
    phone: string,
    dateOfBirth: string
  ) => Promise<{ registration_no: string; full_name: string } | null>;
  getReceipt: (
    registrationNo: string,
    phone: string,
    dateOfBirth: string
  ) => Promise<ReceiptPayload | null>;
  updatePlayerReview: (params: {
    playerId: string;
    registrationStatus: RegistrationStatus;
    auctionStatus: AuctionStatus;
    reviewNotes: string;
  }) => Promise<void>;
  updatePaymentVerification: (params: {
    paymentId: string;
    status: PaymentStatus;
    method?: PaymentMethod;
    transactionRef: string;
    refundRef?: string;
    notes: string;
  }) => Promise<void>;
  updateTournamentSettings: (updates: Partial<TournamentSettings>) => Promise<void>;
  recordCsvExportAudit: (
    exportKind: 'all_players' | 'auction_eligible' | 'payments',
    count: number
  ) => Promise<void>;
  resetDemoDatabase: () => void;
}

export const TournamentContext = createContext<TournamentContextValue | undefined>(undefined);

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) {
    throw new Error('useTournament must be used inside a TournamentProvider');
  }
  return ctx;
}
