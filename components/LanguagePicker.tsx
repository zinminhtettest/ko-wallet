"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ALL_LANGS, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

export function LanguagePicker() {
  const t = useT();
  const [lang, setLang] = useState<Lang>("en");
  const [saving, setSaving] = useState<Lang | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setLang(j.ui_language || "en"));
  }, []);

  async function pick(code: Lang) {
    if (saving) return;
    setErr(null);
    setLang(code);
    setSaving(code);
    setSaved(false);
    try {
      const r = await fetch("/api/user-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ui_language: code }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        // Common cause: missing CHECK constraint for 'both' (or even 'my'/'th')
        // on user_settings.ui_language. Surface the raw DB error so the fix
        // is obvious — usually "violates check constraint".
        setErr(j?.error || `Save failed (${r.status})`);
        setSaving(null);
        return;
      }
      setSaved(true);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      setSaving(null);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        {t("Pick the UI language for menus, settings, and dashboard headers.")}
      </p>
      <div className="space-y-2">
        {ALL_LANGS.map((l) => {
          const selected = lang === l.code;
          return (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              disabled={saving !== null}
              className={cn(
                "w-full p-4 rounded-xl border text-left flex items-center gap-3 transition",
                selected
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              )}
            >
              <div className="text-2xl flex-shrink-0">{l.flag}</div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-sm font-semibold",
                    selected ? "text-brand-700 dark:text-brand-300" : ""
                  )}
                >
                  {l.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {l.sub}
                </div>
              </div>
              {selected && (
                <Check className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {saved && (
        <div className="text-xs text-green-600 dark:text-green-400 mt-3">
          ✅ {t("Reloading…")}
        </div>
      )}
      {err && (
        <div className="text-xs text-red-600 dark:text-red-400 mt-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-3 space-y-1">
          <div className="font-semibold">{t("Save failed")}: {err}</div>
          {/check constraint|ui_language/i.test(err) && (
            <div className="text-slate-600 dark:text-slate-300">
              Run <code className="font-mono">sql/ui_language_both.sql</code>{" "}
              in Supabase SQL Editor to allow all 4 language values.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
