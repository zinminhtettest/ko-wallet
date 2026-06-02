# Quick Setup — 30 Minutes Setup Guide
# (Step-by-step Myanmar + English)

ဒီ guide ကို စတင်ပြီး လိုက်လုပ်ပါ။ ၃၀ မိနစ်အတွင်း live အလုပ်လုပ်တဲ့ app ရပါမယ်။

---

## STEP 1 — Mac Terminal မှာ Project ဖွင့်ပါ (၂ မိနစ်)

```bash
cd "/Users/zmh/Documents/Claude/Projects/Ko Web/money-tracker"
npm install
```

ဘာလုပ်တာလဲ: လိုအပ်တဲ့ libraries တွေ install လုပ်တာ။
Expected output: `added N packages` (warnings တွေ ရှိနိုင်ပါတယ်၊ error မရှိရင် OK)။

---

## STEP 2 — Supabase Project ဖန်တီးပါ (၅ မိနစ်)

1. https://supabase.com ဖွင့်ပါ → **Start your project** (free)
2. GitHub နဲ့ sign in လုပ်ပါ
3. **New project** →
   - Name: `ko-wallet`
   - Database password: strong password ထည့်ပါ (သိမ်းထားပါ)
   - Region: **Southeast Asia (Singapore)**
4. Project ready ဖြစ်တဲ့အထိ ၁-၂ မိနစ် စောင့်ပါ

**API keys ယူပါ:** Settings → API
- `Project URL` ⇒ copy
- `anon public` key ⇒ copy
- `service_role` key (Reveal) ⇒ copy

---

## STEP 3 — Database Schema run လုပ်ပါ (၂ မိနစ်)

1. Supabase dashboard မှာ **SQL Editor** ⇒ **New query**
2. ဒီ project ထဲက `supabase/schema.sql` file တစ်ခုလုံး open လုပ်ပါ
3. Content အကုန် copy → SQL Editor မှာ paste → **Run** ▶️
4. "Success. No rows returned" ပေါ်လာရင် OK

---

## STEP 4 — Google Cloud OAuth Setup (၁၀ မိနစ်)

### 4.1 Project ဖန်တီးပါ
1. https://console.cloud.google.com → **Select project → New Project**
2. Name: `Ko Wallet` → Create

### 4.2 OAuth Consent Screen
1. Left menu → **APIs & Services → OAuth consent screen**
2. User Type: **External** → Create
3. App info:
   - App name: `Ko Wallet`
   - User support email: ကိုယ်ရဲ့ email
   - Developer email: ကိုယ်ရဲ့ email
4. **Save and Continue**
5. **Scopes** ⇒ Add or Remove Scopes ⇒ ဒီ ၂ ခု ရွေးပါ:
   - `.../auth/userinfo.email`
   - `.../auth/gmail.readonly`
6. **Save and Continue**
7. **Test users** ⇒ Add ⇒ ကိုယ်ရဲ့ Gmail + family members emails ထည့်ပါ
8. **Save and Continue → Back to Dashboard**

### 4.3 Gmail API Enable လုပ်ပါ
1. Left menu → **APIs & Services → Library**
2. Search: `Gmail API` → Click → **Enable**

### 4.4 OAuth Client ID ဖန်တီးပါ
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `Ko Wallet Web`
4. **Authorized JavaScript origins** ⇒ Add URI:
   - `http://localhost:3000`
5. **Authorized redirect URIs** ⇒ Add URI (၃ ခု ထည့်ပါ):
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/api/gmail/callback`
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     (YOUR_PROJECT_REF က Supabase project URL ထဲက ID — e.g. `abcdefgh`)
6. **Create**
7. Modal ပေါ်လာရင် **Client ID** + **Client Secret** ၂ ခု copy ပါ

### 4.5 Supabase မှာ Google provider Enable လုပ်ပါ
1. Supabase Dashboard → **Authentication → Providers → Google**
2. Enable toggle
3. Client ID + Client Secret paste
4. **Save**

---

## STEP 5 — Gemini API Key (၁ မိနစ်)

1. https://aistudio.google.com/apikey
2. **Create API key** → "Create API key in new project"
3. API key copy ပါ

---

## STEP 6 — .env.local ဖန်တီးပါ (၂ မိနစ်)

Mac Terminal:
```bash
cd "/Users/zmh/Documents/Claude/Projects/Ko Web/money-tracker"
cp .env.example .env.local
open -e .env.local
```

`.env.local` ထဲမှာ ဒီ values တွေ ဖြည့်ပါ:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...   (Supabase anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...        (Supabase service_role key)

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

GEMINI_API_KEY=AIzaSy...

NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=random_long_string_here_at_least_32_chars
```

