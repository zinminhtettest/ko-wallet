import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatMoney, formatDate } from "@/lib/utils";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { AIInsightsButton } from "@/components/AIInsightsButton";
import { ClientDate } from "@/components/ClientDate";
import { TransactionRow } from "@/components/TransactionRow";
import { convert } from "@/lib/fx";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus, Wallet, Globe } from "lucide-react";
import type { Currency } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { preset?: string; from?: string; to?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const range = parseRangeFromSearchParams(searchParams);

  // Load FX user settings for combined net worth
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  const baseCurrency = settings?.base_currency || "THB";
  const rates = {
    rate_thb_to_mmk: Number(settings?.rate_thb_to_mmk ?? 130),
    rate_thb_to_usd: Number(settings?.rate_thb_to_usd ?? 0.028),
  };

  // Try with full attribution columns; fall back gracefully if migration not run.
  let txsRes: any = await supabase
    .from("transactions")
    .select(
      "id, amount, currency, kind, note, merchant, occurred_at, source, created_by_name, telegram_username, category:categories(name, icon, color)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", range.from.toISOString())
    .lte("occurred_at", range.to.toISOString())
    .order("created_at", { ascending: false });
  if (txsRes.error) {
    const msg = (txsRes.error.message || "").toLowerCase();
    if (msg.includes("schema cache") || msg.includes("could not find") || msg.includes("does not exist")) {
      txsRes = await supabase
        .from("transactions")
        .select(
          "id, amount, currency, kind, note, merchant, occurred_at, category:categories(name, icon, color)"
        )
        .eq("workspace_id", ctx.workspace.id)
        .gte("occurred_at", range.from.toISOString())
        .lte("occurred_at", range.to.toISOString())
        .order("created_at", { ascending: false });
    }
  }
  const txs = txsRes.data;

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

  // Net worth combined: convert net of every currency to base
  let combinedNet = 0;
  let combinedIncome = 0;
  let combinedExpense = 0;
  for (const c of ["THB", "MMK", "USD"] as Currency[]) {
    const v = byCurrency[c];
    if (!v) continue;
    combinedIncome += convert(v.income, c, baseCurrency, rates);
    combinedExpense += convert(v.expense, c, baseCurrency, rates);
  }
  combinedNet = combinedIncome - combinedExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {range.label} · <ClientDate value={range.from.toISOString()} /> → <ClientDate value={range.to.toISOString()} />
          </p>
        </div>
        <Link href="/transactions/new" className="btn-primary hidden md:inline-flex">
          <Plus className="w-4 h-4" /> Add Transaction
        </Link>
      </div>

      <DateRangeFilter />

      {/* Net Worth combined card */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Net Worth ({baseCurrency})
              </span>
            </div>
            <div className={`text-3xl font-bold ${combinedNet >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-600"}`}>
              {formatMoney(combinedNet, baseCurrency)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              All currencies combined · {range.label}
            </div>
          </div>
          <Link
            href="/settings/currency"
            className="text-xs text-brand-600 hover:underline whitespace-nowrap"
          >
            FX rates →
          </Link>
        </div>
      </div>

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
                <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-2.5">
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <ArrowUpRight className="w-3 h-3" /> Income
                  </div>
                  <div className="font-semibold text-green-700">{formatMoney(income, c)}</div>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-2.5">
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
            <p className="mb-3">No transactions in this range.</p>
            <Link href="/transactions/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Add Transaction
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((t: any) => (
              <TransactionRow
                key={t.id}
                tx={{
                  id: t.id,
                  amount: t.amount,
                  currency: t.currency,
                  kind: t.kind,
                  note: t.note,
                  merchant: t.merchant,
                  occurred_at: t.occurred_at,
                  source: t.source ?? null,
                  created_by_name: t.created_by_name ?? null,
                  telegram_username: t.telegram_username ?? null,
                  category: t.category ?? null,
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <AIInsightsButton />
    </div>
  );
}
