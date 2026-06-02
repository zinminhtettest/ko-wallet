"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

type Member = { id: string; user_id: string; email: string };
type Category = { id: string; name: string; kind: string };

export function SplitBillForm({
  members,
  categories,
  defaultCurrency,
}: {
  members: Member[];
  categories: Category[];
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(members.map((m) => m.user_id))
  );
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalNum = parseFloat(total) || 0;
  const share = selected.size > 0 ? totalNum / selected.size : 0;

  function toggle(uid: string) {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (selected.size < 2) {
      setErr("Participant အနည်းဆုံး ၂ ယောက် ရွေးပါ");
      return;
    }
    if (totalNum <= 0) {
      setErr("Total amount ထည့်ပါ");
      return;
    }
    setSaving(true);
    const r = await fetch("/api/split-bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        total: totalNum,
        currency,
        merchant: merchant || null,
        note: note || null,
        category_id: categoryId || null,
        participant_user_ids: Array.from(selected),
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) {
      setErr(j?.error || "Save failed");
      return;
    }
    router.push("/transactions");
    router.refresh();
  }

  const expenseCats = categories.filter((c) => c.kind === "expense");

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <div className="grid grid-cols-[1fr,100px] gap-2">
        <div>
          <label className="label">Total amount</label>
          <input
            className="input text-xl font-semibold"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="label">Currency</label>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="THB">THB</option>
            <option value="MMK">MMK</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Merchant (where you ate / spent)</label>
        <input
          className="input"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Mango Tree restaurant"
        />
      </div>

      <div>
        <label className="label">Category</label>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">(uncategorized)</option>
          {expenseCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label flex items-center gap-2">
          <Users className="w-4 h-4" /> Split among ({selected.size} selected)
        </label>
        <div className="grid grid-cols-1 gap-2">
          {members.map((m) => (
            <label
              key={m.user_id}
              className={`p-3 rounded-xl border cursor-pointer text-sm flex items-center gap-2 ${
                selected.has(m.user_id)
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(m.user_id)}
                onChange={() => toggle(m.user_id)}
              />
              <span className="flex-1 truncate">{m.email}</span>
            </label>
          ))}
        </div>
      </div>

      {totalNum > 0 && selected.size > 0 && (
        <div className="card p-4 bg-brand-50/40 dark:bg-brand-900/20">
          <div className="text-sm text-slate-600 dark:text-slate-300">Each person pays:</div>
          <div className="text-2xl font-bold text-brand-700">
            {share.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
          </div>
        </div>
      )}

      <div>
        <label className="label">Note (optional)</label>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Birthday dinner"
        />
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{err}</div>}

      <button type="submit" disabled={saving} className="btn-primary w-full py-3">
        {saving ? "Saving..." : "Create Split"}
      </button>
    </form>
  );
}
