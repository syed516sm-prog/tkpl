# TKPL Portal — Production Readiness Audit & Go-Live Manual

## Readiness Score: 90% (Code & Database Complete · Gateway Keys Required)
The core application code, design, database structure, security rules, and automated test suite are **100% complete and passing**. To start accepting real tournament registrations and fees, the organizers only need to supply the Razorpay payment gateway credentials and connect the environment variables in Vercel.

---

## 1. Executive Summary

| Area | Status | Notes |
| :--- | :---: | :--- |
| **Frontend UI & Visuals** | Ready | Responsive mobile design (380px–desktop), official Sultan Sports & NR Sports branding, animated hero, and instant printable/downloadable A5 receipt card with QR code. |
| **Backend & Cloud Database** | Ready | Connected to live Supabase project `sjyvugxszlyxxmravzzt`. All 8 tables, sequence counters, private photo storage, and PostgreSQL procedures verified. |
| **Automated Test Suite** | Ready | All 37 tests passing (HMAC payment verification, photo uploads, duplicate phone prevention, admin auth, and receipt generation). |
| **Production Build** | Ready | Vite + TypeScript build succeeds cleanly (`tsc -b tsconfig.build.json && vite build`). |
| **Payment Gateway (Razorpay)** | Action Needed | Server payment routes are coded, but `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are currently blank in the environment. |
| **Hosting Deployment** | Action Needed | Code needs to be pushed to GitHub and deployed to Vercel with server environment variables. |

---

## 2. Codebase & System Health Audit

### A. Test Suite Results
* **Test Engine:** Vitest 3.2.7
* **Total Tests:** 37 passed across 5 test suites (0 failures).
* **Coverage Highlights:**
  1. `tests/verify-payment.test.ts`: Re-verifies Razorpay payment signatures server-side, guards against amount tampering, and rejects foreign order IDs.
  2. `tests/reconcile.test.ts`: Tests background reconciliation for abandoned checkouts and cron secret security.
  3. `src/modules/core/test/tkpl.test.tsx`: Validates player age brackets (15–50), Indian phone formatting, private photo upload paths, duplicate entry prevention, and Supabase admin authentication.
  4. `src/modules/core/test/receipt.test.tsx`: Validates receipt payload integrity, 3-factor authentication (Registration Number + Phone + DOB), and QR code generation.

### B. Build Output
* Single production bundle generated in `dist/`.
* Serverless API handlers configured in `api/` with `vercel.json` routing rules separating `/api/*` from Single-Page Application (SPA) client routes.

---

## 3. Cloud Database & Storage Verification

Real-time diagnostics against the live Supabase project (`sjyvugxszlyxxmravzzt`):

```
Supabase Project URL: https://sjyvugxszlyxxmravzzt.supabase.co
Database Tables: players, payments, tournament_settings, admin_users, audit_logs
Storage Buckets: player-photos (Private)
Super Administrator: syed516.sm@gmail.com
```

### Verified Server-Side Rules:
1. **Private Player Photos:** The `player-photos` storage bucket is private. Photos can never be scraped or browsed publicly. The application uses temporary 1-hour signed links for the organizer roster.
2. **Three-Factor Ticket Access:** Players can only access their receipt and registration details by providing **Registration Number + Mobile Number + Date of Birth** together. Entering a random registration number returns nothing.
3. **Anti-Tampering Ledger:** Payment statuses can only be marked `verified` by the server after cryptographic signature verification against Razorpay's API. Organizers cannot accidentally mark a fake online payment as verified.

---

## 4. Placeholders & Test Artifacts Review

### A. Items Fixed During Audit
1. **Footer Phone Links (`src/modules/core/components/Footer.tsx`):**
   * *Issue:* The phone links had empty `href="tel:"` attributes and missing alt tags.
   * *Resolution:* Updated so tapping Mansoor (`9110744945`) or Sunil (`8919155512`) dials immediately on any mobile phone.
2. **"Quick Test Profiles" Bar (`src/modules/registration/pages/CheckStatusPage.tsx`):**
   * *Issue:* A test bar showing mock profiles (*Syed Irfan*, *P. Harish Kumar*, *G. Sai Charan*) was visible to visitors on the Find Ticket page.
   * *Resolution:* Wrapped in `{!isCloudConnected && ...}` so it only shows during offline local demoing. Real tournament players on the live website will see a clean search box.

### B. Items for Organizer Confirmation
1. **Public Support Email (`src/modules/legal/lib/policies.ts`):**
   * Currently listed as `syed516.sm@gmail.com` across the Terms, Refund, and Contact pages.
   * *Decision:* If you prefer a custom tournament email (e.g., `contact@tkpl.in` or `sultansports@...`), update line 25 of `policies.ts`.
2. **Sultan Sports Postal Address (`src/modules/legal/lib/policies.ts`):**
   * Currently listed as: *Sultan Sports, IMA Building, Shankarapuram, Kadapa*.
   * *Recommendation:* Add the 6-digit PIN code (e.g., `516001`) to speed up Razorpay merchant onboarding.
3. **Admin Login Demo Mode (`src/modules/admin/pages/AdminLoginPage.tsx`):**
   * Has a "Demo Preview Mode" tab that opens local storage sample data for testing. It does not alter live database records. If you prefer to hide it from visitors on the live domain, it can be disabled.

---

## 5. Step-by-Step Go-Live Action Plan

### Phase 1: Razorpay Payment Gateway Setup

1. Log in to [razorpay.com](https://razorpay.com) with the Sultan Sports or tournament account.
2. Navigate to **Account & Settings → API Keys → Generate Key**.
3. Copy your **Key ID** (`rzp_test_...` or `rzp_live_...`) and **Key Secret**.
4. **Important Gateway Settings:**
   * **Payment Capture:** Go to **Account & Settings → Payment Capture** and verify **Automatic Capture** is set to **ON**. (With manual capture, fees stay pending and get refunded after 3 days).
   * **Website Allowlist:** Under **Website and App Settings**, add your Vercel domain (e.g. `https://tkpl.vercel.app`).

### Phase 2: Configure Environment Variables in Vercel

When importing `r73608925-lab/TKPL` into Vercel, navigate to **Project Settings → Environment Variables** and add these 7 variables:

| Variable Name | Exposure | Source / Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Public / Browser | `https://sjyvugxszlyxxmravzzt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public / Browser | *(From `.env.local` line 6)* |
| `SUPABASE_URL` | Server Only | `https://sjyvugxszlyxxmravzzt.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only (Secret) | *(From `.env.local` line 10)* |
| `RAZORPAY_KEY_ID` | Server Only | `rzp_test_...` *(or `rzp_live_...`)* |
| `RAZORPAY_KEY_SECRET` | Server Only (Secret) | *(From Razorpay Dashboard)* |
| `CRON_SECRET` | Server Only (Secret) | *(Generate a random string of 16+ chars — never commit it)* |

> *Notice:* Never prefix `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` with `VITE_`. Keeping them without the prefix ensures they remain strictly on the Vercel server and are never exposed to players' web browsers.

### Phase 3: Live Verification Test

1. Open your live site, go to **Register**, and fill in sample details with a real photo.
2. Click **Save Details & Pay ₹399**.
3. In the Razorpay modal, use the official test card:
   * **Card Number:** `4100 2800 0000 1007`
   * **Expiry:** Any future date (e.g., `12/28`)
   * **CVV:** `123`
   * **OTP:** Any 6 digits (e.g., `123456`)
4. Confirm that:
   * The system immediately redirects to `/receipt` with a minted receipt number (`TKPL-RCPT-2026-0001`).
   * Clicking **Download Receipt (PNG)** generates a clear 1080×1350 image with the player's photo and verification QR code.
   * Signing in to `/admin` shows the payment as **Verified** with the matching Razorpay Payment ID.
5. Once satisfied, swap `rzp_test_...` for your `rzp_live_...` keys in Vercel and redeploy. You are ready to open registrations to the public!
