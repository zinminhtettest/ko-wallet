"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * Bottom-of-sidebar utility pill (desktop only).
 * Inline segmented theme picker (Light / Dark / System) + Sign out — no dropdown.
 */
export function SidebarUtilityPill() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("ko_theme") as Theme) || "system";
    setTheme(stored);
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
  }

  const themes: { key: Theme; Icon: any; label: string }[] = [
    { key: "light", Icon: Sun, label: "Light" },
    { key: "dark", Icon: Moon, label: "Dark" },
    { key: "system", Icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
      {themes.map(({ key, Icon, label }) => (
        <button
          key={key}
          onClick={() => choose(key)}
          title={label}
          aria-label={`Theme: ${label}`}
          className={cn(
            "flex-1 inline-flex items-center justify-center rounded-lg py-1.5 transition",
            theme === key
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
      <form action="/auth/signout" method="POST" className="flex-1 flex">
        <button
          type="submit"
          title="Sign out"
          aria-label="Sign out"
          className="flex-1 inline-flex items-center justify-center rounded-lg py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
