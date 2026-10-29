# TKPL (Tennisball Kadapa Premier League) - Step-by-Step User Guide

Welcome to the official **TKPL Player Registration Portal & Organizer Dashboard**. This guide explains how to launch, test, and operate the application in plain, simple steps.

---

## 1. How to Start the App on Your Computer

### A. Just the website (no payments)
1. Open the **`TKPL`** folder on your Desktop (`C:\Users\liter\Desktop\TKPL`).
2. Double-click the **`run.bat`** file.
3. A command window will open, start the server, and automatically open your web browser to **`http://localhost:5173`**.

*(Tip: Keep the black command window open while you are using the website. Close it when you are done.)*

### B. With real Razorpay payments (test mode)
The payment endpoints live in the `api/` folder and only exist on Vercel. To test the full "register → pay → receipt" flow on your laptop you need **both** servers running:
1. In one command window: `vercel dev` (installs on first run; it listens on `http://localhost:3000`).
2. In another command window: double-click **`run.bat`** (or `npm run dev`). The website is on `http://localhost:5173` and forwards `/api/...` to `vercel dev`.

Without `vercel dev`, the website still works (registration + status + admin), but pressing **Pay** will report that online payment is not configured.

---

## 2. How Players Use the Website

### A. Register and pay (`/register`)
1. Click **Register Now** on the Home page.
2. Fill in **Full Name**, **10-digit WhatsApp/Mobile Number**, **Date of Birth**, **Locality/Town**, and the **Cricket Profile** (Batter, Bowler, All-Rounder, Wicketkeeper).
3. Upload a clear **Player Photograph** (JPEG, PNG or WebP under 5 MB).
4. Tick the **Tournament Rules & Eligibility** box and press **Save Details & Pay ₹399**.
5. A "Registration saved" screen shows your **Registration Number** (e.g. `TKPL-2026-0106`). Press **Pay Securely with Razorpay**.
6. In the Razorpay window choose UPI, card, netbanking or wallet and pay ₹399.
7. The receipt page opens with your **Receipt Number** (e.g. `TKPL-RCPT-2026-0001`). Use:
   - **Download Receipt (PNG)** for a 1080 × 1350 image with your photo,
   - **Print / Save as PDF** to print it or choose "Save as PDF" in the print window,
   - **Copy Receipt No** to paste it into WhatsApp.
8. Closed the Razorpay window by mistake? Your registration is safe. Press **Pay** again, or open **Check Status** and press **Complete Payment** there. No receipt is issued until the payment is confirmed.

> **Rules the system follows**
> - The fee is mandatory and online only. There is no "pay later" path and no UTR entry any more.
> - A player cannot pay twice: once a fee is verified, "Pay" is refused for that registration.
> - If the deadline passes after you saved your form but before you paid, the payment can still be completed for an order created earlier — the slot is already yours.
> - Pressing the browser's Back button after paying does not issue a second receipt. Payments confirmed twice return the same receipt number.

### B. Find ticket or download the receipt later (`/find-ticket`, `/receipt`)
1. Click **Find Ticket** in the top navigation bar (or visit `/find-ticket`).
2. For privacy, enter all three details together:
   - **Registration Number** (e.g. `TKPL-2026-0101`)
   - **Mobile Number**
   - **Date of Birth**
   *(When testing locally, you can also click one of the **Quick Test Profiles** buttons to fill in sample player details with one click!)*
3. You will see two clear status cards:
   - **1. Profile Status** (*Submitted → Under Review → Approved / Needs Correction*)
   - **2. Payment & Entry Confirmation** (*Payment Pending → Confirmed Entry*)
4. **Payment Pending** shows **Complete Payment** — the secure online Razorpay checkout.
5. **Confirmed Entry** shows **View / Download Ticket Pass**.
6. You can also go straight to **`/receipt`** and enter the same three details to view your official entry pass again (it never becomes a public link). A wrong Date of Birth is always refused.

---

## 3. How Organizers & Admins Use the Dashboard (`/admin`)

1. Click **Admin** in the top navigation bar.
2. Sign in with your registered admin credentials:
   - **Admin Email:** `syed516.sm@gmail.com`
   - **Password:** The password set during Supabase configuration.
   *(When testing offline without Supabase cloud keys, you can click "Demo Preview Mode" to inspect the dashboard with sample data!)*

