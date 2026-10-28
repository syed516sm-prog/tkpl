# TKPL · Razorpay Payment Gateway Integration & Go-Live Guide

> **Document Purpose:** Complete roadmap and step-by-step checklist for taking the T-KPL (Kadapa Premier League) online registration payment gateway from development to live production.

---

## 1. Executive Summary & Current Status

The core payment architecture for T-KPL player registrations (₹399 entry fee) has been developed and verified against the official **Razorpay Standard Web Integration** specifications.

### What Is Already Completed & Tested:
* **Server-Side Order Creation (`POST /api/razorpay/create-order`):**
  * Reads the ₹399 fee directly from the database (`tournament_settings.fee_paise`). The browser is never allowed to set the price.
  * Three-factor identity gate (Registration Number, Phone Number, Date of Birth).
  * Automatically creates a Razorpay Order with a unique receipt reference and registration tracking notes.
* **Streamlined UPI Checkout (Frontend):**
  * Configured strictly for **UPI only** (PhonePe, Google Pay, Paytm, and BHIM QR).
  * Cards, Netbanking, Wallets, and Pay Later options are hidden to keep the interface fast and simple for players.
  * **8-Minute Safety Window:** Protects against abandoned screens while giving players ample time to open their UPI apps and enter their PIN.
* **Cryptographic Server Verification (`POST /api/razorpay/verify-payment`):**
  * Computes HMAC SHA-256 signatures with constant-time comparison (`crypto.timingSafeEqual`) to prevent spoofing.
  * Re-checks payment capture status directly with Razorpay API before issuing the official receipt (`TKPL-RCPT-2026-XXXX`).
* **Backup Reconciliation (`GET /api/razorpay/reconcile`):**
  * A scheduled background cron job that periodically checks for abandoned orders and confirms payments if money was deducted while the user was offline.
* **Test Suite:** All 36 automated unit and integration tests passing cleanly.

---

## 2. What Is Still Needed to Go Live

To transition from the current setup to a fully functioning payment gateway collecting real money from players, the following 4 milestones must be completed:

```
[ Milestone 1: Code Enhancement ] ──► [ Milestone 2: Mandatory Policies ]
                                              │
                                              ▼
[ Milestone 4: Go-Live & Launch ] ◄── [ Milestone 3: Dashboard & Deploy ]
```

---

### Milestone 1: Code Enhancement — Real-Time Webhook (`/api/razorpay/webhook.ts`)

#### Why It Is Needed:
Currently, when a player pays via PhonePe/GPay, their receipt is generated as soon as Razorpay redirects them back to the website. However, if a player's phone battery dies, or if they accidentally close their browser immediately after entering their UPI PIN, the browser never sends the confirmation back. 

While our daily backup cron catches these, Razorpay's official best practice is an instant **Webhook**.

* **How It Works:** Razorpay's servers send an instant background notification directly to our server (`payment.captured` and `order.paid`).
* **Benefit:** The player's registration and receipt are marked **Verified in under 1 second**, even if the player never returns to the browser.
* **Implementation Plan:**
  1. Create `api/razorpay/webhook.ts`.
  2. Validate incoming signatures using `RAZORPAY_WEBHOOK_SECRET`.
  3. Atomically call `verify_razorpay_payment` in Supabase.

---

### Milestone 2: Mandatory Compliance Pages (Strict Razorpay Requirement)

In India, the Reserve Bank of India (RBI) and Razorpay require strict merchant compliance before approving **Live Mode**. A Razorpay compliance agent will inspect the website before activating real payments.

The website must display the following clear policies (usually linked in the footer):

1. **Terms & Conditions:**
   * Eligibility criteria: New Kadapa & Old Kadapa players only.
   * Document verification: Valid ID / Age proof required at jersey collection.
   * Code of conduct and tournament rules.
2. **Cancellation & Refund Policy:**
   * Explicit declaration regarding the ₹399 registration fee:
     * *Example:* *"The ₹399 registration fee is non-refundable once registered and verified, even if the player is not selected in the team auction. Refunds will only be issued if the tournament is officially cancelled by the organizers."*
3. **Contact Us / Support Policy:**
   * Organizer business names: **Sultan Sports** & **NR Sports**.
   * Operational address in Kadapa, Andhra Pradesh.
   * Direct contact numbers (Mansoor & Sunil) and an official support email.
