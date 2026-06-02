import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ImportNowButton } from "@/components/ImportNowButton";
import { BankPicker } from "@/components/BankPicker";
import { THAI_BANKS, labelForBankKey } from "@/lib/banks";
import { ClientDate } from "@/components/ClientDate";

export default async function GmailSettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; disconnected?: string; error?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;

  const srv = createServiceClient();
  const { data: conn } = await srv
    .from("gmail_connections")
    .select("id, email, last_synced_at, is_active, created_at, bank_keys")
    .eq("user_id", ctx.user.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  const bankKeys: string[] = Array.isArray(conn?.bank_keys) ? conn.bank_keys : ["KRUNGTHAI"];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href="/settings" className="text-sm text-slate-500">← Settings</Link>
        <h1 className="text-2xl font-bold mt-1">Bank — Gmail Auto-Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Thai bank တွေက Gmail ထဲ ပို့တဲ့ transaction notification email တွေကို
          auto-import လုပ်ပါတယ်။ Bank တစ်ခုထက်ပို ရွေးနိုင်တယ်။
        </p>
      </div>

      {searchParams.connected && (
        <div className="rounded-xl bg-green-50 text-green-800 p-4 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Connected!</div>
            <div className="text-xs">အောက်မှာ bank တွေ ရွေး၊ "Import Now" နှိပ်ပါ။</div>
          </div>
        </div>
      )}
      {searchParams.disconnected && (
        <div className="rounded-xl bg-amber-50 text-amber-800 p-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>Gmail connection ဖြုတ်ပြီးပါပြီ။</div>
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-xl bg-red-50 text-red-800 p-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Error</div>
            <div className="text-xs break-all">{searchParams.error}</div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
            <Mail className="w-6 h-6" />
          </div>
          <div className="flex-1">
            {conn?.is_active ? (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Gmail Connected</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Active</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{conn.email}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Last sync: {conn.last_synced_at ? <ClientDate value={conn.last_synced_at} withTime /> : "Never"}
                </p>
                <p className="text-xs text-slate-500">
                  Banks: {bankKeys.length ? bankKeys.map(labelForBankKey).join(", ") : "All Thai banks"}
                </p>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <ImportNowButton />
                  <form action="/api/gmail/disconnect" method="POST">
                    <button className="btn-danger text-sm">Disconnect</button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold">Not connected</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Bank email တွေ ပါတဲ့ Gmail အကောင့်နဲ့ ချိတ်ပါ။ Read-only access ပဲ ယူပါတယ်။
                </p>
                <a href="/api/gmail/connect" className="btn-primary mt-4 inline-flex">
                  <Mail className="w-4 h-4" /> Connect Gmail
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {conn?.is_active && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Choose your banks</h3>
          <BankPicker connectionId={conn.id} initialKeys={bankKeys} />
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> How it works
        </h3>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
          <li>"Connect Gmail" နှိပ်ပြီး bank email ရှိတဲ့ Gmail အကောင့်နဲ့ login လုပ်ပါ။</li>
          <li>Read-only permission ပဲ — ဘယ်တော့မှ message ပို့လို့ မရပါဘူး။</li>
          <li>လုပ်ပြီးရင် bank တွေ ရွေး — {THAI_BANKS.length} banks support ထားတယ်။</li>
          <li>Gemini AI က amount, merchant, date, category ကို parse လုပ်ပြီး transaction အဖြစ် ထည့်ပေးတယ်။</li>
          <li>တစ်ခါ ထည့်ပြီး email ကို ထပ်တ ထည့်ပါဘူး (dedup by Gmail message ID)။</li>
          <li>နေ့စဥ် 1 AM UTC (8 AM Bangkok) cron auto sync — ဘယ်တော့မဆို Disconnect လုပ်လို့ ရတယ်။</li>
        </ol>
      </div>
    </div>
  );
}
