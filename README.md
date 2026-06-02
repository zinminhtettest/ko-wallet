# Ko Wallet — Family Money Tracker PWA

မိသားစုသုံး expense/income tracker with Krungthai Bank email auto-import.

**Tech stack** — Next.js 14 (App Router) · Supabase (Auth + Postgres) · Gmail API · Gemini 2.5 Flash · Recharts · Tailwind · PWA.

**Cost** — $0/mo at small scale (all free tiers).

---

## Quick Start (Local Dev)

```bash
cd money-tracker
npm install
cp .env.example .env.local
# fill in keys (see Setup section below)
npm run dev
```

Open http://localhost:3000

---

## Setup — Step by Step (ဆောက်ပုံ)

### 1. Supabase Project ဖန်တီးပါ

1. https://supabase.com → Start your project (free) → Sign in with GitHub
2. New project → name: `ko-wallet`, region: **Singapore** (closest to Thailand)
3. Strong DB password ထည့်ပါ → save it
4. Project ready ဖြစ်ပြီးတဲ့အခါ **Settings → API** မှာ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (secret) → `SUPABASE_SERVICE_ROLE_KEY`
5. **SQL Editor** ဖွင့်ပြီး `supabase/schema.sql` ထဲက content တစ်ခုလုံး copy-paste → **Run**
6. **Authentication → Providers → Google** → Enable.
   Client ID/Secret တွေ Step 2 မှာ ရပါမယ်။

### 2. Google Cloud — OAuth Setup (Login + Gmail)

1. https://console.cloud.google.com → New project: `ko-wallet`
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name: Ko Wallet
   - Support email + Developer email: your email
   - Scopes: `userinfo.email`, `gmail.readonly`
   - Test users: ကိုယ်ရဲ့ Gmail account + family members
3. **APIs & Services → Library** → **Gmail API** → Enable
4. **Credentials → Create Credentials → OAuth client ID**:
   - Type: **Web application**
   - Name: Ko Wallet Web
   - Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR_DOMAIN`
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (Supabase sign-in)
     - `http://localhost:3000/api/gmail/callback` (Gmail connect)
     - `https://YOUR_PROJECT.supabase.co/auth/v1/callback` (Supabase Google OAuth)
     - Add `https://YOUR_DOMAIN/...` versions later for production
5. Client ID + Secret ရတဲ့အခါ:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` → `.env.local`
   - Same Client ID/Secret ကို **Supabase → Auth → Google provider** မှာ paste ပါ

### 3. Gemini API Key

1. https://aistudio.google.com/apikey (free)
2. Create API key → copy → `GEMINI_API_KEY` → `.env.local`
3. **Free tier**: 1500 requests/day (Krungthai email auto-import အတွက် လုံလောက်ပါတယ်)

### 4. Generate CRON_SECRET

```bash
openssl rand -hex 32
```
Copy output → `CRON_SECRET` → `.env.local`

### 5. Local Test

```bash
npm install
npm run dev
```
- Open http://localhost:3000
- Sign in with Google → Dashboard ပေါ်လာရင် auth OK
- Settings → Krungthai Bank → Connect Gmail → Krungthai email ရှိတဲ့ account သုံးပါ
- "Import Now" ကို နှိပ်ပြီး စမ်းပါ

---

## Deploy to Vercel (Production)

1. https://vercel.com → Sign in with GitHub
2. Push this folder to a new GitHub repo
3. Vercel → New Project → Import repo
4. **Environment Variables** → Add all keys from `.env.local`
5. `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`
6. Deploy
7. Google Cloud Console မှာ Authorized redirect URIs ထဲ Vercel URL ထည့်ပါ (production)
8. Vercel Cron က `vercel.json` ထဲက schedule ကို auto-detect လုပ်ပါတယ် — Pro plan မှ work တယ်။
   Hobby plan သုံးရင် external cron (cron-job.org, EasyCron) သုံးပြီး `GET https://your-app.vercel.app/api/cron/sync` ကို Bearer token နဲ့ ခေါ်ပါ။

---

## Install as PWA (Android/iOS/Desktop)

