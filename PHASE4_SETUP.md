# Phase 4 Setup — Final Steps

ညီလေး — code တွေ ပြီးပါပြီ။ Mac terminal မှာ 1-2-3 လုပ်ပါ:

## 1. Commit + push (Mac terminal)

```bash
cd ~/Documents/Claude/Projects/Ko\ Web/money-tracker
rm -f .git/index.lock
git add -A
git commit -m "Phase 4: CSV export + Recurring + Budgets + Telegram bot + OCR receipt scan"
git push origin main
```

## 2. Supabase SQL migration

Open **Supabase → SQL Editor** → paste contents of `sql/phase4.sql` → **Run**.

တစ်ခါတည်း တစ်ပိုင်းပိုင်း run လုပ်လို့ ရတယ်။ Tables: `recurring_rules`, `budgets`, `telegram_links`, `telegram_link_codes` တွေ ဖန်တီးပြီး `budget_status(ws_id)` RPC ထည့်ပါမယ်။

## 3. Vercel environment variables

Vercel → ko-wallet project → Settings → Environment Variables → Add:

| Key | Value | Note |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | (BotFather က ပေးတဲ့ token) | Production + Preview |
| `TELEGRAM_BOT_USERNAME` | (e.g. `ko_wallet_bot`) | without @ |
| `TELEGRAM_WEBHOOK_SECRET` | random string (e.g. `openssl rand -hex 16` output) | secret |

ပြီးရင် Vercel မှာ **Redeploy** လုပ်ပါ။

## 4. Create Telegram bot

1. Telegram app မှာ **@BotFather** ရှာ → `/newbot`
2. Bot name + username ပေး (e.g. `Ko Wallet`, `ko_wallet_bot`)
3. BotFather က ပေးတဲ့ **HTTP API token** ကို `TELEGRAM_BOT_TOKEN` env var ထဲ ထည့်
4. Bot username ကို `TELEGRAM_BOT_USERNAME` env var ထဲ ထည့်

## 5. Set Telegram webhook

Mac terminal မှာ run:

```bash
BOT_TOKEN="<your bot token>"
WEBHOOK_SECRET="<your TELEGRAM_WEBHOOK_SECRET>"
curl -F "url=https://ko-wallet.vercel.app/api/telegram/webhook?secret=${WEBHOOK_SECRET}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook"
```

တုံ့ပြန်ချက်က `{"ok":true,"result":true,...}` ဆိုရင် webhook ပြီး။

---

## What's new — Test plan

### ✅ CSV Export
- Transactions page → **Export** button (top right) → CSV download
- Excel မှာ ဖွင့်လို့ ရတယ် (UTF-8 BOM ထည့်ထားလို့ Thai/Myanmar text မှန်တယ်)

### ✅ Recurring Transactions
- Settings → **Recurring Transactions** → **Add Rule**
- Daily / Weekly / Monthly schedule နဲ့ ထည့်
- Cron က daily 1am UTC မှာ run လုပ်ပြီး due ဖြစ်တာတွေ auto-create

### ✅ Budgets
- Settings → **Budgets** → category တစ်ခုစီအတွက် monthly limit သတ်မှတ်
- Transaction save လုပ်တိုင်း automatic ထောက်ပြ — 80% ရောက်ရင် yellow alert, 100%+ ရင် red alert ပေး
- Notification ဘယ်လ်မှာ ပေါ်လာမယ်

### ✅ Telegram Bot
- Settings → **Telegram Bot** → **Generate code** → 6-digit
- Bot ထဲမှာ `/link 123456` ပို့
- ပြီးရင် `/balance`, `/add 250 thb food coffee` တွေ သုံးလို့ရ

### ✅ OCR Receipt Scanner
- Transactions → Add → **Scan Receipt** button (top right)
- ဒါမှ Camera/Upload → Gemini AI က amount + merchant + date parse → form ထဲ auto-fill
- Mobile ပေါ်မှာ camera တိုက်ရိုက် တင်လို့ ရ
