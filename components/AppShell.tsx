"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, ListChecks, BarChart3, Settings, LogOut, Wallet, Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";

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
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-6 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <WorkspaceSwitcher activeId={activeWorkspaceId} />
          </div>
          <NotificationBell className="w-9 h-9 mt-0.5" />
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="px-3 py-2 text-xs text-slate-500 truncate">{userEmail}</div>
          <form action="/auth/signout" method="POST">
            <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 grid place-items-center text-white">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-semibold">Ko Wallet</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell className="w-9 h-9" />
            <Link href="/transactions/new" className="btn-primary py-1.5 px-3 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add
            </Link>
          </div>
        </header>

        <div className="px-4 py-5 md:px-8 md:py-8 pb-24 md:pb-8">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-4">
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
        </nav>
      </main>
    </div>
  );
}
