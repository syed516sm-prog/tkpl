# TKPL Project Session Log

## Session: 2026-10-28 - Razorpay Online Payments, Instant Receipts & Supabase Data Layer

### 1. Executive Summary & Why Changes Were Made
- **Razorpay Checkout replaces the "pay via UPI, paste your UTR" flow**:
  - *Why*: Players could claim a payment with any 12-digit number, and every fee needed a manual statement match before the auction pool. Organizers wanted real money confirmation and an instant, verifiable receipt.
  - *What*: Registration now saves the profile, then shows a dedicated pay step (`RegisterPage.tsx` `savedRegistration` state) with **Save Details & Pay ₹399** → **Pay Securely with Razorpay**. The UTR panel was deleted from the form and from `CheckStatusPage.tsx`; **Check Status** now offers **Complete Payment** (pending) or **View / Download Receipt** (verified).
- **Server-side verification, never the browser**:
  - *Why*: A checkout success callback can be forged or replayed; the amount must never come from the client.
  - *What*: New Vercel functions `api/razorpay/create-order.ts` (three-factor lookup, fee read from `tournament_settings`, Razorpay order + `create_pending_razorpay_order`) and `api/razorpay/verify-payment.ts` (HMAC-SHA256 with `timingSafeEqual`, then re-fetch the payment and require `captured` + matching amount + matching order before calling `verify_razorpay_payment`). Helpers in `api/_lib/` (`razorpay.ts`, `config.ts`, `supabaseAdmin.ts`, `http.ts`) use plain `fetch` — no new runtime dependency.
- **Receipt numbers and receipt downloads**:
  - *Why*: Players needed proof of entry immediately, and organizers needed a number to quote in WhatsApp.
  - *What*: Migration `0002_razorpay_payments.sql` adds the Razorpay columns, the new `razorpay` payment method, sequence `tkpl_receipt_seq`, unique indexes on `receipt_no` / `razorpay_payment_id`, the `verify_razorpay_payment` / `create_pending_razorpay_order` / `get_receipt` RPCs, and locks the legacy UTR door (`ONLINE_PAYMENT_ONLY`). New `/receipt` page with a branded `ReceiptCard`, canvas PNG download (`receiptCanvas.ts`, 1080×1350), `window.print()` A5 print CSS, and a dependency-free QR encoder (`qr.ts`, verified against an independent decoder) that points back to `/receipt?reg=…&r=…`.
- **Supabase became the real data layer**:
  - *Why*: `TournamentContext` was 100% `localStorage`, so nothing the server verified could ever reach the admin ledger.
  - *What*: New `lib/tournamentData.ts` (Photo upload → `submit_player_registration`, `lookup_registration_status`, `get_receipt`, admin reads with signed photo URLs, updates, settings, export audit) and `lib/supabaseBackend.ts` (pure env reader + client factory so tests can inject a fake). The provider keeps the same context shape, gains `getReceipt`, drops `submitApplicantPaymentProof`, and keeps a clearly marked demo branch on `localStorage` when no keys exist. `0001` now creates payments as `method='razorpay'`, `status='pending'` and ignores the old payment-reference parameters.
- **Admin side follows the new money flow**:
  - *Why*: Manual reconciliation no longer applies to online payments.
  - *What*: `/admin/payments` shows **Receipt No** and **Razorpay Payment ID**, lets Razorpay rows only be refunded (provider + DB trigger), adds **Export Payments CSV**, and rewrites the policy banner. `/admin` shows **Amount collected via Razorpay** and **Abandoned Checkouts (> 30 min)**. `/admin/settings` shows a read-only gateway status from `GET /api/razorpay/health` (boolean only — no key, no mode).
- **Build, config and tests**:
  - *Why*: `tsconfig.json` only included `src`, so `api/*.ts` was never type-checked; `vercel.json` sent `/api` to `index.html`.
  - *What*: `tsconfig.api.json` + `tsconfig.build.json` (build now runs `tsc -b tsconfig.build.json`), `vercel.json` rewrite excludes `/api/`, Vite dev proxy `/api → localhost:3000`, and `.env.example` gains the four server-only variables. Tests rewritten/added: mocked-Supabase registration (upload before RPC, duplicate-phone mapping), `getReceipt` wrong-DOB, Razorpay row rejection, `ReceiptCard`, and `api/__tests__/verify-payment.test.ts` HMAC/capture/amount cases (23 tests green).

