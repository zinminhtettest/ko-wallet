"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Check } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";
import { useT } from "@/lib/i18n-client";

export function WalletSettingsForm({
  initialName,
  initialCurrency,
  canEdit,
  isOwner,
  workspaceId: _workspaceId,
}: {
  initialName: string;
  initialCurrency: string;
  canEdit: boolean;
  isOwner: boolean;
  workspaceId: string;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const t = useT();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/workspace/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), currency }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        dialog.notify({ kind: "error", message: j?.error || t("Save failed") });
      } else {
        dialog.notify({ kind: "success", message: t("Wallet updated") });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteWallet() {
    const ok = await dialog.confirm({
      title: `${t("Delete")} "${initialName}"?`,
      message: t("Every transaction, category, budget, goal, member, and invite in this wallet will be permanently removed. This cannot be undone."),
      confirmLabel: t("Delete forever"),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/workspace/delete", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        dialog.notify({
          kind: "error",
          message: j?.error || t("Delete failed"),
          title: t("Could not delete"),
        });
        setDeleting(false);
        return;
      }
      try {
        sessionStorage.removeItem("ko_ws_cache_v1");
      } catch {}
      // Bootstrap will hand us a fresh wallet on the next request.
      window.location.href = "/dashboard";
    } catch (e: any) {
      dialog.notify({ kind: "error", message: e?.message || t("Delete failed") });
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={saveDetails} className="card p-5 space-y-4">
        <div>
          <label className="label">{t("Wallet name")}</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            required
          />
          {!canEdit && (
            <div className="text-xs text-slate-500 mt-1">
              {t("Only the wallet owner can rename this wallet.")}
            </div>
          )}
        </div>
        <div>
          <label className="label">{t("Default currency")}</label>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={!canEdit}
          >
            <option value="THB">THB ฿</option>
            <option value="MMK">MMK K</option>
            <option value="USD">USD $</option>
          </select>
          {!canEdit && (
            <div className="text-xs text-slate-500 mt-1">
              {t("Only the wallet owner can change the default currency.")}
            </div>
          )}
        </div>
        {canEdit && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t("Saving...") : t("Save changes")}
          </button>
        )}
      </form>

      <div className="card p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{t("Default wallet")}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t("The wallet that opens on login. Switch any time.")}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
          <Check className="w-3 h-3" /> {t("Default")}
        </span>
      </div>

      <Link
        href="/dashboard?new_wallet=1"
        className="card p-5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 border-dashed"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 grid place-items-center">
          <Plus className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{t("Create new wallet")}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t("Open the wallet picker in the sidebar and tap")}{" "}
            <span className="font-medium">{t("+ New Wallet")}</span>.
          </div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      {isOwner && (
        <div className="card p-5 border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20">
          <div className="font-semibold text-red-700 dark:text-red-300">
            {t("Danger zone")}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-3">
            {t("Permanently delete this wallet and all its data. If this is your last wallet, a fresh empty one is created automatically on your next visit.")}
          </p>
          <button
            type="button"
            onClick={deleteWallet}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? t("Deleting...") : `${t("Delete")} "${initialName}"`}
          </button>
        </div>
      )}
    </div>
  );
}
