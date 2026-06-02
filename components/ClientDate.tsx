"use client";
import { useEffect, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * Renders a timestamp in the DEVICE's local timezone without causing a React
 * hydration mismatch.
 *
 * Strategy:
 *  - Initial render (SSR + client first paint) uses the deterministic UTC
 *    formatter from `lib/utils` so server HTML and client hydration produce
 *    byte-identical output.
 *  - Immediately after mount, an effect re-formats the date with the
 *    browser's local timezone (`toLocaleDateString` / `toLocaleString`),
 *    which is what the user actually wants to see.
 *
 * The brief UTC → local swap is invisible in practice (one paint frame).
 */
export function ClientDate({
  value,
  withTime = false,
  options,
  locale = "en-GB",
}: {
  value: string | Date | null | undefined;
  withTime?: boolean;
  options?: Intl.DateTimeFormatOptions;
  locale?: string;
}) {
  const initial =
    value == null
      ? ""
      : withTime
      ? formatDateTime(value as any)
      : formatDate(value as any);
  const [text, setText] = useState<string>(initial);

  useEffect(() => {
    if (value == null) {
      setText("");
      return;
    }
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) {
      setText("");
      return;
    }
    const opts: Intl.DateTimeFormatOptions =
      options ||
      (withTime
        ? {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        : { day: "2-digit", month: "short", year: "numeric" });
    try {
      setText(new Intl.DateTimeFormat(locale, opts).format(d));
    } catch {
      setText(d.toLocaleString());
    }
  }, [value, withTime, locale, options]);

  return <span suppressHydrationWarning>{text}</span>;
}
