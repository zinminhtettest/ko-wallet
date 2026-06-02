"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Category, Currency, TxKind } from "@/lib/types";
import { Trash2 } from "lucide-react";

type Existing = {
  id: string;
  amount: number;
  currency: string;
  kind: string;
  note: string | null;
  merchant: string | null;
  category_id: string | null;
  occurred_at: string;
};

export function TransactionForm({
  workspaceId,
  categories,
  defaultCurrency,
  existing,
}: {
  workspaceId: string;
  categories: Category[];
  defaultCurrency: Currency;
  existing?: Existing;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [kind, setKind] = useState<TxKind>((existing?.kind as TxKind) || "expense");
  const [amount, setAmount] = useState<string>(existing ? String(existing.amount) : "");
  const [currency, setCurrency] = useState<Currency>((existing?.currency as Currency) || defaultCurrency);
  const [categoryId, setCategoryId] = useState<string>(existing?.category_id || "");
  const [merchant, setMerchant] = useState(existing?.merchant || "");
  const [note, setNote] = useState(existing?.note || "");
  const [occurredAt, setOccurredAt] = useState(
    (existing?.occurred_at || new Date().toISOString()).slice(0, 16)
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
      setErr("Amount မှန်ကန်တဲ့ ဂဏန်း ထည့်ပါ");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErr("Login session expired"); setSaving(false); return;
    }
    const row = {
      workspace_id: workspaceId,
      user_id: user.id,
      amount: amt,
      currency,
      kind,
      category_id: categoryId || null,
      merchant: merchant || null,
      note: note || null,
      occurred_at: new Date(occurredAt).toISOString(),
    };
    const op = existing
      ? supabase.from("transactions").update(row).eq("id", existing.id)
      : supabase.from("transactions").insert(row);
    const { error } = await op;
    if (error) { setErr(error.message); setSaving(false); return; }
    router.push("/transactions");
    router.refresh();
  }

  async function onDelete() {
    if (!existing) return;
    if (!confirm("Delete လုပ်ချင်တာ သေချာလား?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", existing.id);
    if (error) { setErr(error.message); return; }
    router.push("/transactions");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
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
            {k === "expense" ? "Expense (သုံး)" : "Income (ဝင်)"}
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
