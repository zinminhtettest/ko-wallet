"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";
import { useT } from "@/lib/i18n-client";

export function RemoveMemberButton({
  memberId,
  email,
}: {
  memberId: string;
  email: string;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!(await dialog.confirm({ message: `${t("Remove")} ${email} ${t("from this wallet?")}\n\n${t("All their transactions stay in the wallet — they just lose access.")}`, destructive: true }))) return;
    setBusy(true);
    const r = await fetch(`/api/workspace/members/${memberId}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      dialog.notify({ kind: "error", message: j?.error || t("Remove failed") });
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded inline-flex items-center gap-1"
      title={t("Remove from wallet")}
    >
      <UserMinus className="w-3 h-3" />
      {busy ? "..." : t("Remove")}
    </button>
  );
}
