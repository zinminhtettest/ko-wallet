import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatMoney, formatDate } from "@/lib/utils";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus, Wallet } from "lucide-react";
import type { Currency } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { preset?: string; from?: string; to?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const range = parseRangeFromSearchParams(searchParams);

  const { data: txs } = await supabase
    .from("transactions")
    .select(
      "id, amount, currency, kind, note, merchant, occurred_at, category:categories(name, icon, color)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", range.from.toISOString())
    .lte("occurred_at", range.to.toISOString())
    .order("created_at", { ascending: false });

  const all = (txs ?? []) as any[];

  const byCurrency: Record<Currency, { income: number; expense: number }> = {
    THB: { income: 0, expense: 0 },
    MMK: { income: 0, expense: 0 },
    USD: { income: 0, expense: 0 },
  };
  for (const t of all) {
    const c = (t.currency || "THB") as Currency;
    if (!byCurrency[c]) continue;
    if (t.kind === "income") byCurrency[c].income += Number(t.amount);
    else byCurrency[c].expense += Number(t.amount);
  }

  const recent = all.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {range.label} · {formatDate(range.from)} → {formatDate(range.to)}
          </p>
        </div>
        <Link href="/transactions/new" className="btn-primary hidden md:inline-flex">
          <Plus className="w-4 h-4" /> Add Transaction
        </Link>
      </div>

      <DateRangeFilter />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(byCurrency) as Currency[]).map((c) => {
          const { income, expense } = byCurrency[c];
          if (income === 0 && expense === 0 && c !== ctx.workspace.default_currency) return null;
          const balance = income - expense;
          return (
            <div key={c} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">{c} Balance</span>
              </div>
              <div className={`text-3xl font-bold ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                {formatMoney(balance, c)}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-lg bg-green-50 p-2.5">
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <ArrowUpRight className="w-3 h-3" /> Income
                  </div>
                  <div className="font-semibold text-green-700">{formatMoney(income, c)}</div>
                </div>
                <div className="rounded-lg bg-red-50 p-2.5">
                  <div className="flex items-center gap-1 text-xs text-red-700">
                    <ArrowDownRight className="w-3 h-3" /> Expense
                  </div>
                  <div className="font-semibold text-red-700">{formatMoney(expense, c)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold">Recent Transactions</h2>
          <Link href="/transactions" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <p className="mb-3">ဒီ range မှာ transaction မရှိပါ။</p>
            <Link href="/transactions/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Add Transaction
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: t.category?.color || "#94a3b8" }}
                  >
                    {(t.category?.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.merchant || t.note || t.category?.name || "Transaction"}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(t.occurred_at)} · {t.category?.name || "Uncategorized"}
                    </div>
                  </div>
                </div>
                <div className={`font-semibold ${t.kind === "income" ? "text-green-600" : "text-red-600"}`}>
                  {t.kind === "income" ? "+" : "−"} {formatMoney(Number(t.amount), t.currency)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