### Key Admin Tasks
- **See what came in (`/admin`):** The Overview shows **Amount collected via Razorpay**, **Confirmed Entries**, and the audit log (each online payment is logged as `PAYMENT_VERIFIED_RAZORPAY` by the server).
- **Check the payment ledger (`/admin/payments`):** Every online payment is **already Verified** — Razorpay's signature was checked before the receipt number was issued. The table shows the **Receipt No** and the **Razorpay Payment ID** so you can match them against your Razorpay dashboard.
- **Export (`/admin/players`):** **Export Registered Players CSV** gives receipt no, registration no, player name, contact info, locality, and playing role. The export is written to the audit log.
- **Review a player (`/admin/players`):** Open **Inspect**, check the photo and cricket details, and set **Approved** or request corrections.
- **Settings (`/admin/settings`):** Set the fee, deadline, or close registrations. The page also shows read-only **Payment gateway: Razorpay** status (connected / not configured) — no key or secret is ever displayed.

---

## 4. Deploying to Vercel (Free Hosting)

1. Double-click `scripts\push-to-github.bat` so all latest files are on GitHub.
2. Go to **[vercel.com](https://vercel.com)**, sign in with GitHub, click **"Add New..." → "Project"**.
3. Import the repository **`r73608925-lab/TKPL`**. Keep the defaults:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Click **Deploy**. The website is live on a free `vercel.app` link within a minute. The files in `api/` are automatically deployed as serverless functions, and the SPA routing in `vercel.json` keeps `/api/...` and `index.html` apart.

---

## 5. Connecting Supabase + Razorpay (When You Are Ready)

### Supabase (database + photo storage)
1. Create a free account and project at **[supabase.com](https://supabase.com)**.
2. In **Authentication → Users**, click **"Add user" → "Create user"** with email `syed516.sm@gmail.com`, enter your chosen password, and check "Auto Confirm User".
3. Open **SQL Editor** and run the all-in-one script [`supabase/setup_all.sql`](file:///c:/Users/liter/Desktop/TKPL/supabase/setup_all.sql). This creates all 8 tables, storage bucket, security policies, and configures `syed516.sm@gmail.com` as Tournament Admin.
   *(Note: If you already set up Supabase previously, simply run [`supabase/migrations/0004_fix_receipt_photo_url.sql`](file:///c:/Users/liter/Desktop/TKPL/supabase/migrations/0004_fix_receipt_photo_url.sql) in SQL Editor to update the photo URL permissions and receipt generator).*
4. Under **Project Settings → API**, copy the **Project URL**, the **anon public key**, and the **service_role key** (keep this one secret).

### Razorpay (online payments)
1. Create an account at **[razorpay.com](https://razorpay.com)** and complete KYC.
2. **Settings → API Keys → Generate key** and stay in **Test mode** first. Copy the **Key ID** (`rzp_test_...`) and **Key Secret**.

### Add the environment variables
In Vercel: **Settings → Environment Variables**. For local testing, put the same values in `.env.local`.

| Variable | Where it is used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Safe to expose |
| `VITE_SUPABASE_ANON_KEY` | Browser | Safe to expose (row-level security protects the data) |
| `SUPABASE_URL` | Server (`api/`) | Same URL as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (`api/`) | **Secret.** Never prefix with `VITE_` |
| `RAZORPAY_KEY_ID` | Server (`api/`) | Safe to expose (shown in checkout) |
| `RAZORPAY_KEY_SECRET` | Server (`api/`) | **Secret.** Never prefix with `VITE_` |
| `CRON_SECRET` | Server (`api/`) | **Secret.** Any long random string; Vercel cron sends it in the `Authorization` header. Without it the reconcile job refuses to run. |

Redeploy after adding them. The admin Settings page shows "Connected" when the server keys are found.

Two Razorpay Dashboard settings matter:
1. **Account & Settings → Payment Capture → Automatic Capture** (this is the default). Keep it. The receipt is issued only after Razorpay marks the fee `captured`; with manual capture the fee stays `authorized` and Razorpay auto-refunds it after 3 days.
2. **Allowlist your site** for Checkout (Account & Settings → Payment methods / Website). Use the `vercel.app` domain.

### Test the payment once, end to end
1. Register a player and press **Pay**.
2. Use a Razorpay test card from their docs (**4100 2800 0000 1007**, any future expiry, any CVV) — or UPI id **success@razorpay** with test mode.
3. The receipt page should show a receipt number and your photo, and **Download Receipt (PNG)** should save a 1080 × 1350 image.
4. In `/admin/payments` the row must be **Verified** with a Receipt No and the Razorpay payment id.
5. When everything is correct, replace the two Razorpay keys with your **Live mode** keys and redeploy.

### What happens if a player pays but closes the tab
1. The browser re-checks the payment for ~9 seconds after the Razorpay window closes.
2. If the tab was closed entirely, `/api/razorpay/reconcile` (Vercel Cron, every 10 minutes) polls Razorpay for orders left unpaid, and **issues the receipt itself** for any that were actually captured.
3. The player can also re-open **Check Status** and press Pay/Retry — an already-verified fee returns the same receipt, never a second one.
4. If the player pressed "Pay again" and paid the *older* order, the system still finds that money and receipt it (it is recorded as the payment for the registration).
