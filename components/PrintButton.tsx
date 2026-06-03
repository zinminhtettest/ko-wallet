"use client";
import { useT } from "@/lib/i18n-client";

export function PrintButton() {
  const t = useT();
  return (
    <button onClick={() => window.print()} className="btn-primary text-sm">
      🖨 {t("Print / Save as PDF")}
    </button>
  );
}
