"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Category, Currency, TxKind } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { VoiceCaptureButton } from "@/components/VoiceCaptureButton";
import { useDialog } from "@/components/DialogProvider";

// Convert a stored ISO timestamp (UTC) to the "YYYY-MM-DDTHH:mm" format that
// <input type="datetime-local"> expects in the BROWSER'S local timezone.
function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 16);
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

type Existing = {
  id: string;
  amount: number;
  currency: string;
  kind: string;
  note: string | null;
  merchant: string | null;
  category_id: string | null;
  occurred_at: string;
  tax_deductible?: boolean;
};

type Prefill = {
  amount?: string;
  currency?: string;
  merchant?: string;
  note?: string;
  occurred_at?: string;
  category_id?: string;
};

export function TransactionForm({
  workspaceId,
  categories,
  defaultCurrency,
  existing,
  prefill,
}: {
  workspaceId: string;
  categories: Category[];
  defaultCurrency: Currency;
  existing?: Existing;
  prefill?: Prefill;
}) {
  const router = useRouter();
  const supabase = createClient();
  const dialog = useDialog();

  const [kind, setKind] = useState<TxKind>((existing?.kind as TxKind) || "expense");
  const [amount, setAmount] = useState<string>(
    existing ? String(existing.amount) : prefill?.amount || ""
  );
  const [currency, setCurrency] = useState<Currency>(
    (existing?.currency as Currency) || (prefill?.currency as Currency) || defaultCurrency
  );
  const [categoryId, setCategoryId] = useState<string>(
    existing?.category_id || prefill?.category_id || ""
  );
  const [merchant, setMerchant] = useState(existing?.merchant || prefill?.merchant || "");
  const [note, setNote] = useState(existing?.note || prefill?.note || "");
  const [occurredAt, setOccurredAt] = useState(
    toLocalDatetimeInput(existing?.occurred_at || prefill?.occurred_at || new Date().toISOString())
  );
  const [taxDeductible, setTaxDeductible] = useState<boolean>(
    !!existing?.tax_deductible
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filteredCats = categories.filter((c) => c.kind === kind);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setErr("Enter a valid amount");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErr("Login session expired"); setSaving(false); return;
    }
    const displayName =
      (user.user_metadata as any)?.full_name ||
      (user.user_metadata as any)?.name ||
      user.email?.split("@")[0] ||
      null;
    const row: any = {
      workspace_id: workspaceId,
      user_id: user.id,
      amount: amt,
      currency,
      kind,
      category_id: categoryId || null,
      merchant: merchant || null,
      note: note || null,
      occurred_at: new Date(occurredAt).toISOString(),
      source: "manual",
      tax_deductible: taxDeductible,
    };
    if (!existing) row.created_by_name = displayName;

    // Try the full insert/update; if the database is missing optional columns
    // (user hasn't run all SQL migrations yet) we strip them and retry so the
    // user can still save the transaction.
    const OPTIONAL_COLS = [
      "tax_deductible",
      "created_by_name",
      "telegram_username",
      "tags",
    ];
    async function trySave(payload: any) {
      return existing
        ? supabase.from("transactions").update(payload).eq("id", existing.id)
        : supabase.from("transactions").insert(payload);
    }
    function looksLikeMissingColumn(message: string | undefined): boolean {
      if (!message) return false;
      const m = message.toLowerCase();
      // Supabase / PostgREST returns variants like:
      //   "Could not find the 'created_by_name' column of 'transactions' in the schema cache"
      //   "column \"tax_deductible\" of relation \"transactions\" does not exist"
      //   "Could not find column 'tags'..."
      if (m.includes("schema cache")) return true;
      if (m.includes("could not find")) return true;
      if (m.includes("does not exist")) return true;
      for (const col of OPTIONAL_COLS) {
        if (m.includes(col.toLowerCase())) return true;
      }
      return false;
    }

    let res = await trySave(row);
    if (res.error && looksLikeMissingColumn(res.error.message)) {
      const stripped: any = { ...row };
      for (const k of OPTIONAL_COLS) delete stripped[k];
      res = await trySave(stripped);
    }
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    // Fire-and-forget: check budgets, surface alert in-app via notifications.
    try { fetch("/api/budgets/check", { method: "POST" }); } catch {}
    router.push("/transactions");
    router.refresh();
  }

  async function onDelete() {
    if (!existing) return;
    if (!(await dialog.confirm({ message: "Delete this transaction?", destructive: true }))) return;
    const { error } = await supabase.from("transactions").delete().eq("id", existing.id);
    if (error) { setErr(error.message); return; }
    router.push("/transactions");
    router.refresh();
  }

  function applyVoice(p: any) {
    if (p.kind === "expense" || p.kind === "income") setKind(p.kind);
    if (p.amount) setAmount(String(p.amount));
    if (p.currency && ["THB", "MMK", "USD"].includes(p.currency)) {
      setCurrency(p.currency as Currency);
    }
    if (p.merchant) setMerchant(p.merchant);
    if (p.note) setNote(p.note);
    if (p.category_hint) {
      const desiredKind = p.kind || kind;
      const match = categories.find(
        (c) =>
          c.kind === desiredKind &&
          c.name.toLowerCase().includes(p.category_hint.toLowerCase())
      );
      if (match) setCategoryId(match.id);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      {!existing && <VoiceCaptureButton onParsed={applyVoice} />}
      {/* Kind toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        {(["expense", "income"] as TxKind[]).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => { setKind(k); setCategoryId(""); }}
            className={`py-2 rounded-lg text-sm font-medium ${
              kind === k ? (k === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white") : "text-slate-600"
            }`}
          >
            {k === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      {/* Amount + currency */}
      <div className="grid grid-cols-[1fr,110px] gap-2">
        <div>
          <label className="label">Amount</label>
          <input
            className="input text-2xl font-semibold"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="label">Currency</label>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="THB">THB ฿</option>
            <option value="MMK">MMK K</option>
            <option value="USD">USD $</option>
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="label">Category</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setCategoryId("")}
            className={`p-3 rounded-xl border text-sm flex flex-col items-center gap-1.5 ${
              categoryId === ""
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                : "border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
            }`}
          >
            <div className="w-8 h-8 rounded-lg grid place-items-center text-white text-[10px] font-bold bg-slate-400">
              —
            </div>
            <span className="text-xs">Uncategorized</span>
          </button>
          {filteredCats.map((c) => {
            const isEmoji = !/^[a-z\-]+$/i.test(c.icon);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`p-3 rounded-xl border text-sm flex flex-col items-center gap-1.5 ${
                  categoryId === c.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg grid place-items-center text-white text-[10px] font-bold"
                  style={{ background: c.color }}
                >
                  {isEmoji ? (
                    <span className="text-base leading-none">{c.icon}</span>
                  ) : (
                    c.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-xs">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Merchant (where you spent it)</label>
        <input className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. 7-Eleven, Lotus's" />
      </div>

      <div>
        <label className="label">Note (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="memo..." />
      </div>

      <div>
        <label className="label">Date & Time</label>
        <input
          type="datetime-local"
          className="input"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={taxDeductible}
          onChange={(e) => setTaxDeductible(e.target.checked)}
          className="rounded"
        />
        💼 Tax-deductible (business expense)
      </label>

      {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{err}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
          {saving ? "Saving..." : existing ? "Update Transaction" : "Save Transaction"}
        </button>
        {existing && (
          <button type="button" onClick={onDelete} className="btn-danger py-3">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
