import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatMoney } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";
import { ClientDate } from "@/components/ClientDate";

export const dynamic = "force-dynamic";

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const year = parseInt(searchParams.year || String(new Date().getUTCFullYear()));
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const { data: all } = await supabase
    .from("transactions")
    .select(
      "amount, currency, kind, occurred_at, note, merchant, tax_deductible, category:categories(name)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: true });

  const list = (all ?? []) as any[];
  const taxRows = list.filter((t) => t.tax_deductible && t.kind === "expense");
  const incomeRows = list.filter((t) => t.kind === "income");

  // Totals by currency
  const incomeByCur: Record<string, number> = {};
  const taxByCur: Record<string, number> = {};
  const taxByCategoryByCur: Record<string, Record<string, number>> = {};
  const incomeByMonth: Record<string, Record<string, number>> = {};
  for (const t of incomeRows) {
    incomeByCur[t.currency] = (incomeByCur[t.currency] || 0) + Number(t.amount);
    const month = t.occurred_at.slice(0, 7);
    incomeByMonth[t.currency] = incomeByMonth[t.currency] || {};
    incomeByMonth[t.currency][month] = (incomeByMonth[t.currency][month] || 0) + Number(t.amount);
  }
  for (const t of taxRows) {
    taxByCur[t.currency] = (taxByCur[t.currency] || 0) + Number(t.amount);
    const cat = t.category?.name || "Uncategorized";
    taxByCategoryByCur[t.currency] = taxByCategoryByCur[t.currency] || {};
    taxByCategoryByCur[t.currency][cat] =
      (taxByCategoryByCur[t.currency][cat] || 0) + Number(t.amount);
  }

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto print:p-0">
      <style>{`
        @media print {
          html, body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
        @page { size: A4; margin: 1.5cm; }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <a href="/reports" className="text-sm text-brand-600 underline">
          ← Back to Reports
        </a>
        <div className="flex gap-2">
          <a
            href={`?year=${year - 1}`}
            className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg"
          >
            ← {year - 1}
          </a>
          <a
            href={`?year=${year + 1}`}
            className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg"
          >
            {year + 1} →
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">Tax Report</h1>
        <div className="text-slate-600">
          <div><b>Wallet:</b> {ctx.workspace.name}</div>
          <div><b>Tax Year:</b> {year}</div>
          <div><b>Generated:</b> <ClientDate value={new Date()} withTime /></div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Annual Income</h2>
      {Object.keys(incomeByCur).length === 0 ? (
        <p className="text-slate-500 italic mb-6">No income recorded in {year}.</p>
      ) : (
        <table className="w-full text-sm mb-8 border-collapse">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Currency</th>
              <th className="py-2 text-right">Total Income</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(incomeByCur).map(([cur, amt]) => (
              <tr key={cur} className="border-b">
                <td className="py-2 font-semibold">{cur}</td>
                <td className="py-2 text-right text-green-700">
                  {formatMoney(amt, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-xl font-bold mb-3">Tax-Deductible Expenses Summary</h2>
      {Object.keys(taxByCur).length === 0 ? (
        <p className="text-slate-500 italic mb-6">
          No tax-deductible expenses tagged in {year}. Mark business expenses with
          the "Tax-deductible" checkbox to populate this section.
        </p>
      ) : (
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Currency</th>
              <th className="py-2 text-right">Tax-Deductible Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(taxByCur).map(([cur, amt]) => (
              <tr key={cur} className="border-b">
                <td className="py-2 font-semibold">{cur}</td>
                <td className="py-2 text-right">{formatMoney(amt, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {Object.entries(taxByCategoryByCur).map(([cur, cats]) => (
        <div key={cur} className="mb-6">
          <h3 className="text-lg font-bold mb-2">Tax-Deductible Breakdown — {cur}</h3>
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

      <div className="page-break" />

      <h2 className="text-xl font-bold mb-3">All Tax-Deductible Transactions ({taxRows.length})</h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">Date</th>
            <th className="py-2">Category</th>
            <th className="py-2">Merchant / Note</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {taxRows.map((t, i) => (
            <tr key={i} className="border-b">
              <td className="py-1.5"><ClientDate value={t.occurred_at} /></td>
              <td className="py-1.5">{t.category?.name || "—"}</td>
              <td className="py-1.5">{t.merchant || t.note || "—"}</td>
              <td className="py-1.5 text-right whitespace-nowrap">
                {formatMoney(Number(t.amount), t.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
