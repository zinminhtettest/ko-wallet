"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Wallet, Lock, Check, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatMoney, cn } from "@/lib/utils";

export type WalletCardData = {
  id: string;
  name: string;
  currency: string;
  role: "owner" | "member";
  net: number;
  income: number;
  expense: number;
};

export function WalletPickerRow({
  wallets,
  activeId,
}: {
  wallets: WalletCardData[];
  activeId: string;
}) {
  const [switching, setSwitching] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentKind = searchParams?.get("kind");

  async function switchTo(id: string) {
    if (id === activeId || switching) return;
    setSwitching(id);
    try {
      const r = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
      if (r.ok) {
        try {
          sessionStorage.removeItem("ko_ws_cache_v1");
        } catch {}
        // Drop the kind filter on switch
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete("kind");
        const q = params.toString();
        window.location.href = pathname + (q ? `?${q}` : "");
      } else {
        setSwitching(null);
      }
    } catch {
      setSwitching(null);
    }
  }

  function hrefForKind(target: "income" | "expense" | null) {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (target === null || currentKind === target) {
      params.delete("kind");
    } else {
      params.set("kind", target);
    }
    const q = params.toString();
    return pathname + (q ? `?${q}` : "");
  }

  if (!wallets.length) return null;

  const active = wallets.find((w) => w.id === activeId) || wallets[0];
  const others = wallets.filter((w) => w.id !== active.id);

  const incomeSelected = currentKind === "income";
  const expenseSelected = currentKind === "expense";
  const anyFilter = incomeSelected || expenseSelected;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
      {/* Active wallet card — large */}
      <div className="rounded-2xl bg-brand-600 border-[1.5px] border-brand-400 dark:border-brand-500 p-5 text-white shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-white/20 grid place-items-center flex-shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="font-semibold text-base truncate flex-1 min-w-0">
            {active.name}
          </div>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ACTIVE
          </span>
        </div>
        <div className="text-xs text-blue-100 mb-3">
          {active.currency} · {active.role}
        </div>
        <div className="text-3xl font-bold leading-none mb-4">
          {formatMoney(active.net, active.currency)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={hrefForKind("income")}
            className={cn(
              "rounded-xl p-3 transition border-2",
              incomeSelected
                ? "bg-green-500 border-green-200 ring-2 ring-green-300/50"
                : anyFilter
                ? "bg-green-500/10 border-transparent opacity-50 hover:opacity-80"
                : "bg-green-500/20 border-transparent hover:bg-green-500/30"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] text-green-100">
              {incomeSelected ? (
                <Check className="w-3 h-3" />
              ) : (
                <ArrowUpRight className="w-3 h-3" />
              )}
              Income
            </div>
            <div className="font-bold text-white text-base">
              {formatMoney(active.income, active.currency)}
            </div>
          </Link>
          <Link
            href={hrefForKind("expense")}
            className={cn(
              "rounded-xl p-3 transition border-2",
              expenseSelected
                ? "bg-red-500 border-red-200 ring-2 ring-red-300/50"
                : anyFilter
                ? "bg-red-500/10 border-transparent opacity-50 hover:opacity-80"
                : "bg-red-500/20 border-transparent hover:bg-red-500/30"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] text-red-100">
              {expenseSelected ? (
                <Check className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              Expense
            </div>
            <div className="font-bold text-white text-base">
              {formatMoney(active.expense, active.currency)}
            </div>
          </Link>
        </div>
      </div>

      {/* Other wallets — compact */}
      <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">
        {others.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-xs text-slate-500 dark:text-slate-400 md:h-full grid place-items-center">
            <div>
              <div className="mb-1">No other wallets</div>
              <Link
                href="/settings/wallets"
                className="text-brand-600 underline"
              >
                Create one
              </Link>
            </div>
          </div>
        ) : (
          others.map((w) => {
            const isLoading = switching === w.id;
            const netColor =
              w.net < 0
                ? "text-red-600 dark:text-red-400"
                : w.net > 0
                ? "text-green-600 dark:text-green-400"
                : "text-slate-700 dark:text-slate-200";
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => switchTo(w.id)}
                disabled={isLoading}
                className={cn(
                  "flex-shrink-0 min-w-[180px] md:min-w-0 text-left rounded-xl p-3 transition border",
                  "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm",
                  isLoading && "opacity-60"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 grid place-items-center flex-shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate flex-1 min-w-0">
                    {w.name}
                  </div>
                  {w.role === "member" && (
                    <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                  {w.currency} · {w.role}
                </div>
                <div className={cn("text-lg font-bold leading-none", netColor)}>
                  {formatMoney(w.net, w.currency)}
                </div>
                <div className="flex gap-2 text-[10px] mt-1.5">
                  <span className="text-green-600 dark:text-green-400">
                    + {formatMoney(w.income, w.currency)}
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    − {formatMoney(w.expense, w.currency)}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded py-1">
                  Click to switch
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
