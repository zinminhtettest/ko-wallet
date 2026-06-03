"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { ClientDate } from "@/components/ClientDate";
import { useDialog } from "@/components/DialogProvider";
import { useT } from "@/lib/i18n-client";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  currency: string;
  deadline: string | null;
  progress: number;
  pct: number;
};

export function SavingsGoalsManager({ defaultCurrency }: { defaultCurrency: string }) {
  const dialog = useDialog();
  const t = useT();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/goals", { cache: "no-store" });
    const j = await r.json();
    setGoals(j?.goals || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        target_amount: target,
        currency,
        deadline: deadline || null,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setName("");
    setTarget("");
    setDeadline("");
    load();
  }

  async function del(g: Goal) {
    if (!(await dialog.confirm({ message: `Delete goal "${g.name}"?`, destructive: true }))) return;
    await fetch(`/api/goals/${g.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {t("Set a savings target. Progress = income − expense since the goal was created, in the chosen currency.")}
        </p>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary text-sm py-2 px-3">
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Goal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card p-5 space-y-3">
          <div>
            <label className="label">Goal name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iPhone 16, New car, Emergency fund"
              required
            />
          </div>
          <div className="grid grid-cols-[1fr,100px] gap-2">
            <div>
              <label className="label">Target amount</label>
              <input
                className="input"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
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
            <label className="label">Deadline (optional)</label>
            <input
              type="date"
              className="input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving ? "Saving..." : "Save Goal"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading…</div>
      ) : goals.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No saving goals yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const color =
              g.pct >= 100 ? "bg-green-500" : g.pct >= 50 ? "bg-brand-500" : "bg-slate-400";
            return (
              <li key={g.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {g.name}
                      {g.pct >= 100 && <span className="text-xs text-green-600">✓ Achieved!</span>}
                    </div>
                    {g.deadline && (
                      <div className="text-xs text-slate-500">
                        Deadline: <ClientDate value={g.deadline} />
                      </div>
                    )}
                  </div>
                  <button onClick={() => del(g)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{g.progress.toLocaleString()} {g.currency}</span>
                  <span>
                    {Number(g.target_amount).toLocaleString()} {g.currency} · {g.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: `${Math.min(100, g.pct)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
