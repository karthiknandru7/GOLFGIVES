# GolfGives — Golf Charity Subscription Platform

A subscription-based golf platform combining Stableford score tracking,
monthly prize draws, and charitable giving.

---

## Folder Structure

```
golf-charity-platform/
│
├── backend/
│   └── supabase/
│       └── migrations/
│           ├── 001_schema.sql     ← Full DB schema (run first)
│           └── 002_storage.sql    ← Storage bucket setup (run second)
│
└── frontend/                      ← Next.js application (deploy to Vercel)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx               ← Public homepage
    │   │   ├── charities/page.tsx     ← Public charity directory
    │   │   ├── auth/
    │   │   │   ├── login/page.tsx     ← Login page
    │   │   │   └── register/page.tsx  ← Signup + plan + charity selection
    │   │   ├── dashboard/page.tsx     ← Subscriber dashboard (5 modules)
    │   │   ├── admin/page.tsx         ← Admin panel (full control)
    │   │   └── api/
    │   │       ├── scores/route.ts           ← POST score (server validated)
    │   │       ├── draws/
    │   │       │   ├── run/route.ts          ← POST run draw (admin only)
    │   │       │   └── publish/route.ts      ← POST publish draw (admin only)
    │   │       ├── subscriptions/
    │   │       │   └── webhook/route.ts      ← Stripe webhook handler
    │   │       ├── winners/
    │   │       │   └── proof/route.ts        ← POST proof upload
    │   │       └── admin/
    │   │           └── analytics/route.ts    ← GET analytics (admin only)
    │   ├── lib/
    │   │   ├── supabase.ts       ← Supabase browser + admin clients
    │   │   ├── auth.ts           ← Auth helpers (signIn, signUp, etc.)
    │   │   └── draw-engine.ts    ← Prize pool calc + draw algorithm
    │   ├── types/
    │   │   └── index.ts          ← All TypeScript types
    │   └── styles/
    │       └── globals.css       ← Global CSS (design system)
    ├── .env.example              ← Copy to .env.local and fill in
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    └── vercel.json
```

---

## Language Reference — What Goes Where

| Language / Tech      | Used for                                              |
|----------------------|-------------------------------------------------------|
| **TypeScript**       | All frontend components, API routes, business logic   |
| **TSX (JSX)**        | React UI pages and components                         |
| **CSS**              | Global design system (`globals.css`)                  |
| **SQL**              | Database schema, RLS policies, triggers, functions    |
| **JSON**             | Config files (package.json, tsconfig.json, vercel.json)|

---

## Step 1 — Supabase Setup (Database)

1. Go to [supabase.com](https://supabase.com) → **New project** (use a brand new account)
2. Choose a strong database password and save it
3. Once created, go to **SQL Editor**
4. Paste and run `backend/supabase/migrations/001_schema.sql`
5. Then paste and run `backend/supabase/migrations/002_storage.sql`
6. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Stripe Setup (Payments)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → create account
2. Go to **Developers → API keys** and copy your **Secret key** → `STRIPE_SECRET_KEY`
3. Go to **Developers → Webhooks** → Add endpoint
   - URL: `https://your-vercel-url.vercel.app/api/subscriptions/webhook`
   - Events to listen for:
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 3 — Local Development

```bash
# 1. Enter the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your values
cp .env.example .env.local
# Edit .env.local with your Supabase + Stripe keys

# 4. Start dev server
npm run dev

# App runs at http://localhost:3000
```

---

## Step 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New project** (brand new account as per PRD)
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add all environment variables from `.env.example` in Vercel's dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL` ← set to your Vercel URL after deploy
5. Click **Deploy**

---

## Step 5 — Create Your Admin User

After deploying, register a normal account through the website.
Then in **Supabase → SQL Editor**, promote it to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

## Test Checklist (per PRD evaluation criteria)

- [ ] User signup → email + plan + charity selection flow
- [ ] User login → redirects to dashboard
- [ ] Admin login → redirects to admin panel
- [ ] Score entry → 5-score rolling logic (6th removes oldest)
- [ ] Score validation → 1–45 only, date required
- [ ] Charity directory → search + filter + featured spotlight
- [ ] Admin: run draw (random + algorithmic mode)
- [ ] Admin: simulate before publish
- [ ] Admin: publish draw → users see results in dashboard
- [ ] Draw matching → 3/4/5 number match detection
- [ ] Prize pool → 40/35/25% split auto-calculated
- [ ] Jackpot rollover → when no 5-match winner
- [ ] Winner verification → proof upload → admin approve/reject → mark paid
- [ ] Subscription status validated on every request
- [ ] Stripe webhook → updates subscription status on renewal/cancellation
- [ ] Responsive on mobile + desktop

---

## Test Credentials (set up manually after deploying)

| Role          | Email                        | Password       |
|---------------|------------------------------|----------------|
| Subscriber    | `test@golfgives.com`         | `Test1234!`    |
| Admin         | `admin@golfgives.com`        | `Admin1234!`   |

> Create these accounts via the registration flow, then promote the admin via SQL above.

---

## Scalability Notes (per PRD section 14)

- Architecture is stateless — Vercel scales horizontally automatically
- Supabase PostgreSQL supports multi-region read replicas
- Charity, draw, and subscription models are extensible to teams/corporate accounts
- All business logic is in `src/lib/` — portable to a mobile app (React Native)
- Campaign module can be added as a new table + API route without touching existing code
