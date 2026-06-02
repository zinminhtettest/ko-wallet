import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionRow } from "@/components/TransactionRow";
import Link from "next/link";
import { Plus, Download } from "lucide-react";

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

  let q = supabase
    .from("transactions")
    .select(
      "id, amount, currency, kind, note, merchant, occurred_at, created_at, source, created_by_name, telegram_username, tax_deductible, category:categories(name, icon, color)"
    )
    .eq("workspace_id", ctx.workspace.id)
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
  if (searchParams.tax === "1") {
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

  const { data: txs } = await q;
  const list = (txs ?? []) as any[];

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

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <p className="mb-3">ဒီ range မှာ transaction မရှိပါ။</p>
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
