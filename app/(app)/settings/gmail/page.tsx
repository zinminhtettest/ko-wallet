import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ImportNowButton } from "@/components/ImportNowButton";
import { BankPicker } from "@/components/BankPicker";
import { THAI_BANKS, labelForBankKey } from "@/lib/banks";
import { ClientDate } from "@/components/ClientDate";
import { getServerT } from "@/lib/user-lang";

export default async function GmailSettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; disconnected?: string; error?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();

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
        <Link href="/settings" className="text-sm text-slate-500">← {t("Settings")}</Link>
        <h1 className="text-2xl font-bold mt-1">{t("Bank — Gmail Auto-Import")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("We auto-import transaction notification emails sent by Thai banks to your Gmail. You can pick more than one bank.")}
        </p>
      </div>

      {searchParams.connected && (
        <div className="rounded-xl bg-green-50 text-green-800 p-4 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{t("Connected!")}</div>
            <div className="text-xs">{t("Pick your banks below, then press \"Import Now\".")}</div>
          </div>
        </div>
      )}
      {searchParams.disconnected && (
        <div className="rounded-xl bg-amber-50 text-amber-800 p-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{t("Gmail connection has been removed.")}</div>
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-xl bg-red-50 text-red-800 p-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{t("Error")}</div>
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
                  <h3 className="font-semibold">{t("Gmail Connected")}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">{t("Active")}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{conn.email}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {t("Last sync")}: {conn.last_synced_at ? <ClientDate value={conn.last_synced_at} withTime /> : t("Never")}
                </p>
                <p className="text-xs text-slate-500">
                  {t("Banks")}: {bankKeys.length ? bankKeys.map(labelForBankKey).join(", ") : t("All Thai banks")}
                </p>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <ImportNowButton />
                  <form action="/api/gmail/disconnect" method="POST">
                    <button className="btn-danger text-sm">{t("Disconnect")}</button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold">{t("Not connected")}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {t("Connect a Gmail account that receives your bank emails. We only request read-only access.")}
                </p>
                <a href="/api/gmail/connect" className="btn-primary mt-4 inline-flex">
                  <Mail className="w-4 h-4" /> {t("Connect Gmail")}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {conn?.is_active && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">{t("Choose your banks")}</h3>
          <BankPicker connectionId={conn.id} initialKeys={bankKeys} />
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> {t("How it works")}
        </h3>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
          <li>{t("Press \"Connect Gmail\" and sign in with the Gmail account that receives bank emails.")}</li>
          <li>{t("Read-only permission only — we can never send messages.")}</li>
          <li>{t("Then pick your banks —")} {THAI_BANKS.length} {t("banks supported.")}</li>
          <li>{t("Gemini AI parses amount, merchant, date, and category, then adds the transaction.")}</li>
          <li>{t("Each email is imported once (deduped by Gmail message ID).")}</li>
          <li>{t("Cron auto-syncs daily at 1 AM UTC (8 AM Bangkok). You can disconnect anytime.")}</li>
        </ol>
      </div>
    </div>
  );
}
