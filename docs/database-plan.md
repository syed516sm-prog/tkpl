# T-KPL Database Plan (Supabase)

## Tables
| Table | What it stores | Who can read | Who can change |
|---|---|---|---|
| `tournament_settings` (1 row) | Fee, deadline, UPI ID (fallback), rules, open/closed | Everyone | Super admin |
| `players` | Player profile, photo path, review + auction status | Admins only | Reviewers, super admin |
| `payments` | Amount, Razorpay order/payment id, receipt number, paid date, verification status, refunds | Admins only | Payment verifiers, super admin (signature-verified Razorpay rows are locked) |
| `admin_users` | Mansoor, Sunil and helpers, with their role | Self / super admin | Super admin |
| `audit_logs` | Automatic record of every approval, payment, receipt and settings change | Admins | Nobody by hand (triggers + server RPC) |
| `franchise_enquiries` | Team owner enquiries (Rs 1.6L deposit) | Reviewers, super admin | Super admin |
| `teams`, `team_memberships`, `auction_events`, `auction_bids` | Phase 2 auction (empty for now) | Locked | Locked |

### `payments` columns added in `0002_razorpay_payments.sql`
| Column | Meaning |
|---|---|
| `method` | Now also accepts `'razorpay'` (online). New registrations start here. |
| `razorpay_order_id` | Order id created by the server before checkout opens. |
| `razorpay_payment_id` | Payment id returned by Razorpay; unique, so a retried verify is idempotent. |
| `receipt_no` | `TKPL-RCPT-2026-0001`, minted once when the fee is verified. Unique. |
| `paid_at` | Time Razorpay confirmed the capture. |
| `receipt_issued_at` | Time the receipt number was minted. |
| `razorpay_handler` | How it was paid (upi / card / netbanking ...), copied from Razorpay. |
| `razorpay_mode` | `test` or `live`, so a test-mode receipt can never pass for real money. |

`replaced_razorpay_orders` records every order that a newer "Pay again" superseded. If the player paid an old order, the money is still found (online verify or the reconcile cron) and receipted, never lost.

Sequence `tkpl_receipt_seq` (start 1) backs `next_receipt_no()`.

## How the public website reaches the data (functions, not tables)
- `submit_player_registration` creates a player and a payment, checks deadline, age and duplicate phone, and makes the `TKPL-2026-XXXX` number. Payments are always created with `method='razorpay'`, `status='pending'`; the old payment-reference parameters are accepted but ignored.
- `lookup_registration_status` needs registration number, phone and date of birth together.
- `get_receipt` (public, same three-factor gate) returns the receipt payload + a 10-minute signed photo URL, or `null` when the payment is not verified or has no receipt number.
- `create_pending_razorpay_order` (service role only) stores the Razorpay order id on the player's pending payment.
- `verify_razorpay_payment` (service role only) is called only after the server's HMAC check: it marks the payment `verified`, stores the payment id / handler / mode, mints `receipt_no`, stamps `paid_at`, and writes a `PAYMENT_VERIFIED_RAZORPAY` audit row. Idempotent: the same payment id returns the same receipt.
- `razorpay_order_for_payment` (service role only) returns the order id stored server-side, so the signature is checked against our record (docs: "Do not use the `razorpay_order_id` returned by Checkout").
- `register_replaced_razorpay_order` (service role only) retires the previous unpaid order and returns the retired ids, so the browser can look for a receipt on an older order.
- `pending_razorpay_orders_for_reconcile` (service role only) feeds `api/razorpay/reconcile.ts`: confirmed by Vercel Cron (`CRON_SECRET`), it polls Razorpay for abandoned orders and issues any receipt a lost callback left behind.
- `submit_payment_reference` (legacy UTR door) now always raises `ONLINE_PAYMENT_ONLY`.
- `get_public_stats` returns counts only, no personal data.
- `submit_franchise_enquiry` takes a team-owner enquiry.
- `log_export` records CSV exports (admins only; used by the roster and payments exports).

## Rules the database enforces by itself
- Auction Eligible needs profile Approved and payment Verified.
- Verifying a manual payment needs a reference number; verifying a Razorpay payment needs a payment id and stamps who and when.
- A Razorpay row can never be moved back to `submitted`/`pending` (trigger + provider guard), so a paid online order cannot be re-pointed at a hand-typed UTR.
- If a payment stops being Verified, the player leaves the auction pool.
- One receipt number and one Razorpay payment id, ever (unique partial indexes).
- Only the super admin can edit a player's name, phone, date of birth or photo.
- Photos: private bucket `player-photos`, 5 MB, jpeg/png/webp, public upload only into `registrations/`, only admins can view. Receipts never expose a public file URL — the server signs one URL after the three-factor check.

## Build order
1. Run `supabase/migrations/0001_tkpl_schema_and_rls.sql`.
2. Run `supabase/migrations/0002_razorpay_payments.sql` (adds Razorpay columns, receipt numbers and the payment functions).
3. Create admin logins in Authentication, then run `supabase/admin_setup.sql`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and in `.env.local`.
5. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (server-only, never `VITE_`-prefixed). Without `CRON_SECRET` the reconcile cron refuses to run (it never fails open).
6. Test with a Razorpay test card, then flip the keys to live mode.
7. Razorpay Dashboard → Account & Settings → Payment Capture → **auto-capture** (the default). The receipt page follows the documented flow: verify the signature → confirm `status === 'captured'`. Manual capture would leave fees `authorized` and Razorpay auto-refunds uncaptured payments.
