"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    const stored = (localStorage.getItem("ko_theme") as Theme) || "system";
    setTheme(stored);

    // Listen for OS changes when in "system" mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("ko_theme") as Theme) === "system") applyTheme("system");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  function choose(t: Theme) {
    setTheme(t);
    localStorage.setItem("ko_theme", t);
    applyTheme(t);
    setOpen(false);
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        title={`${t("Theme")}: ${t(theme.charAt(0).toUpperCase() + theme.slice(1))}`}
        aria-label={t("Toggle theme")}
      >
        <Icon className="w-5 h-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 card p-1 shadow-lg min-w-[140px]">
            {([
              { key: "light", label: "Light", Icon: Sun },
              { key: "dark", label: "Dark", Icon: Moon },
              { key: "system", label: "System", Icon: Monitor },
            ] as { key: Theme; label: string; Icon: any }[]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => choose(opt.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${
                  theme === opt.key
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <opt.Icon className="w-4 h-4" /> {t(opt.label)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
