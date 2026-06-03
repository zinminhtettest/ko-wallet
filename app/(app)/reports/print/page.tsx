import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatMoney } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";
import { ClientDate } from "@/components/ClientDate";
import { getServerT } from "@/lib/user-lang";

export const dynamic = "force-dynamic";

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  const supabase = createClient();

  // Default to current month
  const now = new Date();
  const monthStr = searchParams.month || now.toISOString().slice(0, 7);
  const [yearStr, mStr] = monthStr.split("-");
  const year = parseInt(yearStr);
  const monthIdx = parseInt(mStr) - 1;
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59));

  const { data: txs } = await supabase
    .from("transactions")
    .select(
      "id, amount, currency, kind, note, merchant, occurred_at, tax_deductible, created_by_name, telegram_username, category:categories(name)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });

  const list = (txs ?? []) as any[];

  // Aggregates by currency
  const totals: Record<string, { income: number; expense: number; tax: number }> = {};
  const byCategory: Record<string, Record<string, number>> = {};
  for (const t of list) {
    const c = t.currency;
    totals[c] = totals[c] || { income: 0, expense: 0, tax: 0 };
    if (t.kind === "income") totals[c].income += Number(t.amount);
    else {
      totals[c].expense += Number(t.amount);
      if (t.tax_deductible) totals[c].tax += Number(t.amount);
      const cat = t.category?.name || "Uncategorized";
      byCategory[c] = byCategory[c] || {};
      byCategory[c][cat] = (byCategory[c][cat] || 0) + Number(t.amount);
    }
  }

  const monthLabel = start.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto print:p-0">
      <style>{`
        @media print {
          html, body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page-break { page-break-after: always; }
        }
        @page { size: A4; margin: 1.5cm; }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <a href="/reports" className="text-sm text-brand-600 underline">
          ← {t("Back to Reports")}
        </a>
        <PrintButton />
      </div>

      <div className="border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">{t("Ko Wallet Report")}</h1>
        <div className="text-slate-600">
          <div><b>{t("Wallet")}:</b> {ctx.workspace.name}</div>
          <div><b>{t("Period")}:</b> {monthLabel}</div>
          <div><b>{t("Generated")}:</b> <ClientDate value={new Date()} withTime /></div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">{t("Summary")}</h2>
      <table className="w-full text-sm mb-8 border-collapse">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Currency</th>
            <th className="py-2 text-right">Income</th>
            <th className="py-2 text-right">Expense</th>
            <th className="py-2 text-right">Net</th>
            <th className="py-2 text-right">Tax-deductible</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(totals).map(([c, v]) => (
            <tr key={c} className="border-b">
              <td className="py-2 font-semibold">{c}</td>
              <td className="py-2 text-right text-green-700">+{formatMoney(v.income, c)}</td>
              <td className="py-2 text-right text-red-700">−{formatMoney(v.expense, c)}</td>
              <td className="py-2 text-right font-bold">{formatMoney(v.income - v.expense, c)}</td>
              <td className="py-2 text-right text-slate-600">{formatMoney(v.tax, c)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {Object.entries(byCategory).map(([cur, cats]) => (
        <div key={cur} className="mb-6">
          <h3 className="text-lg font-bold mb-2">Expense breakdown — {cur}</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cats)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <tr key={cat} className="border-b">
                    <td className="py-2">{cat}</td>
                    <td className="py-2 text-right">{formatMoney(amt, cur)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="print-page-break" />

      <h2 className="text-xl font-bold mb-3">All Transactions ({list.length})</h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Date</th>
            <th className="py-2">Kind</th>
            <th className="py-2">Category</th>
            <th className="py-2">Merchant / Note</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2">Tax</th>
            <th className="py-2">By</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="py-1.5 whitespace-nowrap">
                <ClientDate value={t.occurred_at} />
              </td>
              <td className="py-1.5">{t.kind}</td>
              <td className="py-1.5">{t.category?.name || "—"}</td>
              <td className="py-1.5">{t.merchant || t.note || "—"}</td>
              <td className="py-1.5 text-right whitespace-nowrap">
                {t.kind === "income" ? "+" : "−"} {formatMoney(Number(t.amount), t.currency)}
              </td>
              <td className="py-1.5">{t.tax_deductible ? "✓" : ""}</td>
              <td className="py-1.5">
                {t.telegram_username || t.created_by_name || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
