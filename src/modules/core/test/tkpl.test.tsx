import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { TournamentProvider, useTournament } from '../context/TournamentContext';
import {
  buildPaymentsCsv,
  buildSafePlayerRosterCsv,
  canRolePerform,
  isValidIndianMobile,
  maskPhoneForReadOnly,
  validatePhotoFile,
  validateRegistrationForm,
} from '../lib/validation';
import { INITIAL_TOURNAMENT_SETTINGS } from '../lib/seedData';
import { createFakeSupabase } from './fakeSupabase';
import { formatIstDateTime, isReceiptComplete, maskPhone, receiptVerifyPath } from '../lib/receipt';
import type { ReceiptPayload, RegistrationFormInput } from '../types/tkpl';

const demoWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TournamentProvider supabase={null} isCloudMode={false}>
    {children}
  </TournamentProvider>
);

const validSampleInput: RegistrationFormInput = {
  full_name: 'N. Kiran Kumar Reddy',
  phone: '9885012345',
  date_of_birth: '2001-05-12',
  locality: 'Kadapa RIMS Road',
  role: 'all_rounder',
  batting_hand: 'right_hand',
  bowling_style: 'right_arm_pace',
  experience: 'Played 3 seasons in Kadapa hard-tennis tournaments.',
  emergency_contact: '9885099999',
  photo_data_url: 'data:image/jpeg;base64,validphoto',
  photo_file_name: 'kiran_profile.jpg',
  rules_acknowledged: true,
  marketing_consent: true,
};

const RECEIPT_JSON: ReceiptPayload = {
  registration_no: 'TKPL-2026-0106',
  full_name: 'N. Kiran Kumar Reddy',
  locality: 'Kadapa RIMS Road',
  role: 'all_rounder',
  photo_url: 'https://signed.example/registrations/abc.jpg',
  amount_paise: 39900,
  currency: 'INR',
  receipt_no: 'TKPL-RCPT-2026-0001',
  paid_at: '2026-10-27T15:10:00.000Z',
  razorpay_payment_id: 'pay_TEST123456789',
  razorpay_handler: 'upi',
  razorpay_mode: 'test',
  status: 'verified',
  submitted_at: '2026-10-27T14:00:00.000Z',
};

