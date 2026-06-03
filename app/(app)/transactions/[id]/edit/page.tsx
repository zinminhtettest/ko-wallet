import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { TransactionForm } from "@/components/TransactionForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerT } from "@/lib/user-lang";

export default async function EditTransactionPage({ params }: { params: { id: string } }) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  const supabase = createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .single();

  if (!tx) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("name");

  return (
    <div className="max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back")}
      </Link>
      <h1 className="text-2xl font-bold mb-6">{t("Edit Transaction")}</h1>
      <TransactionForm
        workspaceId={ctx.workspace.id}
        categories={(categories || []) as any}
        defaultCurrency={ctx.workspace.default_currency as any}
        existing={tx as any}
      />
    </div>
  );
}
