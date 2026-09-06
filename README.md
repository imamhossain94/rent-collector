# Rent Collector

A rent-collection web app for Bangladesh. A house owner signs up, adds whatever they rent out
(building, flat, shop, market, garage), moves tenants in, and every month issues bills, records
payments and hands over a printable money receipt. A super admin manages every user on the platform.

![Rent Collector dashboard](docs/dashboard.png)

Built with Next.js 15 (App Router, server actions), Prisma + **PostgreSQL**, Tailwind v4, bilingual Bangla/English UI, light dashboard with a dark mode toggle.

Type: **Inter** for Latin, **Noto Sans Bengali** for Bangla (close enough in metrics that mixed
Bangla/English table rows stay on one baseline), JetBrains Mono reserved for identifiers like bill and
receipt numbers. The scale starts at 13px — Bengali glyphs carry more detail than Latin and go muddy
below that — with 44px controls and 15px body/nav text.

The whole interface flips to Bangla from the top bar, numerals included:

![Bangla interface](docs/dashboard-bn.png)

---

## Quick start

```bash
npm install
cp .env.example .env      # then put your Postgres URL + AUTH_SECRET in it
npm run setup             # prisma generate + db push + seed demo data
npm run dev               # http://localhost:3000
```

Demo logins (created by the seed):

| Role        | Mobile        | Password   |
| ----------- | ------------- | ---------- |
| House owner | `01711111111` | `123456`   |
| House owner | `01722222222` | `123456`   |
| Super admin | `01700000000` | `admin123` |

Other scripts: `npm run db:reset` (wipe + reseed), `npm run db:studio`, `npm run build`, `npm start`.

Environment (`.env`) — see `.env.example`:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
AUTH_SECRET="a long random string"
SMS_PROVIDER=""      # blank = simulation mode: messages are stored, not sent
SMS_API_KEY=""
SMS_SENDER_ID=""
```

---

## Market research — what shaped this build

Sources studied: **Barivara / ভাড়া আদায় – Rent Collector** (`com.shakil.barivara`), **TallyKhata**
(`com.progoti.tallykhata`), Bariwala App (bari-wala.com), SRS IT and IT Garden rent-management ERPs,
the Premises Rent Control Act 1991, and BERC 2026 electricity tariffs.

| What the market does | What we do about it |
| --- | --- |
| TallyKhata proved Bangladeshi micro-businesses will keep a ledger digitally, and that **SMS-based due collection** is the killer feature (1M+ MAU, free reminder SMS). | SMS reminders are first-class: one button texts every tenant with a balance, in Bangla, with their own name and exact due. Gateway-agnostic adapter (BulkSMSBD wired, others pluggable); simulation mode until a key is set. |
| Barivara / Bariwala apps center on tenant records, dues, agreements, reports. | Same core, but modelled properly: **property → unit → tenant → bill → payment**, so one owner can hold a flat building, a shop market and a garage at once. |
| Rent Control Act 1991: the landlord **must** issue a written rent receipt, keeps the counterfoil, and advance is capped at about one month's rent. | Every payment produces a numbered, printable **money receipt** (bilingual, amount in words in Bangla and English) quoting the Act. The tenant form flags the one-month advance norm. |
| Real Bangladeshi rent bills are not just rent: service charge, gas (~৳1,000/month flat), water, garbage, lift, security — and electricity billed off a **sub-meter** at a per-unit rate the owner sets (BERC household slabs run roughly ৳4.6–17.4/kWh, so owners typically charge a flat ৳9–13). | Bills are itemised across rent / service / electricity / gas / water / other. Sub-meter readings have their own monthly sheet: last month's figure is pre-filled, you type the new one, units × rate flows straight onto the bill. |
| Most buildings run a **prepaid DESCO meter** — the owner loads money onto it several times a month, so there is no monthly unit reading to bill against. | Top-ups are recorded in taka (amount, date, bKash/Nagad/cash, DESCO token) and reconciled against what the sub-meters recovered, so the owner sees exactly what the common areas cost them. |
| Owners keep dues in their head or in a paper khata, and money handed over clears the oldest month first. | The ledger works the same way: `balance = opening due + bills − payments`, payments are re-applied FIFO across bills, and each bill prints "this month + previous due = payable". A paper-khata opening balance can be typed in when a tenant is added. |
| Payments arrive as cash, bKash, Nagad, Rocket, bank or cheque. | Payment methods are first-class with brand colours and a TrxID field; collections are broken down by method. |
| Owners care about profit, not just rent collected. | Expenses (repair, guard salary, holding tax, cleaning…) are tracked per property, and reports show billed vs collected vs spent vs net for 12 months, per month and per property. |
| Bangla-first users, but bills often need English. | Whole UI toggles Bangla ⇄ English (Bangla default, Bangla numerals in Bangla mode); printed bills and receipts are always bilingual. |

---

## What's in the app

**Owner**

- **Dashboard** — collected / outstanding / billed / expenses for the month, occupancy, 6-month collection
  trend, quick actions, largest dues, recent receipts, bill-status split.
- **Properties** — building, house, shop, market, garage, land; per-property billing defaults
  (electricity rate, service charge, gas, water, rent due day, late fee) and units inside them.
  Bulk-create units ("A-" × 4 → A-1…A-4).
- **Tenants** — **Quick add** takes just name, mobile, number of members and the unit (rent, advance and
  utility defaults come from the property); the full form adds NID, occupation, family size, emergency contact, agreement dates, security deposit
  (jamanat), opening due, per-tenant utility setup. Profile page shows a full running-balance ledger,
  bill history and meter history. Move-out marks the unit vacant and keeps the history.
- **Electricity & meters** — the building's own DESCO **prepaid** meter is tracked in taka: log every
  top-up (amount, date, bKash/Nagad/cash, token no.) as many times a month as you recharge. Underneath,
  one sheet per month holds every sub-meter tenant at your per-unit rate (default **৳9/unit**), with live
  unit/amount totals as you type. The page reconciles the two: topped up vs recovered vs the difference
  you absorb for stairs, water pump and empty units.
- **Bills** — one click generates the month for every active tenant (safe to press twice, never duplicates).
  A single bill opens a full **line-item editor**: rent, service charge, gas, water and any charge you add
  (garbage, lift, repair share…) can be renamed, re-priced or removed; electricity is either a sub-meter
  reading (prev/current/rate) or a hand-typed amount; then late fee **+**, discount ("less") **−** and
  advance/deposit adjustment **−**, with the payable total recalculating as you type. Issued bills can be
  re-edited the same way. Void, notes, A4 print view.
- **Collections** — record cash/bKash/Nagad/Rocket/bank/cheque against a bill or on account, auto receipt
  number, optional receipt SMS, printable money receipt.
- **Expenses**, **Reports**, **SMS log**, **Settings** (profile shown on printed documents, password, language).

**Super admin**

- Platform totals (owners, properties, units, tenants, all-time and monthly collection), newest owners,
  top collectors.
- User management: create, suspend/activate, upgrade to PRO, reset password, delete.
- Audit log of every meaningful action.

---

## How the money maths works

```
tenant balance = opening due + Σ bill.total (non-void) − Σ payments
bill.total     = this month's charges + late fee − discount − advance adjustment
bill.previousDue = snapshot of the balance when the bill was issued (printed, never re-summed)
```

Bill totals never include previous dues, so old dues can't be double-counted when the next bill goes
out. `recomputeTenantBills()` re-applies every payment oldest-bill-first and is idempotent, so
paid/partial/unpaid status stays correct after any edit, deletion or back-dated entry.

Charges are **tenant-authoritative**: whatever is on the tenant record is what gets billed. Property
defaults only pre-fill the tenant form (so a garage tenant is never quietly billed for the building's
gas line).

---

## Deploying to Vercel

The app is a stock Next.js App Router project, so Vercel needs no special build
configuration — only environment variables and a database it can reach.

1. **Push the repo** and import it at [vercel.com/new](https://vercel.com/new). Framework preset
   *Next.js*, root directory `./`, build command left as the default (`npm run build`, which runs
   `prisma generate && next build`).
2. **Environment variables** (Project → Settings → Environment Variables, add to *Production*,
   *Preview* and *Development*):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | your Postgres URL — on Neon use the **pooled** `-pooler` host |
   | `AUTH_SECRET` | a long random string (`openssl rand -base64 32`) |
   | `APP_URL` | `https://your-app.vercel.app` |
   | `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID` | optional; blank keeps SMS in simulation mode |

