"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const PRESETS: { key: string; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All" },
];

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const preset = sp.get("preset") || "month";
  const [showCustom, setShowCustom] = useState(preset === "custom");
  const [from, setFrom] = useState(sp.get("from") || "");
  const [to, setTo] = useState(sp.get("to") || "");

  function apply(p: string, f?: string, t?: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("preset", p);
    if (p === "custom" && f && t) {
      params.set("from", f);
      params.set("to", t);
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setShowCustom(false);
              apply(p.key);
            }}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              preset === p.key && !showCustom
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 rounded-full text-xs border ${
            preset === "custom" || showCustom
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input text-sm py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input text-sm py-1.5"
            />
          </div>
          <button
            onClick={() => from && to && apply("custom", from, to)}
            disabled={!from || !to}
            className="btn-primary text-sm py-1.5 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
