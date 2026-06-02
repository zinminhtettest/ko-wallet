import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { TransactionForm } from "@/components/TransactionForm";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: {
    amount?: string;
    currency?: string;
    merchant?: string;
    occurred_at?: string;
    note?: string;
    category_hint?: string;
  };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("name");

  const list = (categories || []) as any[];
  let prefillCategoryId: string | undefined;
  if (searchParams.category_hint) {
    const hint = searchParams.category_hint.toLowerCase();
    const match = list.find(
      (c) => c.kind === "expense" && c.name.toLowerCase().includes(hint)
    );
    if (match) prefillCategoryId = match.id;
  }

  const prefill = {
    amount: searchParams.amount,
    currency: searchParams.currency,
    merchant: searchParams.merchant,
    note: searchParams.note,
    occurred_at: searchParams.occurred_at,
    category_id: prefillCategoryId,
  };
  const hasPrefill = Object.values(prefill).some((v) => v != null && v !== "");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>
        <Link
          href="/transactions/scan"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-300 bg-brand-50 text-brand-700 text-sm"
        >
          <Camera className="w-4 h-4" /> Scan Receipt
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Add Transaction</h1>
      {hasPrefill && (
        <div className="mb-4 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-sm p-3">
          ✨ AI prefilled from receipt — review and Save.
        </div>
      )}
      <TransactionForm
        workspaceId={ctx.workspace.id}
        categories={list as any}
        defaultCurrency={ctx.workspace.default_currency as any}
        prefill={hasPrefill ? prefill : undefined}
      />
    </div>
  );
}