describe('TKPL Validation, Security & Operational Workflow Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Validates Indian mobile numbers and photo file constraints accurately', () => {
    expect(isValidIndianMobile('9848011223')).toBe(true);
    expect(isValidIndianMobile('+91 98480 11223')).toBe(true);
    expect(isValidIndianMobile('1234567890')).toBe(false);

    const pdfCheck = validatePhotoFile({ name: 'id.pdf', type: 'application/pdf', size: 102400 });
    expect(pdfCheck.valid).toBe(false);

    const oversizedCheck = validatePhotoFile({
      name: 'huge.jpg',
      type: 'image/jpeg',
      size: 6 * 1024 * 1024,
    });
    expect(oversizedCheck.valid).toBe(false);

    const validCheck = validatePhotoFile({
      name: 'player.jpg',
      type: 'image/jpeg',
      size: 400 * 1024,
    });
    expect(validCheck.valid).toBe(true);
  });

  it('2. Uploads the photo first, then calls submit_player_registration and returns the registration no', async () => {
    const fake = createFakeSupabase({
      rpc: (fn) =>
        fn === 'submit_player_registration'
          ? {
              data: {
                player_id: 'uuid-1234',
                registration_no: 'TKPL-2026-0106',
                full_name: 'N. Kiran Kumar Reddy',
                payment_status: 'pending',
                created_at: '2026-10-27T10:00:00.000Z',
              },
              error: null,
            }
          : { data: null, error: null },
    });

    const { result } = renderHook(() => useTournament(), {
      wrapper: ({ children }) => (
        <TournamentProvider supabase={fake.client} isCloudMode>
          {children}
        </TournamentProvider>
      ),
    });

    let response: Awaited<ReturnType<typeof result.current.submitRegistration>> | undefined;
    await act(async () => {
      response = await result.current.submitRegistration(validSampleInput, 'idem-cloud-1');
    });

    expect(response?.registration_no).toBe('TKPL-2026-0106');
    expect(response?.payment_status).toBe('pending');

    // (The provider also reads the public settings row on mount.)
    const kinds = fake.calls
      .filter((call) => call.kind === 'upload' || call.kind === 'rpc')
      .map((call) => `${call.kind}:${call.name}`);
    expect(kinds).toEqual(['upload:player-photos', 'rpc:submit_player_registration']);

    const networkCalls = fake.calls.filter((call) => call.kind === 'upload' || call.kind === 'rpc');
    const upload = networkCalls[0];
    expect(String(upload.payload.path)).toMatch(/^registrations\/[^/]+\.jpg$/);
    expect(upload.payload.contentType).toBe('image/jpeg');

    const rpc = networkCalls[1];
    expect(rpc.payload.p_phone).toBe('9885012345');
    expect(String(rpc.payload.p_photo_path)).toBe(upload.payload.path);
    // The legacy reference params are pinned to harmless defaults (online only).
    expect(rpc.payload.p_payment_method).toBe('razorpay');
    expect(rpc.payload.p_transaction_ref).toBe('');

    // A repeated submit with the same idempotency key does not hit the network again.
    await act(async () => {
      const retry = await result.current.submitRegistration(validSampleInput, 'idem-cloud-1');
      expect(retry.registration_no).toBe('TKPL-2026-0106');
    });
    expect(
      fake.calls.filter((call) => call.kind === 'upload' || call.kind === 'rpc')
    ).toHaveLength(2);
  });

  it('3. Maps a duplicate-phone SQL error to friendly copy', async () => {
    const fake = createFakeSupabase({
      rpc: () => ({
        data: null,
        error: { message: 'DUPLICATE_PHONE: A registration already exists with this mobile number.' },
      }),
    });

    const { result } = renderHook(() => useTournament(), {
      wrapper: ({ children }) => (
        <TournamentProvider supabase={fake.client} isCloudMode>
          {children}
        </TournamentProvider>
      ),
    });

    await expect(
      act(async () => {
        await result.current.submitRegistration(validSampleInput, 'idem-dupe');
      })
    ).rejects.toThrow(/already exists with this mobile number/i);
  });

  it('4. Keeps the demo branch working (localStorage seed) with no cloud keys', async () => {
    const { result } = renderHook(() => useTournament(), { wrapper: demoWrapper });

    expect(result.current.isCloudConnected).toBe(false);

    let firstRes: Awaited<ReturnType<typeof result.current.submitRegistration>> | undefined;
    await act(async () => {
      firstRes = await result.current.submitRegistration(validSampleInput, 'idem-key-001');
    });

    expect(firstRes?.registration_no).toBe('TKPL-2026-0106');
    expect(firstRes?.payment_status).toBe('pending');
    expect(result.current.players.length).toBe(6);

    await act(async () => {
      const retryRes = await result.current.submitRegistration(validSampleInput, 'idem-key-001');
      expect(retryRes.registration_no).toBe('TKPL-2026-0106');
    });
    expect(result.current.players.length).toBe(6);

    await expect(
      act(async () => {
        await result.current.submitRegistration(validSampleInput, 'idem-key-002');
      })
    ).rejects.toThrow(/already exists with this mobile number/i);
  });

  it('5. Blocks new registrations when registration is closed or the deadline passed', () => {
    const closedSettings = { ...INITIAL_TOURNAMENT_SETTINGS, registration_open: false };
    expect(validateRegistrationForm(validSampleInput, closedSettings).form).toMatch(
      /currently closed/i
    );

    const expiredSettings = {
      ...INITIAL_TOURNAMENT_SETTINGS,
      deadline: '2020-01-01T00:00:00.000Z',
    };
    const expiredErrors = validateRegistrationForm(
      validSampleInput,
      expiredSettings,
      new Date('2026-10-27T00:00:00.000Z')
    );
    expect(expiredErrors.form).toMatch(/deadline.*has passed/i);
  });

  it('6. getReceipt returns null for a wrong DOB and the receipt for the right one', async () => {
    const fake = createFakeSupabase({
      rpc: (fn, args) => {
        if (fn !== 'get_receipt') return { data: null, error: null };
        // Stands in for the DB's three-factor gate.
        const match =
          args.p_registration_no === 'TKPL-2026-0106' &&
          args.p_phone === '9885012345' &&
          args.p_date_of_birth === '2001-05-12';
        return { data: match ? RECEIPT_JSON : null, error: null };
      },
    });

    const { result } = renderHook(() => useTournament(), {
      wrapper: ({ children }) => (
        <TournamentProvider supabase={fake.client} isCloudMode>
          {children}
        </TournamentProvider>
      ),
    });

    const wrongDob = await result.current.getReceipt('TKPL-2026-0106', '9885012345', '2000-01-01');
    expect(wrongDob).toBeNull();

    const right = await result.current.getReceipt('tkpl-2026-0106', '+91 98850 12345', '2001-05-12');
    expect(right?.receipt_no).toBe('TKPL-RCPT-2026-0001');
    expect(right?.amount_paise).toBe(39900);

    const sent = fake.calls.find((call) => call.name === 'get_receipt')?.payload;
    expect(sent?.p_registration_no).toBe('TKPL-2026-0106');
    expect(sent?.p_phone).toBe('9885012345');
  });

  it('7. Protects status lookup with Registration No + Phone + DOB', async () => {
    const { result } = renderHook(() => useTournament(), { wrapper: demoWrapper });

    expect(await result.current.lookupStatus('TKPL-2026-9999', '9848011223', '1999-04-14')).toBeNull();
    expect(await result.current.lookupStatus('TKPL-2026-0101', '9848011223', '2000-01-01')).toBeNull();

    const validLookup = await result.current.lookupStatus(
      'TKPL-2026-0101',
      '9848011223',
      '1999-04-14'
    );
    expect(validLookup?.full_name).toBe('Syed Irfan Basha');
    expect(validLookup?.payment_status).toBe('verified');
  });

  it('8. Confirms full tournament admin permissions across all operations', () => {
    expect(canRolePerform('super_admin', 'review_player')).toBe(true);
    expect(canRolePerform('super_admin', 'verify_payment')).toBe(true);
    expect(canRolePerform('super_admin', 'manage_settings')).toBe(true);
    expect(canRolePerform('super_admin', 'export_csv')).toBe(true);
    expect(canRolePerform(null, 'review_player')).toBe(false);

    expect(maskPhoneForReadOnly('9848011223', 'super_admin')).toBe('9848011223');
  });

  it('9. Blocks Auction Eligible until the fee is verified, and refuses to hand-verify Razorpay rows', async () => {
    const { result, rerender } = renderHook(() => useTournament(), { wrapper: demoWrapper });

    const loginAs = (role: 'super_admin') => {
      act(() => {
        result.current.loginAdmin(role);
      });
      rerender();
    };

    loginAs('super_admin');

    act(() => {
      result.current.loginAdmin('registration_reviewer');
    });
    rerender();

    await expect(
      result.current.updatePlayerReview({
        playerId: 'plr-103',
        registrationStatus: 'approved',
        auctionStatus: 'eligible',
        reviewNotes: 'Trying to mark eligible before payment verified',
      })
    ).rejects.toThrow(/until their registration fee payment is Verified/i);

    loginAs('super_admin');

    // A Razorpay row is machine-verified; an admin cannot flip it by hand.
    await expect(
      result.current.updatePaymentVerification({
        paymentId: 'pay-203',
        status: 'verified',
        transactionRef: 'hand-typed-utr',
        notes: 'Trying to verify online payment manually',
      })
    ).rejects.toThrow(/verified automatically by signature/i);

    // The refund path still works and needs a reference.
    await act(async () => {
      await result.current.updatePaymentVerification({
        paymentId: 'pay-201',
        status: 'refunded',
        transactionRef: 'pay_TKPLseed0001',
        refundRef: 'rfnd_TEST0001',
        notes: 'Refund issued in Razorpay dashboard',
      });
    });
    expect(result.current.payments.find((p) => p.id === 'pay-201')?.status).toBe('refunded');
  });

  it('10. Exports auction CSV, payments CSV and formats receipt fields', async () => {
    const { result } = renderHook(() => useTournament(), { wrapper: demoWrapper });

    const auctionCsv = buildSafePlayerRosterCsv(result.current.players, result.current.payments, {
      onlyAuctionEligible: true,
    });
    const lines = auctionCsv.trim().split('\n');
    // Header + the two approved + eligible + verified players in the seed.
    expect(lines.length).toBe(3);
    expect(auctionCsv).toContain('Syed Irfan Basha');
    expect(auctionCsv).toContain('K. Venkata Ramana Reddy');
    // Pending / unverified / unapproved players never reach the auction pool.
    expect(auctionCsv).not.toContain('P. Harish Kumar');
    expect(auctionCsv).not.toContain('Mohammed Toufeeq');
    expect(auctionCsv).not.toContain('G. Sai Charan');

    const paymentsCsv = buildPaymentsCsv(result.current.payments);
    expect(paymentsCsv.split('\n')[0]).toBe(
      'Receipt No,Registration No,Player Name,Amount (INR),Razorpay Payment ID,Payment Status,Paid At (IST)'
    );
    expect(paymentsCsv).toContain('TKPL-RCPT-2026-0001');
    expect(paymentsCsv).toContain('pay_TKPLseed0001');

    expect(formatIstDateTime('2026-10-25T15:10:00.000Z')).toMatch(/25 Oct 2026/);
    expect(maskPhone('9848011223')).toBe('98******23');
    expect(receiptVerifyPath(RECEIPT_JSON)).toBe(
      '/receipt?reg=TKPL-2026-0106&r=TKPL-RCPT-2026-0001'
    );
    expect(isReceiptComplete({ ...RECEIPT_JSON, receipt_no: '' })).toBe(false);
  });

  it('11. Authenticates admin users via Supabase credentials & verifies role permissions', async () => {
    const { client: fakeSupabase } = createFakeSupabase({
      adminUserRow: {
        user_id: 'usr-mansoor-001',
        email: 'mansoor@sultansports.in',
        full_name: 'Mansoor · Sultan Sports Kadapa',
        role: 'super_admin',
        active: true,
      },
    });

    const cloudWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <TournamentProvider supabase={fakeSupabase} isCloudMode={true}>
        {children}
      </TournamentProvider>
    );

    const { result } = renderHook(() => useTournament(), { wrapper: cloudWrapper });

    expect(result.current.adminSession).toBeNull();

    // Valid login
    await act(async () => {
      await result.current.loginAdminWithPassword('mansoor@sultansports.in', 'securepass123');
    });

    expect(result.current.adminSession).not.toBeNull();
    expect(result.current.adminSession?.email).toBe('mansoor@sultansports.in');
    expect(result.current.adminSession?.role).toBe('super_admin');
    expect(result.current.adminSession?.full_name).toBe('Mansoor · Sultan Sports Kadapa');

    // Sign out
    await act(async () => {
      await result.current.logoutAdmin();
    });

    expect(result.current.adminSession).toBeNull();

    // Invalid login - account not registered in admin_users
    const { client: unauthSupabase } = createFakeSupabase({
      adminUserRow: null,
    });

    const unauthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <TournamentProvider supabase={unauthSupabase} isCloudMode={true}>
        {children}
      </TournamentProvider>
    );

    const { result: unauthResult } = renderHook(() => useTournament(), { wrapper: unauthWrapper });

    await expect(
      unauthResult.current.loginAdminWithPassword('intruder@example.com', 'wrongpass')
    ).rejects.toThrow(/not listed or active as an authorized TKPL organizer/i);
  });
});
