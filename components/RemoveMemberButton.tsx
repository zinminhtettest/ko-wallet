"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";

export function RemoveMemberButton({
  memberId,
  email,
}: {
  memberId: string;
  email: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(`Remove ${email} from this wallet?\n\nAll their transactions stay in the wallet — they just lose access.`)) return;
    setBusy(true);
    const r = await fetch(`/api/workspace/members/${memberId}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      alert(j?.error || "Remove failed");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded inline-flex items-center gap-1"
      title="Remove from wallet"
    >
      <UserMinus className="w-3 h-3" />
      {busy ? "..." : "Remove"}
    </button>
  );
}
