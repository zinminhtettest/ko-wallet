import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionRow } from "@/components/TransactionRow";
import Link from "next/link";
import { Plus, Download, Users, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: {
    kind?: string;
    currency?: string;
    preset?: string;
    from?: string;
    to?: string;
    q?: string;
    min?: string;
    max?: string;
    tax?: string;
  };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const range = parseRangeFromSearchParams(searchParams);

  // Build the query. We try the full column list first (including the newer
  // attribution / tax columns) and fall back to the legacy column set if any
  // of those columns don't exist yet (i.e. the user hasn't run all SQL
  // migrations). This makes the page resilient instead of silently showing 0.
  async function runQuery(columns: string) {
    let q = supabase
      .from("transactions")
      .select(columns)
      .eq("workspace_id", ctx!.workspace.id)
      .gte("occurred_at", range.from.toISOString())
      .lte("occurred_at", range.to.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (searchParams.kind === "expense" || searchParams.kind === "income") {
      q = q.eq("kind", searchParams.kind);
    }
    if (searchParams.currency) {
      q = q.eq("currency", searchParams.currency);
    }
    // tax_deductible filter only applies if user explicitly chose it
    if (searchParams.tax === "1" && columns.includes("tax_deductible")) {
      q = q.eq("tax_deductible", true);
    }
    if (searchParams.min) {
      const min = parseFloat(searchParams.min);
      if (!isNaN(min)) q = q.gte("amount", min);
    }
    if (searchParams.max) {
      const max = parseFloat(searchParams.max);
      if (!isNaN(max)) q = q.lte("amount", max);
    }
    if (searchParams.q) {
      const term = searchParams.q.replace(/[%_]/g, "");
      q = q.or(`merchant.ilike.%${term}%,note.ilike.%${term}%`);
    }
    return q;
  }

  const FULL_COLS =
    "id, amount, currency, kind, note, merchant, occurred_at, created_at, source, created_by_name, telegram_username, tax_deductible, category:categories(name, icon, color)";
  const LEGACY_COLS =
    "id, amount, currency, kind, note, merchant, occurred_at, created_at, source, category:categories(name, icon, color)";

  let { data: txs, error } = await runQuery(FULL_COLS);
  let missingMigration = false;
  if (error) {
    console.warn("[transactions] full query failed, retrying legacy:", error.message);
    missingMigration = true;
    const retry = await runQuery(LEGACY_COLS);
    txs = retry.data;
    error = retry.error;
  }
  const list = ((txs as any) ?? []) as any[];
  const fatalError = error;

  // Build URL helper that preserves date range
  const dateParams = new URLSearchParams();
  if (searchParams.preset) dateParams.set("preset", searchParams.preset);
  if (searchParams.from) dateParams.set("from", searchParams.from);
  if (searchParams.to) dateParams.set("to", searchParams.to);
  const dateQS = dateParams.toString();

  function withKind(kind?: string) {
    const p = new URLSearchParams(dateParams);
    if (kind) p.set("kind", kind);
    return `/transactions?${p.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-slate-500">
            {list.length} records · {range.label}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/export?${new URLSearchParams({
              ...(searchParams.preset ? { preset: searchParams.preset } : {}),
              ...(searchParams.from ? { from: searchParams.from } : {}),
              ...(searchParams.to ? { to: searchParams.to } : {}),
              ...(searchParams.kind ? { kind: searchParams.kind } : {}),
              ...(searchParams.currency ? { currency: searchParams.currency } : {}),
            }).toString()}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
            title="Export CSV (Excel-friendly)"
          >
            <Download className="w-4 h-4" /> Export
          </a>
          <Link
            href="/transactions/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
            title="Bulk import CSV"
          >
            <Upload className="w-4 h-4" /> Import
          </Link>
          <Link
            href="/transactions/split"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
            title="Split bill among family"
          >
            <Users className="w-4 h-4" /> Split
          </Link>
          <Link href="/transactions/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </Link>
        </div>
      </div>

      <DateRangeFilter />

      <div className="flex gap-2 flex-wrap text-sm">
        <FilterChip href={withKind()} label="All" active={!searchParams.kind} />
        <FilterChip href={withKind("expense")} label="Expenses" active={searchParams.kind === "expense"} />
        <FilterChip href={withKind("income")} label="Income" active={searchParams.kind === "income"} />
      </div>

      <TransactionFilters />

      {missingMigration && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          ⚠️ Some new columns aren't migrated yet. Showing legacy data. Run{" "}
          <code className="bg-amber-100 px-1 rounded">sql/phase5_attribution.sql</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">sql/phase5_tags_goals.sql</code> in
          Supabase SQL Editor.
        </div>
      )}

      {fatalError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3">
          Query error: {fatalError.message}
        </div>
      )}

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <p className="mb-3">No transactions in this range.</p>
            <Link href="/transactions/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Add Transaction
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((t) => (
              <TransactionRow key={t.id} tx={t as any} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full border text-sm ${
        active ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}
