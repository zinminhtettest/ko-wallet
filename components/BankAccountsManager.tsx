"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, Building2 } from "lucide-react";

type Account = {
  id: string;
  bank_name: string;
  account_label: string | null;
  currency: string;
  balance: number;
  last_updated_at: string;
};

export function BankAccountsManager({ defaultCurrency }: { defaultCurrency: string }) {
  const [list, setList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [bank, setBank] = useState("");
  const [label, setLabel] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [balance, setBalance] = useState("0");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/bank-accounts", { cache: "no-store" });
    const j = await r.json();
    setList(j?.accounts || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bank_name: bank,
        account_label: label || null,
        currency,
        balance: parseFloat(balance) || 0,
      }),
    });
    setBusy(false);
    setShowAdd(false);
    setBank("");
    setLabel("");
    setBalance("0");
    load();
  }

  async function del(a: Account) {
    if (!confirm(`Delete account "${a.bank_name}"?`)) return;
    await fetch(`/api/bank-accounts/${a.id}`, { method: "DELETE" });
    load();
  }

  async function saveBalance(a: Account) {
    await fetch(`/api/bank-accounts/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ balance: parseFloat(editBalance) }),
    });
    setEditingId(null);
    setEditBalance("");
    load();
  }

  // Total per currency
  const totals: Record<string, number> = {};
  for (const a of list) {
    totals[a.currency] = (totals[a.currency] || 0) + Number(a.balance);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Bank account balances ကို ကိုယ်တိုင် တွေ့ပြီး update လုပ်ပါ
        </p>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-primary text-sm py-2 px-3">
          <Plus className="w-4 h-4" /> {showAdd ? "Cancel" : "Add Account"}
        </button>
      </div>

      {Object.keys(totals).length > 0 && (
        <div className="card p-4">
          <div className="font-semibold mb-2">Total Balances</div>
          {Object.entries(totals).map(([cur, t]) => (
            <div key={cur} className="flex justify-between text-sm py-1">
              <span>{cur}</span>
              <span className="font-bold">{t.toLocaleString()} {cur}</span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <form onSubmit={add} className="card p-5 space-y-3">
          <div>
            <label className="label">Bank name *</label>
            <input
              className="input"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Krungthai / Bangkok Bank / KBZ"
              required
            />
          </div>
          <div>
            <label className="label">Account label (optional)</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Main / Savings / Business"
            />
          </div>
          <div className="grid grid-cols-[1fr,100px] gap-2">
            <div>
              <label className="label">Current balance</label>
              <input
                className="input"
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
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
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Saving..." : "Save Account"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No bank accounts yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{a.bank_name}</div>
                  {a.account_label && (
                    <div className="text-xs text-slate-500">{a.account_label}</div>
                  )}
                  <div className="text-xs text-slate-400">
                    Updated {new Date(a.last_updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={() => del(a)} className="p-1.5 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {editingId === a.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      className="input text-sm"
                      inputMode="decimal"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                    />
                    <button onClick={() => saveBalance(a)} className="btn-primary text-xs py-1.5">
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditBalance("");
                      }}
                      className="p-1.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(a.id);
                        setEditBalance(String(a.balance));
                      }}
                      className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Update balance
                    </button>
                    <div className="text-xl font-bold">
                      {Number(a.balance).toLocaleString()} {a.currency}
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
