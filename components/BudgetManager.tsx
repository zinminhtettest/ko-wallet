"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Category } from "@/lib/types";

type Budget = {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  period: string;
  categories?: { name: string; icon: string; color: string; kind: string } | null;
};
type Status = {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: number;
  currency: string;
  spent: number;
  pct: number;
};

export function BudgetManager({ categories }: { categories: Category[] }) {
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [status, setStatus] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [catId, setCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/budgets", { cache: "no-store" });
    const j = await r.json();
    setBudgets(j?.budgets || []);
    setStatus(j?.status || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catId || !amount) return;
    setSaving(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category_id: catId, amount, currency }),
    });
    setSaving(false);
    setShowForm(false);
    setAmount("");
    setCatId("");
    load();
  }

  async function del(b: Budget) {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/budgets/${b.id}`, { method: "DELETE" });
    load();
  }

  const merged = budgets.map((b) => {
    const s = status.find((x) => x.category_id === b.category_id);
    return { ...b, status: s };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          လ စဉ် category တစ်ခုစီအတွက် budget သတ်မှတ်ပါ — 80% / 100% reached ရင် alert ပေး
        </p>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary text-sm py-2 px-3">
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Budget"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card p-5 space-y-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={catId} onChange={(e) => setCatId(e.target.value)} required>
              <option value="">— select —</option>
              {expenseCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr,100px] gap-2">
            <div>
              <label className="label">Monthly Limit</label>
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
          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving ? "Saving..." : "Save Budget"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading…</div>
      ) : merged.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No budgets set yet.</div>
      ) : (
        <ul className="space-y-3">
          {merged.map((b) => {
            const pct = b.status ? Number(b.status.pct) : 0;
            const spent = b.status ? Number(b.status.spent) : 0;
            const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500";
            return (
              <li key={b.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{b.categories?.name || "Category"}</div>
                  <button onClick={() => del(b)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{spent.toLocaleString()} {b.currency}</span>
                  <span>{b.amount.toLocaleString()} {b.currency} · {Math.round(pct)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
