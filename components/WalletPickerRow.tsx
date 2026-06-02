"use client";
import { useState } from "react";
import { Wallet, Globe, Lock } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
        window.location.href = window.location.pathname + window.location.search;
      } else {
        setSwitching(null);
      }
    } catch {
      setSwitching(null);
    }
  }

  if (!wallets.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          My Wallets
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ({wallets.length})
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {wallets.map((w) => {
          const isActive = w.id === activeId;
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
                "flex-shrink-0 min-w-[180px] text-left rounded-xl p-3.5 transition border",
                isActive
                  ? "bg-brand-600 border-brand-500 shadow-md"
                  : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm",
                isLoading && "opacity-60"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg grid place-items-center flex-shrink-0",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"
                  )}
                >
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold truncate flex-1 min-w-0",
                    isActive ? "text-white" : "text-slate-900 dark:text-white"
                  )}
                >
                  {w.name}
                </div>
                {w.role === "member" && (
                  <Lock
                    className={cn(
                      "w-3 h-3 flex-shrink-0",
                      isActive ? "text-white/70" : "text-slate-400"
                    )}
                  />
                )}
              </div>
              <div
                className={cn(
                  "text-[10px] mb-2",
                  isActive
                    ? "text-blue-100"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {w.currency} · {w.role}
                {isActive && " · active"}
              </div>
              <div className={cn("text-base font-bold", isActive ? "text-white" : netColor)}>
                {formatMoney(w.net, w.currency)}
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 text-[10px] mt-1",
                  isActive ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <span className={isActive ? "" : "text-green-600 dark:text-green-400"}>
                  + {formatMoney(w.income, w.currency)}
                </span>
                <span className={isActive ? "" : "text-red-600 dark:text-red-400"}>
                  − {formatMoney(w.expense, w.currency)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