4. **Product / Pricing Description:**
   * Clear statement explaining that the ₹399 charge is the official entry fee for **T-KPL Season 1 Player Auction Entry**.

---

### Milestone 3: Database & Razorpay Dashboard Configuration

#### A. Run Database Migrations on Live Supabase
Ensure the payment and receipt tables exist on your production Supabase project:
1. Open your **Supabase Dashboard** ➔ **SQL Editor**.
2. Run `supabase/migrations/0001_tkpl_schema_and_rls.sql`.
3. Run `supabase/migrations/0002_razorpay_payments.sql`.

#### B. Complete Razorpay Merchant KYC
1. Log in to [razorpay.com](https://razorpay.com).
2. Complete KYC:
   * Business Type (Individual / Proprietorship / Registered Entity).
   * PAN card and Aadhaar details of the organizer.
   * Bank account details (Account number and IFSC where registration fees will be deposited).
   * Submit the website URL (e.g., `https://tkpl.vercel.app` or custom domain).

#### C. Enable Auto-Capture & UPI
1. In Razorpay Dashboard: **Account & Settings ➔ Payment Capture**.
2. Verify **Automatic Capture** is selected (default).
3. Under **Payment Methods**, ensure **UPI** is activated.

#### D. Generate Live API Keys
1. In Razorpay Dashboard, toggle from **Test Mode** to **Live Mode** in the top navigation.
2. Navigate to **Account & Settings ➔ API Keys ➔ Generate Key**.
3. Safely copy:
   * **Live Key ID:** `rzp_live_xxxxxxxxxxxxxx`
   * **Live Key Secret:** `xxxxxxxxxxxxxxxxxxxxxxxx`

#### E. Configure Webhook on Razorpay Dashboard
1. Go to **Settings ➔ Webhooks ➔ Add New Webhook**.
2. **Webhook URL:** `https://your-domain.vercel.app/api/razorpay/webhook`
3. **Secret:** Choose a secure random string (save this as `RAZORPAY_WEBHOOK_SECRET`).
4. **Active Events:**
   * `order.paid`
   * `payment.captured`
   * `payment.failed`

---

### Milestone 4: Deployment & Live Launch Drill

#### A. Set Vercel Production Environment Variables
In your Vercel Project Settings ➔ **Environment Variables**, set:

| Variable Name | Scope | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Public (Frontend) | Production Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Public (Frontend) | Production Supabase Anonymous Key |
| `SUPABASE_URL` | Server Only | Same Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only (**Secret**) | Supabase Service Role Key (Admin rights) |
| `RAZORPAY_KEY_ID` | Server Only | `rzp_live_...` (or test key during staging) |
| `RAZORPAY_KEY_SECRET` | Server Only (**Secret**) | Razorpay Live Secret |
| `RAZORPAY_WEBHOOK_SECRET`| Server Only (**Secret**) | Webhook secret configured on Razorpay |
| `CRON_SECRET` | Server Only (**Secret**) | Random string for Vercel Cron backup authorization |

#### B. Pre-Launch Verification Drill (Test Transaction)
1. Register a test player on the live site.
2. Complete payment using UPI.
3. Verify that:
   * The payment modal opens exclusively with UPI options.
   * Receipt `TKPL-RCPT-2026-XXXX` is generated with photo and QR code.
   * In `/admin/payments`, the payment status shows **Verified (Razorpay signature)** with the correct Razorpay Payment ID.
   * Money appears in the Razorpay Dashboard live ledger.

---

## 3. Summary Checklist

- [x] Server-side Order API with three-factor verification
- [x] Standard Checkout popup with UPI-only restriction (PhonePe, GPay, Paytm)
- [x] 8-Minute transaction safety timeout
- [x] Cryptographic HMAC SHA-256 signature verification & double capture check
- [x] Automated backup reconciliation cron job
- [ ] Add real-time Webhook handler (`/api/razorpay/webhook.ts`)
- [ ] Add mandatory compliance policy pages (Terms, Refund Policy, Contact Us)
- [ ] Run `0002_razorpay_payments.sql` on live Supabase instance
- [ ] Complete Razorpay KYC and activate Live Mode
- [ ] Set production environment variables on Vercel
- [ ] Run final ₹1 or test live transaction before opening public registrations
