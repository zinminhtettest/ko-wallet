import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatMoney, formatDate } from "@/lib/utils";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { AIInsightsButton } from "@/components/AIInsightsButton";
import { ClientDate } from "@/components/ClientDate";
import { TransactionRow } from "@/components/TransactionRow";
import { WalletPickerRow, type WalletCardData } from "@/components/WalletPickerRow";
import { convert } from "@/lib/fx";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Currency } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { preset?: string; from?: string; to?: string; kind?: string };
}) {
  const kindFilter: "income" | "expense" | null =
    searchParams.kind === "income" || searchParams.kind === "expense"
      ? (searchParams.kind as "income" | "expense")
      : null;
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

  const filteredAll = kindFilter
    ? all.filter((t) => t.kind === kindFilter)
    : all;
  const recent = filteredAll.slice(0, 8);

  // --- Wallet picker row data: per-wallet net/income/expense in each wallet's default currency ---
  type WsRow = {
    workspace_id: string;
    workspace_name: string;
    default_currency: string;
    role: "owner" | "member";
  };
  const { data: wsList } = await supabase.rpc("list_my_workspaces");
  const workspaces = ((wsList ?? []) as WsRow[]) || [];
  const allIds = workspaces.map((w) => w.workspace_id);
  const walletCards: WalletCardData[] = [];
  if (allIds.length) {
    const { data: allTx } = await supabase
      .from("transactions")
      .select("workspace_id, amount, currency, kind")
      .in("workspace_id", allIds)
      .gte("occurred_at", range.from.toISOString())
      .lte("occurred_at", range.to.toISOString());
    const rows = (allTx ?? []) as any[];
    for (const w of workspaces) {
      let inc = 0;
      let exp = 0;
      for (const t of rows) {
        if (t.workspace_id !== w.workspace_id) continue;
        const amt = convert(
          Number(t.amount),
          (t.currency || "THB") as Currency,
          w.default_currency as Currency,
          rates
        );
        if (t.kind === "income") inc += amt;
        else exp += amt;
      }
      walletCards.push({
        id: w.workspace_id,
        name: w.workspace_name,
        currency: w.default_currency,
        role: w.role,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }
    // Put active wallet first
    walletCards.sort((a, b) => {
      if (a.id === ctx.workspace.id) return -1;
      if (b.id === ctx.workspace.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }


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

      <WalletPickerRow wallets={walletCards} activeId={ctx.workspace.id} />

      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold">Recent Transactions</h2>
            {kindFilter && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  kindFilter === "income"
                    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {kindFilter === "income" ? "Income only" : "Expense only"}
              </span>
            )}
            {kindFilter && (
              <Link
                href={`?${new URLSearchParams({
                  ...(searchParams.preset ? { preset: searchParams.preset } : {}),
                  ...(searchParams.from ? { from: searchParams.from } : {}),
                  ...(searchParams.to ? { to: searchParams.to } : {}),
                }).toString()}`}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Clear
              </Link>
            )}
          </div>
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
