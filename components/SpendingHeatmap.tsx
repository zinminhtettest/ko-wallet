"use client";
import { useMemo } from "react";

type Tx = { occurred_at: string; amount: number; kind: string; currency: string };

/**
 * 12-week (84 day) spending heatmap, day-by-day color intensity by expense amount.
 * Grouped by week (Sun → Sat) so it reads left-to-right as time.
 */
export function SpendingHeatmap({
  transactions,
  currency,
}: {
  transactions: Tx[];
  currency: string;
}) {
  const { weeks, max } = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const t of transactions) {
      if (t.kind !== "expense") continue;
      if (t.currency !== currency) continue;
      const day = t.occurred_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + Number(t.amount);
    }

    // Build 84-day grid ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; value: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, value: byDay[iso] || 0 });
    }

    // Pad start so first column aligns to Sunday
    const firstDay = new Date(days[0].date);
    const dow = firstDay.getDay(); // 0 = Sunday
    const padded: { date: string | null; value: number }[] = [];
    for (let i = 0; i < dow; i++) padded.push({ date: null, value: 0 });
    padded.push(...days);

    // Group into weeks of 7
    const weeks: { date: string | null; value: number }[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }

    const max = Math.max(1, ...days.map((d) => d.value));
    return { weeks, max };
  }, [transactions, currency]);

  function colorFor(v: number) {
    if (v === 0) return "bg-slate-100 dark:bg-slate-800";
    const ratio = v / max;
    if (ratio < 0.2) return "bg-brand-100 dark:bg-brand-900/40";
    if (ratio < 0.4) return "bg-brand-200 dark:bg-brand-800/50";
    if (ratio < 0.6) return "bg-brand-300 dark:bg-brand-700/60";
    if (ratio < 0.8) return "bg-brand-400 dark:bg-brand-600/80";
    return "bg-brand-600";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-500">Last 12 weeks · {currency}</div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <span>Less</span>
          {["bg-slate-100 dark:bg-slate-800", "bg-brand-100", "bg-brand-300", "bg-brand-500", "bg-brand-600"].map((c, i) => (
            <span key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((d, di) => {
                if (!d.date) {
                  return <div key={di} className="w-3 h-3" />;
                }
                return (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${colorFor(d.value)}`}
                    title={`${d.date}: ${d.value.toLocaleString()} ${currency}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
