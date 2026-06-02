import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { RecurringManager } from "@/components/RecurringManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function RecurringPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const { data: cats } = await supabase
    .from("categories")
    .select("id, workspace_id, name, icon, color, kind, is_system")
    .eq("workspace_id", ctx.workspace.id)
    .order("name");

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
      </Link>
      <h1 className="text-2xl font-bold">Recurring Transactions</h1>
      <RecurringManager categories={(cats ?? []) as any} />
    </div>
  );
}
