import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { TransferForm } from "@/components/TransferForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewTransferPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const { data: wallets } = await supabase.rpc("list_my_workspaces");
  const list = (wallets ?? []) as any[];

  if (list.length < 2) {
    return (
      <div className="max-w-xl">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-4">Transfer Between Wallets</h1>
        <div className="card p-6 text-slate-600">
          Wallet ၂ ခု အနည်းဆုံး လိုပါတယ်။ Sidebar (သို့) Top bar က Workspace switcher → <b>+ New Wallet</b> နဲ့ ထပ်ဆောက်ပါ။
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Transfer Between Wallets</h1>
      <p className="text-sm text-slate-500 mb-6">
        From wallet မှာ expense, To wallet မှာ income ၂ ခု linked ဖန်တီးတယ်။
      </p>
      <TransferForm wallets={list} defaultFromId={ctx.workspace.id} />
    </div>
  );
}
