"use client";
import { useEffect, useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";

type Card = {
  icon: string;
  title: string;
  value: string;
  body: string;
  recommendation: string;
  tone: "positive" | "warning" | "info";
};

type Result = {
  summary: string;
  cards: Card[];
  provider?: "gemini" | "deepseek";
};

type Provider = "gemini" | "deepseek";

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "my", label: "မြန်မာ", flag: "🇲🇲" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
] as const;

const PROVIDERS: { code: Provider; label: string; sub: string }[] = [
  { code: "gemini", label: "Gemini", sub: "Google · 3.1 Flash Lite" },
  { code: "deepseek", label: "DeepSeek", sub: "V4 Pro" },
];

export function AIInsightsButton() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "my" | "th" | null>(null);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Remember last-used provider across sessions
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ko_ai_provider");
      if (saved === "deepseek" || saved === "gemini") setProvider(saved);
    } catch {}
  }, []);

  function pickProvider(p: Provider) {
    setProvider(p);
    try {
      localStorage.setItem("ko_ai_provider", p);
    } catch {}
  }

  async function analyze() {
    if (!lang) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: lang, provider }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      setResult(j);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setLang(null);
    setErr(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg hover:shadow-xl active:scale-95 transition grid place-items-center"
        title="AI Insights"
        aria-label="AI Insights"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
          <div className="card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto relative my-8">
            <button
              onClick={close}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Insights</h2>
                <p className="text-sm text-slate-500">
                  Past 6 weeks analyzed by AI
                </p>
              </div>
            </div>

            {!result && !loading && (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  Choose AI model:
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => pickProvider(p.code)}
                      className={`p-3 rounded-xl border text-left ${
                        provider === p.code
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${
                          provider === p.code ? "text-brand-700 dark:text-brand-300" : ""
                        }`}
                      >
                        {p.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {p.sub}
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  Pick the language for AI output:
                </p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code as any)}
                      className={`p-3 rounded-xl border text-sm font-medium ${
                        lang === l.code
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="text-2xl mb-1">{l.flag}</div>
                      {l.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={analyze}
                  disabled={!lang}
                  className="btn-primary w-full py-3"
                >
                  ✨ Analyze with {provider === "deepseek" ? "DeepSeek" : "Gemini"}
                </button>
              </>
            )}

            {loading && (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <div>AI က ၆ ပတ်စာ data analyze နေပါတယ်...</div>
              </div>
            )}

            {err && (
              <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mt-4">
                {err}
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="card p-4 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/30 dark:to-slate-900 border-brand-200">
                  <div className="text-xs text-brand-600 font-semibold mb-1">SUMMARY</div>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {result.cards.map((card, i) => {
                    const toneClass =
                      card.tone === "positive"
                        ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                        : card.tone === "warning"
                        ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20"
                        : "border-slate-200 bg-white dark:bg-slate-900";
                    return (
                      <div key={i} className={`rounded-xl border p-4 ${toneClass}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-2xl">{card.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm">{card.title}</div>
                            <div className="text-lg font-bold mt-0.5">{card.value}</div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                          {card.body}
                        </p>
                        <div className="text-xs border-t border-slate-200/60 dark:border-slate-700/60 pt-2 mt-2">
                          <span className="font-semibold text-brand-600">💡 </span>
                          {card.recommendation}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setResult(null);
                    setLang(null);
                  }}
                  className="btn-secondary w-full"
                >
                  Run again with different language
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