---

### 1b. Verification against the official Razorpay docs (same session, follow-up)
Checked against the Standard Checkout integration steps, Orders entity, capture settings, refunds, payment error tables and webhook validation docs. Fixed:
1. **`receipt` must be unique per order (≤40 chars)** — it was the registration number, so a retried pay would have failed with "Duplicate receipt found". Now `orderReceiptFor()` mints a unique value; the registration number travels in `notes`.
2. **Sign with the server's order id** — the handler now looks up `razorpay_order_for_payment` and verifies the HMAC against the stored id, exactly as the docs require; a Checkout-echoed foreign order id is rejected before any Razorpay call.
3. **Capture race** — `checkout.ts` retries verify (~9s) while the server reports `PAYMENT_NOT_CAPTURED`; verify requires `payment.status === 'captured'` and a matching amount on the re-fetched order/payment.
4. **Lost-callback protection** — replaced orders are recorded (`replaced_razorpay_orders`), verify accepts a captured replaced order, and `api/razorpay/reconcile.ts` + Vercel cron (`CRON_SECRET`, fails closed) polls abandoned orders and issues missed receipts. The client also retries a receipt lookup on replaced orders.
5. **`confirm_close` frontier** — a 2.5s safety net resolves the checkout promise (the server re-verify is idempotent), so a closed dialog can never leave the button stuck.
6. **Failure copy** — Razorpay reason codes (`payment_timed_out`, `insufficient_funds`, `card_declined`, ...) now map to specific advice that always reminds the player their registration is saved.
7. Tests: 35 passing, including stored-order binding, foreign-order rejection, cron auth (no fail-open), unique order receipt, and failure copy.

---

### 2. Immediate Next Steps (For Next Session / Tool)
1. Run `supabase/migrations/0002_razorpay_payments.sql` in the Supabase SQL Editor (after `0001`).
2. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in Vercel and redeploy. Keep Razorpay auto-capture ON.
3. Test end-to-end with `vercel dev` + `npm run dev` and a Razorpay test card (`4100 2800 0000 1007`, any future expiry/CVV; UPI `success@razorpay`), then flip to live keys.
4. Planned follow-up (out of scope here): a signed `razorpay/webhook` endpoint (HMAC over the raw body with the webhook secret, idempotent on `x-razorpay-event-id`) as an alternative to the polling reconcile cron, and email/WhatsApp delivery of the receipt.

---

### 3. Architecture & Key Files Map (new in this session)
- `api/razorpay/create-order.ts`, `verify-payment.ts`, `health.ts`, `api/_lib/*`: server-only payment functions.
- `supabase/migrations/0002_razorpay_payments.sql`: Razorpay columns, receipt sequence, payment RPCs.
- `src/modules/core/lib/`: `tournamentData.ts`, `supabaseBackend.ts`, `paymentApi.ts`, `razorpay.ts`, `checkout.ts`, `receipt.ts`, `receiptCanvas.ts`, `qr.ts`.
- `src/modules/payments/components/`: `ReceiptCard.tsx`, `ReceiptQr.tsx`.
- `src/modules/registration/pages/ReceiptPage.tsx` (`/receipt`; `/registration-success` redirects here).
- Tests: `src/modules/core/test/tkpl.test.tsx`, `receipt.test.tsx`, `fakeSupabase.ts`, `api/__tests__/verify-payment.test.ts`.

---

## Session: 2026-10-27 - Tournament Launch, Mobile Optimization & Deployment Prep

### 1. Executive Summary & Why Changes Were Made
- **Organizer Header Symmetrical Redesign**:
  - *Why*: In mobile view (~380px), the 3-column organizer bar overflowed, cutting off Sunil's contact card. Organizers needed equal prominence for both partners on mobile screens.
  - *What*: Refactored `src/modules/core/components/Navbar.tsx` into a strict 50/50 responsive grid (`grid-cols-2`). Added photo avatars for **Mansoor** (Sultan Sports, Kadapa · `9110744945`) and **Sunil** (NR Sports, Vempalli · `8919155512`) with tap-to-call, tap-to-WhatsApp, and in-browser avatar photo replacement.
