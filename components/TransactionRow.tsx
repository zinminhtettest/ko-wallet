"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, MessageCircle, Mic, Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import { ClientDate } from "@/components/ClientDate";
import { useDialog } from "@/components/DialogProvider";
import { shortenTransferLabel } from "@/lib/format-transaction";

type Tx = {
  id: string;
  amount: number;
  currency: string;
  kind: "expense" | "income";
  note: string | null;
  merchant: string | null;
  occurred_at: string;
  source: string | null;
  created_by_name: string | null;
  telegram_username: string | null;
  category?: { name: string; icon: string; color: string } | null;
};

export function TransactionRow({ tx }: { tx: Tx }) {
  const router = useRouter();
  const supabase = createClient();
  const dialog = useDialog();
  const [deleting, setDeleting] = useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!(await dialog.confirm({ message: "Delete this transaction?", destructive: true }))) return;
    setDeleting(true);
    const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
    if (error) {
      dialog.notify({ kind: "error", message: "Delete failed: " + error.message });
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  const isEmoji = tx.category?.icon && !/^[a-z\-]+$/i.test(tx.category.icon);

  // Build source badge
  let SourceIcon: any = null;
  let sourceTitle = "";
  switch (tx.source) {
    case "krungthai_email":
      SourceIcon = Mail;
      sourceTitle = "Auto-imported from bank email";
      break;
    case "telegram_text":
      SourceIcon = MessageCircle;
      sourceTitle = "via Telegram (typed)";
      break;
    case "telegram_voice":
      SourceIcon = Mic;
      sourceTitle = "via Telegram voice note";
      break;
    case "telegram_photo":
      SourceIcon = Camera;
      sourceTitle = "via Telegram photo receipt";
      break;
  }

  // Build attribution label: prefer Telegram username; for email-sourced
  // transactions show "Mail@<username>"; otherwise show creator name.
  const attribution = tx.telegram_username
    ? `Tg ${tx.telegram_username}`
    : tx.source === "krungthai_email" && tx.created_by_name
    ? `Mail@${tx.created_by_name}`
    : tx.created_by_name
    ? tx.created_by_name
    : null;

  // Shorten "Transfer to own [Bank Name] account" → "Transfer to own — BBL"
  const headline = shortenTransferLabel(
    tx.merchant || tx.note || tx.category?.name || "Transaction"
  );

  return (
    <li>
      <div className="relative flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <Link
          href={`/transactions/${tx.id}/edit`}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <div
            className="w-10 h-10 rounded-xl grid place-items-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: tx.category?.color || "#94a3b8" }}
          >
            {isEmoji ? (
              <span className="text-base leading-none">{tx.category!.icon}</span>
            ) : (
              (tx.category?.name || "?").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate flex items-center gap-1.5">
              {headline}
              {SourceIcon && (
                <span title={sourceTitle}>
                  <SourceIcon className="w-3 h-3 text-brand-500 flex-shrink-0" />
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 truncate">
              <ClientDate value={tx.occurred_at} /> ·{" "}
              {tx.category?.name || "Uncategorized"}
              {attribution && (
                <span className="ml-1 text-slate-400">· {attribution}</span>
              )}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`font-semibold whitespace-nowrap ${
              tx.kind === "income" ? "text-green-600" : "text-red-600"
            }`}
          >
            {tx.kind === "income" ? "+" : "−"}{" "}
            {formatMoney(Number(tx.amount), tx.currency)}
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
