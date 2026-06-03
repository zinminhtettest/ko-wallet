"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";
import { useT } from "@/lib/i18n-client";

export function CancelInviteButton({
  inviteId,
  email,
}: {
  inviteId: string;
  email: string;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function onCancel() {
    const ok = await dialog.confirm({
      title: t("Cancel this invite?"),
      message: `${t("The invite link sent to")} ${email} ${t("will stop working. They can be invited again later.")}`,
      confirmLabel: t("Cancel invite"),
      cancelLabel: t("Keep invite"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/workspace/invites/${inviteId}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        dialog.notify({ kind: "error", message: j?.error || t("Cancel failed") });
        setBusy(false);
        return;
      }
      dialog.notify({ kind: "success", message: t("Invite cancelled") });
      router.refresh();
    } catch (e: any) {
      dialog.notify({ kind: "error", message: e?.message || t("Cancel failed") });
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
      title={t("Cancel invite")}
    >
      <X className="w-3.5 h-3.5" />
      {busy ? t("Cancelling...") : t("Cancel")}
    </button>
  );
}
