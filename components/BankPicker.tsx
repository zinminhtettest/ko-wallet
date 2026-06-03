"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { THAI_BANKS } from "@/lib/banks";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function BankPicker({
  connectionId,
  initialKeys,
}: {
  connectionId: string;
  initialKeys: string[];
}) {
  const router = useRouter();
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialKeys));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/gmail/banks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId,
          bankKeys: Array.from(selected),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setMsg("✓ Saved");
      router.refresh();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">
        {t("Pick which bank notification emails to import — you can choose more than one.")}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {THAI_BANKS.map((b) => {
          const on = selected.has(b.key);
          return (
            <button
              key={b.key}
              onClick={() => toggle(b.key)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm text-left ${
                on
                  ? "border-brand-500 bg-brand-50 text-brand-900"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">{b.emoji}</span>
              <span className="flex-1 truncate">{b.label}</span>
              {on && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary text-sm">
          {saving ? "Saving..." : "Save Banks"}
        </button>
        {msg && <span className="text-xs text-slate-600">{msg}</span>}
      </div>
    </div>
  );
}
