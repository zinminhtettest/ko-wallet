"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, ListChecks, BarChart3, Settings, Wallet, Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarUtilityPill } from "@/components/SidebarUtilityPill";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NotificationBell({ className }: { className?: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setUnread(j?.unread_count || 0);
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100",
        className
      )}
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

export function AppShell({
  children,
  workspaceName,
  userEmail,
  activeWorkspaceId,
}: {
  children: React.ReactNode;
  workspaceName: string;
  userEmail: string;
  activeWorkspaceId: string;
}) {
  const pathname = usePathname();
  // workspaceName kept for backwards compatibility but the switcher renders its own label.
  void workspaceName;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) — sticky to viewport so utility pill stays visible */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-5 md:sticky md:top-0 md:h-screen md:flex-shrink-0 md:self-start">
        {/* Top row — Workspace switcher (Ko Wallet · {wallet name}) + bell */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <WorkspaceSwitcher activeId={activeWorkspaceId} />
          </div>
          <NotificationBell className="w-9 h-9 flex-shrink-0" />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 my-3" />

        <nav className="flex-1 space-y-1 overflow-y-auto min-h-0">
          {nav.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom utility pill — theme + sign out */}
        <div className="mt-3">
          <SidebarUtilityPill />
          <div className="mt-2 px-2 text-[10px] text-slate-500 dark:text-slate-400 text-center truncate">
            {userEmail}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar — switcher + theme + bell only.
            The "+ Add" action is a FAB at the bottom-right. */}
        <header className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex-1 min-w-0">
            <WorkspaceSwitcher activeId={activeWorkspaceId} />
          </div>
          <ThemeToggle className="flex-shrink-0" />
          <NotificationBell className="w-9 h-9 flex-shrink-0" />
        </header>

        <div className="px-4 py-5 md:px-8 md:py-8 pb-24 md:pb-8">{children}</div>

        {/* Mobile FAB — quick Add Transaction on pages that don't already have
            an inline Add button (Dashboard has it inside the active wallet card). */}
        {pathname &&
          (pathname.startsWith("/transactions") || pathname.startsWith("/reports")) &&
          !pathname.startsWith("/transactions/new") &&
          !/^\/transactions\/[^/]+\/edit$/.test(pathname) &&
          !pathname.startsWith("/transactions/import") &&
          !pathname.startsWith("/transactions/split") && (
            <Link
              href="/transactions/new"
              aria-label="Add transaction"
              className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full text-white shadow-lg active:scale-95 transition grid place-items-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.4)",
              }}
            >
              <Plus className="w-7 h-7" strokeWidth={2.5} />
            </Link>
          )}

        {/* Mobile bottom nav — rounded top corners, edge-to-edge with safe-area padding */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[28px] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pb-safe"
        >
          <div className="grid grid-cols-4">
            {nav.map((n) => {
              const active = pathname === n.href || pathname?.startsWith(n.href + "/");
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-2.5 text-xs gap-1",
                    active ? "text-brand-600" : "text-slate-500"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
