"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Wallet, Lock, Check, ArrowUpRight, ArrowDownRight, LayoutGrid, X, Plus } from "lucide-react";
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
  const [modalOpen, setModalOpen] = useState(false);
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

      {/* Other wallets — mobile: horizontal scroll showing all; desktop: top 2 + "+N more" */}
      <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">
        {others.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-xs text-slate-500 dark:text-slate-400 md:h-full grid place-items-center">
            <div>
              <div className="mb-1">No other wallets</div>
              <Link href="/settings/wallets" className="text-brand-600 underline">
                Create one
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: all wallets in horizontal scroll */}
            <div className="contents md:hidden">
              {others.map((w) => (
                <WalletCard
                  key={w.id}
                  w={w}
                  isLoading={switching === w.id}
                  onClick={() => switchTo(w.id)}
                />
              ))}
            </div>
            {/* Desktop: first 2 visible + "+N more" button */}
            <div className="hidden md:contents">
              {others.slice(0, 2).map((w) => (
                <WalletCard
                  key={w.id}
                  w={w}
                  isLoading={switching === w.id}
                  onClick={() => switchTo(w.id)}
                />
              ))}
              {others.length > 2 && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition p-3 text-brand-600 dark:text-brand-400 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  +{others.length - 2} more
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal — all wallets */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Switch Wallet
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ul className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {wallets.map((w) => {
                const isActive = w.id === activeId;
                const netColor =
                  w.net < 0
                    ? "text-red-600 dark:text-red-400"
                    : w.net > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-slate-700 dark:text-slate-200";
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      disabled={isActive || switching === w.id}
                      onClick={() => {
                        setModalOpen(false);
                        switchTo(w.id);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl p-3 text-left transition border",
                        isActive
                          ? "bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700"
                          : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 grid place-items-center flex-shrink-0">
                        <Wallet className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {w.name}
                          </div>
                          {w.role === "member" && (
                            <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {w.currency} · {w.role}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={cn("text-sm font-bold", netColor)}>
                          {formatMoney(w.net, w.currency)}
                        </div>
                        {isActive && (
                          <div className="text-[10px] text-brand-600 dark:text-brand-300 font-semibold flex items-center justify-end gap-0.5">
                            <Check className="w-3 h-3" /> Active
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/settings/wallets"
              onClick={() => setModalOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-2.5 text-sm font-semibold flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> New Wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletCard({
  w,
  isLoading,
  onClick,
}: {
  w: WalletCardData;
  isLoading: boolean;
  onClick: () => void;
}) {
  const netColor =
    w.net < 0
      ? "text-red-600 dark:text-red-400"
      : w.net > 0
      ? "text-green-600 dark:text-green-400"
      : "text-slate-700 dark:text-slate-200";
  return (
    <button
      type="button"
      onClick={onClick}
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
    </button>
  );
}
