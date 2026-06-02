import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { formatMoney, formatDate } from "@/lib/utils";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { kind?: string; currency?: string; preset?: string; from?: string; to?: string };
}) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const supabase = createClient();
  const range = parseRangeFromSearchParams(searchParams);

  let q = supabase
    .from("transactions")
    .select(
      "id, amount, currency, kind, note, merchant, occurred_at, source, category:categories(name, icon, color)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", range.from.toISOString())
    .lte("occurred_at", range.to.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(500);

  if (searchParams.kind === "expense" || searchParams.kind === "income") {
    q = q.eq("kind", searchParams.kind);
  }
  if (searchParams.currency) {
    q = q.eq("currency", searchParams.currency);
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
        <Link href="/transactions/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add
        </Link>
      </div>

      <DateRangeFilter />

      <div className="flex gap-2 flex-wrap text-sm">
        <FilterChip href={withKind()} label="All" active={!searchParams.kind} />
        <FilterChip href={withKind("expense")} label="Expenses" active={searchParams.kind === "expense"} />
        <FilterChip href={withKind("income")} label="Income" active={searchParams.kind === "income"} />
      </div>

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
              <li key={t.id}>
                <Link href={`/transactions/${t.id}/edit`} className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl grid place-items-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: t.category?.color || "#94a3b8" }}
                    >
                      {(t.category?.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {t.merchant || t.note || t.category?.name || "Transaction"}
                        {t.source === "krungthai_email" && (
                          <span title="Auto-imported from bank email">
                            <Mail className="w-3 h-3 text-brand-500" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(t.occurred_at)} · {t.category?.name || "Uncategorized"}
                      </div>
                    </div>
                  </div>
                  <div className={`font-semibold whitespace-nowrap ${t.kind === "income" ? "text-green-600" : "text-red-600"}`}>
                    {t.kind === "income" ? "+" : "−"} {formatMoney(Number(t.amount), t.currency)}
                  </div>
                </Link>
              </li>
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
