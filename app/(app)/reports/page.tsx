import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { ReportsCharts } from "@/components/ReportsCharts";

export default async function ReportsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();

  // Last 6 months
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1); since.setHours(0,0,0,0);

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, amount, currency, kind, occurred_at, category:categories(name, color)")
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-slate-500">Last 6 months overview</p>
      </div>
      <ReportsCharts transactions={(txs ?? []) as any} />
    </div>
  );
}
