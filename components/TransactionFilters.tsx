"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function TransactionFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  const [q, setQ] = useState(params.get("q") || "");
  const [min, setMin] = useState(params.get("min") || "");
  const [max, setMax] = useState(params.get("max") || "");
  const [tax, setTax] = useState(params.get("tax") === "1");

  function apply() {
    const p = new URLSearchParams(params.toString());
    if (q.trim()) p.set("q", q.trim());
    else p.delete("q");
    if (min) p.set("min", min);
    else p.delete("min");
    if (max) p.set("max", max);
    else p.delete("max");
    if (tax) p.set("tax", "1");
    else p.delete("tax");
    router.push(`/transactions?${p.toString()}`);
  }

  function clear() {
    setQ("");
    setMin("");
    setMax("");
    setTax(false);
    const p = new URLSearchParams(params.toString());
    p.delete("q");
    p.delete("min");
    p.delete("max");
    p.delete("tax");
    router.push(`/transactions?${p.toString()}`);
  }

  const hasFilters = q || min || max || tax;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={t("Search merchant / note...")}
            className="input pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder={t("Min amount")}
          className="input"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <input
          type="number"
          placeholder={t("Max amount")}
          className="input"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={tax}
          onChange={(e) => setTax(e.target.checked)}
          className="rounded"
        />
        {t("Tax-deductible only")}
      </label>
      <div className="flex gap-2">
        <button onClick={apply} className="btn-primary text-sm flex-1 py-2">
          {t("Apply filters")}
        </button>
        {hasFilters && (
          <button onClick={clear} className="btn-secondary text-sm py-2">
            <X className="w-4 h-4" /> {t("Clear")}
          </button>
        )}
      </div>
    </div>
  );
}
