"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientDate } from "@/components/ClientDate";
import { useT } from "@/lib/i18n-client";

export type NotificationItem = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsList({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const t = useT();

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    setBusy(true);
    try {
      const r = await fetch("/api/notifications/read-all", { method: "POST" });
      if (r.ok) {
        const now = new Date().toISOString();
        setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    const found = items.find((n) => n.id === id);
    if (!found || found.read_at) return;
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
      router.refresh();
    } catch {
      /* ignore */
    }
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <div className="font-semibold">{t("No notifications yet")}</div>
        <div className="text-sm text-slate-500">
          {t("Invites, joins, and system updates appear here.")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy}
            className="btn-secondary text-sm"
          >
            <Check className="w-4 h-4" /> {t("Mark all as read")}
          </button>
        </div>
      )}
      <ul className="card divide-y divide-slate-100">
        {items.map((n) => {
          const Inner = (
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                  n.read_at ? "bg-transparent" : "bg-brand-500"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className={cn("font-medium", !n.read_at && "text-slate-900")}>
                  {n.title}
                </div>
                {n.body && (
                  <div className="text-sm text-slate-600">{n.body}</div>
                )}
                <div className="text-xs text-slate-400 mt-0.5">
                  <ClientDate value={n.created_at} withTime />
                </div>
              </div>
            </div>
          );
          const cls = cn(
            "block p-4 hover:bg-slate-50",
            !n.read_at && "bg-brand-50/30"
          );
          if (n.link) {
            return (
              <li key={n.id}>
                <Link
                  href={n.link}
                  onClick={() => markRead(n.id)}
                  className={cls}
                >
                  {Inner}
                </Link>
              </li>
            );
          }
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => markRead(n.id)}
                className={cn(cls, "w-full text-left")}
              >
                {Inner}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
