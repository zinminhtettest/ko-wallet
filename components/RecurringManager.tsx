"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pause, Play } from "lucide-react";
import { Category } from "@/lib/types";

type Rule = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  kind: "expense" | "income";
  category_id: string | null;
  merchant: string | null;
  note: string | null;
  frequency: "daily" | "weekly" | "monthly";
  next_run_at: string;
  active: boolean;
  categories?: { name: string; icon: string; color: string } | null;
};

export function RecurringManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/recurring", { cache: "no-store" });
    const j = await r.json();
    setRules(j?.rules || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const r = await fetch("/api/recurring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        amount,
        currency,
        kind,
        category_id: categoryId || null,
        merchant: merchant || null,
        note: note || null,
        frequency,
        next_run_at: nextRun,
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) {
      setErr(j?.error || "Save failed");
      return;
    }
    setShowForm(false);
    setName("");
    setAmount("");
    setMerchant("");
    setNote("");
    await load();
    router.refresh();
  }

  async function toggle(rule: Rule) {
    await fetch(`/api/recurring/${rule.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    load();
  }

  async function del(rule: Rule) {
    if (!confirm(`Delete "${rule.name}"?`)) return;
    await fetch(`/api/recurring/${rule.id}`, { method: "DELETE" });
    load();
  }

  const filteredCats = categories.filter((c) => c.kind === kind);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Subscriptions လို ပုံမှန် ပြန်ဖြစ်တဲ့ transactions တွေ — schedule အလိုက် auto-create
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-primary text-sm py-2 px-3"
        >
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Rule"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setKind("expense");
                setCategoryId("");
              }}
              className={`py-2 rounded-lg text-sm font-medium ${
                kind === "expense" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("income");
                setCategoryId("");
              }}
              className={`py-2 rounded-lg text-sm font-medium ${
                kind === "income" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              Income
            </button>
          </div>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" required />
          </div>
          <div className="grid grid-cols-[1fr,100px] gap-2">
            <div>
              <label className="label">Amount *</label>
              <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">(uncategorized)</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Merchant (optional)</label>
            <input className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Frequency</label>
              <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="label">Next Run</label>
              <input type="datetime-local" className="input" value={nextRun} onChange={(e) => setNextRun(e.target.value)} required />
            </div>
          </div>
          {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{err}</div>}
          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No recurring rules yet.</div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-4 gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium flex items-center gap-2">
                  <span className={r.active ? "" : "text-slate-400 line-through"}>{r.name}</span>
                  {!r.active && <span className="text-[10px] uppercase text-slate-400">paused</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {r.amount} {r.currency} · {r.frequency} · next {new Date(r.next_run_at).toLocaleDateString()}
                  {r.categories?.name ? ` · ${r.categories.name}` : ""}
                </div>
              </div>
              <button onClick={() => toggle(r)} className="p-2 hover:bg-slate-100 rounded-lg" title={r.active ? "Pause" : "Resume"}>
                {r.active ? <Pause className="w-4 h-4 text-slate-500" /> : <Play className="w-4 h-4 text-green-600" />}
              </button>
              <button onClick={() => del(r)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
