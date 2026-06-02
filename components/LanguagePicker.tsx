"use client";
import { useEffect, useState } from "react";

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "my", label: "မြန်မာ", flag: "🇲🇲" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
] as const;

export function LanguagePicker() {
  const [lang, setLang] = useState<"en" | "my" | "th">("en");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setLang(j.ui_language || "en"));
  }, []);

  async function pick(code: "en" | "my" | "th") {
    setLang(code);
    setSaving(true);
    setSaved(false);
    await fetch("/api/user-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ui_language: code }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      // Force a refresh so server components re-render with new translations
      window.location.reload();
    }, 300);
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Pick the UI language for menus, settings, and dashboard headers.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => pick(l.code as any)}
            disabled={saving}
            className={`p-4 rounded-xl border text-sm font-medium ${
              lang === l.code
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <div className="text-3xl mb-1">{l.flag}</div>
            {l.label}
          </button>
        ))}
      </div>
      {saved && <div className="text-xs text-green-600 mt-3">✅ Reloading…</div>}
    </div>
  );
}
