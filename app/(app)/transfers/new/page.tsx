import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { TransferForm } from "@/components/TransferForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerT } from "@/lib/user-lang";

export default async function NewTransferPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  const supabase = createClient();
  const { data: wallets } = await supabase.rpc("list_my_workspaces");
  const list = (wallets ?? []) as any[];

  if (list.length < 2) {
    return (
      <div className="max-w-xl">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back")}
        </Link>
        <h1 className="text-2xl font-bold mb-4">{t("Transfer Between Wallets")}</h1>
        <div className="card p-6 text-slate-600">
          {t("You need at least 2 wallets. Create another from the Workspace switcher in the sidebar or top bar — press \"+ New Wallet\".")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back")}
      </Link>
      <h1 className="text-2xl font-bold mb-2">{t("Transfer Between Wallets")}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {t("Creates two linked transactions: an expense in the From wallet and an income in the To wallet.")}
      </p>
      <TransferForm wallets={list} defaultFromId={ctx.workspace.id} />
    </div>
  );
}