### Android (Chrome)
1. Open your deployed URL on Android Chrome
2. Tap **⋮ menu → "Add to Home screen"** → Install
3. App icon ပေါ်လာမယ်၊ APK လို install ဖြစ်တယ်

### iOS (Safari)
1. Open URL on Safari
2. Share button → **"Add to Home Screen"**

### Desktop (Chrome/Edge)
1. URL ဘားက ⊕ install icon → Install

---

## Krungthai Email — How Auto-Import Works

1. **Settings → Krungthai Bank → Connect Gmail** → Krungthai notification ရတဲ့ Gmail account ရွေးပါ
2. Read-only permission ပဲ ပေးထား — message ပို့လို့ မရဘူး
3. Default senders: `ktbalert@ktb.co.th`, `kma@ktbnetbank.com`, `no-reply@ktb.co.th`
   (other senders ထည့်ချင်ရင် `KRUNGTHAI_EMAIL_SENDERS` env var မှာ comma-separated ထည့်ပါ)
4. Gemini AI က email ထဲက amount, merchant, date, category တွေ ထုတ်ပြီး transaction အဖြစ် add လုပ်တယ်
5. Gmail message ID နဲ့ dedup လုပ်ထားလို့ ထပ်တ ထည့်မ မဖြစ်ဘူး
6. Cron က နာရီတိုင်း last 2 days emails ကို scan လုပ်ပါတယ်
7. ဘယ်တော့မဆို **Disconnect** button နှိပ်လို့ ဖြုတ်နိုင်တယ်

---

## Cost Breakdown

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Vercel | 100GB bandwidth | Way more than needed |
| Supabase | 500MB DB, 50K MAU | More than enough |
| Gemini 2.5 Flash | 1500 req/day | One req per Krungthai email |
| Gmail API | 1B units/day | Free for read-only |
| **Total** | **$0/month** | At small scale |

Production scale (1000+ users) — would cost ~$25/mo (Supabase Pro).

---

## Security Notes

- Service role key က `.env.local` မှာ ထား — client side မ expose ဖြစ်ပါ
- All Supabase tables have RLS (Row Level Security) policies
- Gmail tokens တွေက `gmail_connections` table မှာ store လုပ်ထား၊ user သာ access ရတယ်
- Disconnect button နှိပ်ရင် Google OAuth တွေ revoke လုပ်ပြီး tokens delete လုပ်ပါတယ်
- HTTPS only in production (Vercel auto)

---

## Project Structure

```
money-tracker/
├── app/
│   ├── (app)/              # Authenticated route group
│   │   ├── dashboard/      # Main dashboard
│   │   ├── transactions/   # List + add/edit
│   │   ├── reports/        # Charts
│   │   ├── settings/       # Workspace + Gmail
│   │   └── layout.tsx      # Shell with sidebar
│   ├── api/
│   │   ├── gmail/          # OAuth connect/callback/disconnect
│   │   ├── import-krungthai/ # Fetch + parse emails
│   │   ├── invites/        # Workspace invites
│   │   └── cron/sync/      # Vercel Cron entrypoint
│   ├── auth/callback/      # Supabase OAuth return
│   ├── invite/[token]/     # Accept invite
│   ├── login/              # Login page
│   └── page.tsx            # Landing
├── components/             # Reusable UI
├── lib/
│   ├── supabase/           # client + server helpers
│   ├── gmail.ts            # OAuth + email parsing
│   ├── gemini.ts           # AI transaction parser
│   ├── utils.ts            # cn(), formatMoney(), etc.
│   └── workspace.ts        # getActiveWorkspace()
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # 192/512 PNG icons
├── supabase/schema.sql     # DB schema + RLS + triggers
└── vercel.json             # Cron schedule
```

---

## Next Steps (Future Enhancements)

- [ ] Telegram bot integration — add expense via chat
- [ ] CSV import for other banks (KBZ, Bangkok Bank)
- [ ] Budget alerts (push notification when over budget)
- [ ] Multi-workspace switching (Personal + BSM Boost + Visa Service)
- [ ] Export to Excel
- [ ] OCR for receipt photos
- [ ] Recurring transaction templates

---

အကြောင်းကြားလိုတာရှိရင် Ko Web ကို မေးပါ။