3. **Create the tables once** — Vercel builds don't touch your schema. From your machine, with the
   same `DATABASE_URL` in `.env`:

   ```bash
   npm run deploy:db      # prisma db push
   npm run db:seed        # optional demo data — wipes existing rows first
   ```

4. **Deploy.** Every push to `main` ships; pull requests get preview URLs.

Notes that matter in production:

- **Use the pooled connection.** Serverless functions open a lot of short-lived connections; Neon's
  `-pooler` host (or Supabase's pooler / PgBouncer) is what keeps you under the limit. If Prisma
  complains about prepared statements, append `?pgbouncer=true` to `DATABASE_URL`.
- **`prisma migrate` needs the direct host.** `db push` works over the pooler; proper migrations
  don't. Set `DIRECT_URL` to the unpooled host and uncomment `directUrl` in `prisma/schema.prisma`.
- **`AUTH_SECRET` must be stable.** Change it and every signed-in session is invalidated.
- **Sessions are JWT cookies**, so there is nothing server-side to share between instances.
- **Region**: put the Vercel functions in the same region as the database (Neon `us-east-2` →
  Vercel `iad1`/`cle1`) — cross-region round trips dominate the request time otherwise.

### Portability

Enums are modelled as `String` columns with the values kept in `src/lib/constants.ts`, and the schema
avoids provider-specific constructs, so it also runs on SQLite locally (`provider = "sqlite"`,
`DATABASE_URL="file:./dev.db"`) and maps cleanly onto Firestore collections later — every relation is
already a plain foreign-key id, and the read paths live in `src/lib/queries.ts` and `src/lib/billing.ts`.

## Project layout

```
prisma/schema.prisma        data model
prisma/seed.mjs             demo data (2 owners, 3 properties, 8 tenants, 3 months of bills, prepaid top-ups)
src/lib/billing.ts          bill building, ledger, FIFO allocation, numbering
src/lib/format.ts           BDT money, Bangla numerals, dates, amount-in-words (bn + en)
src/lib/i18n.ts             bilingual dictionary
src/lib/sms.ts              SMS adapter + Bangla/English templates
src/app/actions/*           server actions (auth, properties, tenants, bills, payments, misc, admin)
src/app/(app)/*             the dashboard app (sidebar shell)
src/app/(auth)/*            login / register
src/app/(print)/*           A4 bill and money-receipt sheets
src/components/*            design-system pieces + forms
```

## Notes / next steps

- SMS delivery is simulated until `SMS_PROVIDER`/`SMS_API_KEY` are set; BulkSMSBD is implemented, other
  gateways need one function in `src/lib/sms.ts`.
- No tenant-facing portal yet (tenants receive SMS + printed receipts).
- Online payment (bKash checkout/QR) is recorded manually today; a gateway callback would slot into
  `recordPaymentAction`.
