// Date range helpers for filter UI

export type RangePreset =
  | "today"
  | "week"
  | "month"
  | "last_month"
  | "year"
  | "all"
  | "custom";

export interface Range {
  preset: RangePreset;
  from: Date;
  to: Date;
  label: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function rangeFor(preset: RangePreset, from?: string, to?: string): Range {
  const now = new Date();
  switch (preset) {
    case "today":
      return {
        preset,
        from: startOfDay(now),
        to: endOfDay(now),
        label: "Today",
      };
    case "week": {
      // Week starts Monday
      const day = (now.getDay() + 6) % 7; // 0=Mon
      const start = startOfDay(new Date(now.getTime() - day * 86400_000));
      return {
        preset,
        from: start,
        to: endOfDay(now),
        label: "This Week",
      };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        preset,
        from: startOfDay(start),
        to: endOfDay(now),
        label: "This Month",
      };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0); // last day prev month
      return {
        preset,
        from: startOfDay(start),
        to: endOfDay(end),
        label: "Last Month",
      };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        preset,
        from: startOfDay(start),
        to: endOfDay(now),
        label: "This Year",
      };
    }
    case "all":
      return {
        preset,
        from: new Date(2020, 0, 1),
        to: endOfDay(now),
        label: "All time",
      };
    case "custom": {
      const f = from ? new Date(from) : startOfDay(now);
      const t = to ? new Date(to) : endOfDay(now);
      return {
        preset,
        from: startOfDay(f),
        to: endOfDay(t),
        label: `${f.toLocaleDateString("en-GB")} → ${t.toLocaleDateString("en-GB")}`,
      };
    }
  }
}

export function parseRangeFromSearchParams(sp: {
  preset?: string;
  from?: string;
  to?: string;
}): Range {
  const preset = (sp.preset as RangePreset) || "month";
  return rangeFor(preset, sp.from, sp.to);
}
