# KidogoPay

Stablecoin on/off-ramp for Kenya and Nigeria, built on [Qadi](https://docs.qadi.io).

- **Cash out (automatic):** create a wallet on Solana, Base or BNB Smart Chain, link it to an M-Pesa number or bank account, and any USDC/USDT sent to it is converted to KES or NGN and paid out.
- **Buy crypto (manual):** pay KES with an M-Pesa prompt or NGN by bank transfer, receive USDC/USDT at any address.
- **Verification:** accounts can move up to `KYB_THRESHOLD_USD` (default $5,000) before business verification. KYB itself isn't integrated yet; requests are recorded and approved by hand.

Stack: Next.js 16 (App Router, server actions), Tailwind CSS 4, PostgreSQL + Drizzle, Better Auth (email/password + Google).

## Run it locally

```bash
npm install
cp .env.example .env.local          # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d                # local Postgres, or point DATABASE_URL at Neon/Supabase
npm run db:migrate
npm run dev                         # http://localhost:3000
```

With `PAYMENTS_MODE=mock` (the default) nothing touches Qadi. Rates and addresses are fake, and the dashboard shows **Simulate a deposit** on each wallet and **Simulate payment** on buy orders so you can run every flow. Emails print to the terminal until `RESEND_API_KEY` is set.

### Google sign-in

Create an OAuth client in Google Cloud Console, add `{BETTER_AUTH_URL}/api/auth/callback/google` as an authorized redirect URI, and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The Google button only appears when both are set.

## Going live with Qadi

1. Create a Qadi business account, turn on 2FA, and generate an API key (`sk_test_…` first). Set `QADI_API_KEY` and `PAYMENTS_MODE=live`.
2. In the Qadi dashboard, set the webhook URL to `https://kidogopay.xyz/api/webhooks/qadi` and copy the signing secret into `QADI_WEBHOOK_SECRET`.
3. **Fund your treasury wallet** if you sell crypto on the M-Pesa corridor (`ke-mpesa-rail-02`): Qadi pays onramps out of it unless Qadi provides liquidity for your account. Get the addresses from `GET /v1/fiat-orders/settings/treasury-wallet` (BSC/Base and Solana).
4. Check corridors with `GET /v1/fiat-orders/settings/corridors`. Qadi lists KES via M-Pesa as a direct rail; NGN goes through its standard processing, so confirm NGN payouts and onramps with Qadi before launch.
5. Optional fee: set `KIDOGO_FEE_PERCENT` and register a fee recipient for each chain with `PUT /v1/custom-fee-recipients/{chain}`. Qadi supports custom fees on the rail-02 corridors, so the app only adds it to KES orders.

### How money moves

| Step | Qadi call |
| --- | --- |
| Payout account added | `POST /v1/bank-accounts` (M-Pesa numbers are bank accounts with the M-Pesa institution code) |
| Wallet created | `POST /v1/wallets` with `chains: ["evm"]` or `["solana"]`, one Qadi wallet per KidogoPay wallet |
| Deposit lands | `deposit.received` webhook → `POST /v1/fiat-orders/offramp/quote` (source = that wallet, destination = linked bank account) → `POST /v1/fiat-orders/offramp/execute` |
| Buy crypto | `POST /v1/fiat-orders/onramp/quote` (amount in fiat, external destination) → `POST /v1/fiat-orders/onramp/execute` |
| Final states | `fiat_order.fulfilled / failed / refunded / expired` webhooks; the order page also polls `GET /v1/fiat-orders/{id}` while it's open |

Webhooks are verified with HMAC-SHA256 over `{timestamp}.{body}` (`X-Qadi-Signature`, `X-Qadi-Timestamp`) and rejected if older than five minutes. Events are de-duplicated by deposit/order id, since Qadi doesn't guarantee order or single delivery.

Notes:
- Between a deposit and its offramp sweep (seconds), funds sit in a Qadi wallet under your business account. Qadi has no "pay straight to a bank" deposit address, so this is the closest pass-through setup.
- Deposits to a paused wallet, or after the verification limit, are **held** in that wallet. Turning the wallet back on pays them out. Deposits on chains KidogoPay doesn't support (e.g. Ethereum to an EVM address) are held for support to handle.
- If an offramp fails to start (e.g. Qadi was unreachable), the transaction shows **Try the payout again**.

## Business verification (manual for now)

"Request verification" sets `kyb_profile.status = 'pending'`. After reviewing documents:

```sql
UPDATE kyb_profile SET status = 'approved', reviewed_at = now() WHERE user_id = '<user id>';
```

The customer can then turn their wallets back on, and held deposits pay out.

## Deploying (Vercel + Neon)

Set every variable from `.env.example` in Vercel (with `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` = `https://kidogopay.xyz`), run `npm run db:migrate` against the production database, and deploy.

## Before launch

- Add two-factor auth for customers (Better Auth has a `twoFactor` plugin). Anyone who gets into an account can redirect payouts, and email alerts are the only guard today.
- Terms of service and privacy pages.
- Rate limits on the public `/api/rates` route if you expect heavy traffic.

## Project map

```
src/app                 pages, server actions entry points, API routes
src/app/api/webhooks    Qadi webhook
src/lib/payments        provider interface, Qadi adapter (live.ts), simulator (mock.ts), event handling
src/lib/actions         server actions (wallets, payout accounts, buying, verification)
src/lib/db              Drizzle schema and client
src/components          UI
drizzle/                SQL migrations
```
