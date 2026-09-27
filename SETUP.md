# WEFIT — Setup

## 1. Environment variables

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and paste your **anon (publishable) key**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → open the **wefit** project
2. Left sidebar → **Project Settings** (gear) → **API**
3. Copy the **anon / publishable** key (NOT the service_role secret)
4. Paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The database tables are already created (`wefit_schema.sql`) and seeded
(`wefit_seed.sql`: 55 exercises, 1225 Indian dishes).

## 2. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — register an account, complete onboarding, and start logging.

## 3. Deploy (Vercel, recommended)

1. Push this folder to a GitHub repo
2. Import the repo in [Vercel](https://vercel.com)
3. Add the same two env vars in **Project Settings → Environment Variables**
4. Deploy — every push redeploys automatically

Netlify works too (`npm run build` → publish `.next`), but Vercel is zero-config for Next.js.
