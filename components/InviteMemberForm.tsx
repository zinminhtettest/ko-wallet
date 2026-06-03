"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";
import { useT } from "@/lib/i18n-client";

export function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const dialog = useDialog();
  const t = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true); setLink(null);
    try {
      const r = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, email: email.trim().toLowerCase() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("Failed to create invite"));
      setLink(j.url);
      setEmail("");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); dialog.notify({ kind: "success", message: t("Link copied!") }); } catch {}
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="family@example.com"
          className="input flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button disabled={loading} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          {loading ? "..." : t("Invite")}
        </button>
      </div>
      {err && <div className="text-red-700 text-sm">{err}</div>}
      {link && (
        <div className="rounded-lg bg-green-50 p-3 text-sm">
          <div className="font-medium text-green-800 mb-1">{t("Invite created — share this link:")}</div>
          <div className="break-all text-xs text-slate-700">{link}</div>
          <button type="button" onClick={copy} className="text-xs text-brand-600 mt-1 hover:underline">
            {t("Copy link")}
          </button>
        </div>
      )}
    </form>
  );
}