- **Accurate Rules & Fee Extraction from Video/Telugu Poster**:
  - *Why*: Official launch media specified exact tournament figures that differed from initial drafts.
  - *What*: Updated official registration fee to **₹399/-** (from ₹500), confirmed Guru Laser Ball specification, added New & Old Kadapa District boundary requirement, embedded Grand Launch video reel, added Telugu franchise guidelines (₹1.60L deposit, ₹80,000 purse, 15 players per squad, 3-year agreement), and highlighted mega cash prizes (₹2,00,000 1st / ₹1,50,000 2nd).
- **Client Cache Invalidation (`tkpl_v2_*`)**:
  - *Why*: Testers opening the app still saw old draft ₹500 fees stored in `localStorage`.
  - *What*: Bumped storage keys in `src/modules/core/context/TournamentContext.tsx` to `tkpl_v2_*` to force clean loading of the updated rules.
- **Complete Supabase Cloud Backend & Database Plan**:
  - *Why*: The application needed a production-ready database schema that protects player privacy, allows private photo uploads, and gives organizers a secure dashboard for payment reconciliation.
  - *What*: Created `supabase/migrations/0001_tkpl_schema_and_rls.sql` with tables (`players`, `payments`, `tournament_settings`, `admin_users`, `audit_logs`, `franchise_enquiries`), automatic registration number generator (`TKPL-2026-XXXX`), RLS policies, private bucket `player-photos`, and secure RPCs (`submit_player_registration`, `lookup_registration_status`, `submit_payment_reference`, `get_public_stats`).
  - *What*: Created `supabase/admin_setup.sql` to elevate Mansoor and Sunil to `super_admin`. Documented the schema in `docs/database-plan.md`.
- **Vercel Single-Page App (SPA) Routing Configuration**:
  - *Why*: Direct access to routes like `/register`, `/check-status`, or `/admin` on Vercel would return 404 without rewrite rules.
  - *What*: Added `vercel.json` with rewrite rule `/(.*) -> /index.html`.
- **Repository Setup & Helper Scripts**:
  - *Why*: Code needed to be synced to GitHub (`https://github.com/r73608925-lab/TKPL.git`) while maintaining clean folder hygiene and simple one-click operations for non-technical organizers.
  - *What*: Provided `run.bat` for one-click local testing, `scripts/push-to-github.bat` for interactive push to GitHub, and updated `guide.md` with simple step-by-step instructions.

---

### 2. Immediate Next Steps (For Next Session / Tool)
1. **Push Remaining Local Commits**:
   - Run `scripts\push-to-github.bat` (or `git push origin main`) to sync `SESSION_LOG.md`, `vercel.json`, `supabase/`, and docs to GitHub.
2. **Deploy to Vercel (Free)**:
   - In [vercel.com](https://vercel.com), import repository `r73608925-lab/TKPL`. Preset: Vite. Click Deploy. (Works immediately in demo mode).
3. **Connect Supabase Database (When Ready)**:
   - Create project in [supabase.com](https://supabase.com). Run `supabase/migrations/0001_tkpl_schema_and_rls.sql` in the SQL Editor.
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel Project Settings -> Environment Variables.

---

### 3. Architecture & Key Files Map
- **Frontend Architecture**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Phosphor Icons + Motion.
  - `src/modules/core/`: Types (`tkpl.ts`), Validation (`validation.ts`), Context & State (`TournamentContext.tsx`), Navigation (`Navbar.tsx`), Footer (`Footer.tsx`).
  - `src/modules/registration/`: Home Page (`HomePage.tsx`), Registration Form (`RegisterPage.tsx`), Status Checker (`CheckStatusPage.tsx`), Success Card (`RegistrationSuccessPage.tsx`).
  - `src/modules/admin/`: Organizer dashboard with 4 access roles, Player inspection, Payment reconciliation, and Settings editor.
- **Backend / Database**:
  - `supabase/migrations/0001_tkpl_schema_and_rls.sql`: Full production PostgreSQL schema.
  - `supabase/admin_setup.sql`: Super admin elevation script for organizers.
  - `docs/database-plan.md`: Database structure documentation.
- **Root Operations**:
  - `run.bat`: One-click local launch.
  - `guide.md`: Step-by-step user and organizer manual.
  - `vercel.json`: Vercel SPA routing rules.
  - `scripts/push-to-github.bat`: Interactive GitHub push script.
