import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { ReportsCharts } from "@/components/ReportsCharts";
import { SpendingHeatmap } from "@/components/SpendingHeatmap";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getServerT } from "@/lib/user-lang";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const t = await getServerT();

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

  const list = (txs ?? []) as any[];

  // 12-week range for heatmap
  const heatmapSince = new Date();
  heatmapSince.setDate(heatmapSince.getDate() - 83);
  const recent = list.filter((t) => new Date(t.occurred_at) >= heatmapSince);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Reports")}</h1>
          <p className="text-sm text-slate-500">{t("Last 6 months overview")}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/reports/tax"
            target="_blank"
            className="btn-secondary text-sm"
          >
            <FileText className="w-4 h-4" /> {t("Tax Report")}
          </Link>
          <Link
            href="/reports/print"
            target="_blank"
            className="btn-secondary text-sm"
          >
            <FileText className="w-4 h-4" /> {t("Monthly PDF")}
          </Link>
        </div>
      </div>

      <ReportsCharts transactions={list as any} />

      <div className="card p-5">
        <h3 className="font-semibold mb-3">📅 {t("Spending Heatmap")}</h3>
        <SpendingHeatmap
          transactions={recent}
          currency={ctx.workspace.default_currency}
        />
      </div>
    </div>
  );
}
