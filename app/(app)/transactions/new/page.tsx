import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { TransactionForm } from "@/components/TransactionForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewTransactionPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("name");

  return (
    <div className="max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-6">Add Transaction</h1>
      <TransactionForm
        workspaceId={ctx.workspace.id}
        categories={(categories || []) as any}
        defaultCurrency={ctx.workspace.default_currency as any}
      />
    </div>
  );
}