CRON_SECRET အတွက် random string ဖန်တီးနည်း — Terminal မှာ:
```bash
openssl rand -hex 32
```
ထွက်လာတဲ့ string ကို `CRON_SECRET=` နောက်မှာ paste ပါ။

---

## STEP 7 — Local မှာ စမ်းကြည့်ပါ (၂ မိနစ်)

```bash
npm run dev
```

http://localhost:3000 ဖွင့်ပါ → **Get Started** → Google login

**Dashboard ပေါ်လာရင် ✅ all working!**

ပြီးရင် **Settings → Krungthai Bank → Connect Gmail** → Krungthai email ရှိတဲ့ account ရွေး → **Import Now** နှိပ်ပါ။

---

## STEP 8 — Vercel မှာ Deploy လုပ်ပါ (၅ မိနစ်)

### 8.1 GitHub repo တင်ပါ
Mac Terminal:
```bash
cd "/Users/zmh/Documents/Claude/Projects/Ko Web/money-tracker"
git init
git add .
git commit -m "Initial commit: Ko Wallet"
```

GitHub.com → **New repository** → name: `ko-wallet` → **Create**
```bash
git remote add origin https://github.com/YOUR_USERNAME/ko-wallet.git
git branch -M main
git push -u origin main
```

### 8.2 Vercel Import
1. https://vercel.com/new → GitHub repo `ko-wallet` ရွေး → **Import**
2. **Environment Variables** ⇒ `.env.local` ထဲက keys တွေ အကုန် ထည့်ပါ
3. `NEXT_PUBLIC_APP_URL` ⇒ `https://your-app.vercel.app` (Vercel က ပေးတဲ့ URL)
4. **Deploy**

### 8.3 Google OAuth ထဲမှာ Production URL ထည့်ပါ
Google Cloud Console → Credentials → OAuth client ID → Edit
- Authorized JavaScript origins: `https://your-app.vercel.app` ထည့်ပါ
- Authorized redirect URIs:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/api/gmail/callback`

---

## STEP 9 — Phone မှာ Install (၁ မိနစ်)

**Android:**
1. Chrome နဲ့ `https://your-app.vercel.app` ဖွင့်ပါ
2. ⋮ menu → **Add to Home screen** → Install
3. App icon ပေါ်လာမယ်

**iPhone (Safari):**
1. URL ဖွင့်ပါ → Share button → **Add to Home Screen**

ပြီးပြီ! APK လို install ဖြစ်တယ်၊ offline မှာလည်း သုံးနိုင်တယ်။

---

## တိုက်ဆိုင်တဲ့ ပြဿနာ Troubleshooting

**"npm: command not found"** → Node.js install လုပ်ပါ: https://nodejs.org (v20 LTS)

**Login လုပ်တုန်း redirect error** → Authorized redirect URIs မှာ URLs မှန်တယ်ဆိုတာ စစ်ပါ

**"refresh_token missing" Gmail connect error** → Google account → https://myaccount.google.com/permissions မှာ Ko Wallet ကို remove ပြီး ပြန် connect လုပ်ပါ

**Import Now run တုန်း error** → Gemini API key မှန်ကန်တယ်ဆိုတာ စစ်ပါ၊ free tier 1500 req/day quota မြောက်ပြီလားလည်း check ပါ

**Cron မ run တယ်** → Vercel Hobby plan က cron support မရှိ — manual "Import Now" သုံးပါ၊ ဒါမှမဟုတ် external cron (cron-job.org) သုံးပါ

ဘယ်လို issue ဖြစ်ဖြစ် Ko Web ကို error message screenshot နဲ့ ပြောပါ။
