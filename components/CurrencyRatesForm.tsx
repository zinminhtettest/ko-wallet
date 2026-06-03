"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

export function CurrencyRatesForm() {
  const t = useT();
  const [base, setBase] = useState("THB");
  const [thbToMmk, setThbToMmk] = useState("130");
  const [thbToUsd, setThbToUsd] = useState("0.028");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setBase(j.base_currency || "THB");
        setThbToMmk(String(j.rate_thb_to_mmk));
        setThbToUsd(String(j.rate_thb_to_usd));
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const r = await fetch("/api/user-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        base_currency: base,
        rate_thb_to_mmk: parseFloat(thbToMmk),
        rate_thb_to_usd: parseFloat(thbToUsd),
      }),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {t("Used for the combined Net Worth view's currency conversion. Fill in FX rates manually.")}
      </p>
      <div>
        <label className="label">Base currency for Net Worth</label>
        <select className="input" value={base} onChange={(e) => setBase(e.target.value)}>
          <option value="THB">THB (฿)</option>
          <option value="MMK">MMK (K)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
      <div>
        <label className="label">1 THB = ? MMK</label>
        <input
          className="input"
          inputMode="decimal"
          value={thbToMmk}
          onChange={(e) => setThbToMmk(e.target.value)}
        />
      </div>
      <div>
        <label className="label">1 THB = ? USD</label>
        <input
          className="input"
          inputMode="decimal"
          value={thbToUsd}
          onChange={(e) => setThbToUsd(e.target.value)}
        />
      </div>
      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? "Saving..." : saved ? "✅ Saved" : "Save Rates"}
      </button>
      <p className="text-xs text-slate-400">
        {t("Example current rate")}: 1 USD ≈ 35 THB ≈ 4,500 MMK · 1 THB ≈ 130 MMK ≈ 0.028 USD
      </p>
    </div>
  );
}
