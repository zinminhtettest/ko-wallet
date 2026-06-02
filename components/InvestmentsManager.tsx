"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Pencil, X } from "lucide-react";

type Investment = {
  id: string;
  symbol: string;
  asset_type: string;
  quantity: number;
  buy_price: number;
  buy_currency: string;
  current_price: number | null;
  current_price_updated_at: string | null;
  notes: string | null;
  cost: number;
  current_value: number | null;
  gain_loss: number | null;
  gain_loss_pct: number | null;
};

const TYPES = ["stock", "crypto", "gold", "bond", "etf", "other"];

export function InvestmentsManager() {
  const [list, setList] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState("stock");
  const [qty, setQty] = useState("");
  const [buy, setBuy] = useState("");
  const [cur, setCur] = useState("THB");
  const [now, setNow] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/investments", { cache: "no-store" });
    const j = await r.json();
    setList(j?.investments || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/investments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol,
        asset_type: type,
        quantity: qty,
        buy_price: buy,
        buy_currency: cur,
        current_price: now || null,
        notes: notes || null,
      }),
    });
    setBusy(false);
    setShowAdd(false);
    setSymbol("");
    setQty("");
    setBuy("");
    setNow("");
    setNotes("");
    load();
  }

  async function del(p: Investment) {
    if (!confirm(`Delete ${p.symbol}?`)) return;
    await fetch(`/api/investments/${p.id}`, { method: "DELETE" });
    load();
  }

  async function savePrice(p: Investment) {
    await fetch(`/api/investments/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current_price: parseFloat(editPrice) }),
    });
    setEditingId(null);
    setEditPrice("");
    load();
  }

  // Aggregate totals per currency
  const totals: Record<string, { cost: number; value: number }> = {};
  for (const p of list) {
    totals[p.buy_currency] = totals[p.buy_currency] || { cost: 0, value: 0 };
    totals[p.buy_currency].cost += p.cost;
    if (p.current_value != null) totals[p.buy_currency].value += p.current_value;
    else totals[p.buy_currency].value += p.cost;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Stocks / crypto / gold positions — current prices ကို ကိုယ်တိုင် update လုပ်ပါ
        </p>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-primary text-sm py-2 px-3">
          <Plus className="w-4 h-4" /> {showAdd ? "Cancel" : "Add Position"}
        </button>
      </div>

      {/* Portfolio totals */}
      {Object.keys(totals).length > 0 && (
        <div className="card p-4">
          <div className="font-semibold mb-2">Portfolio Total</div>
          {Object.entries(totals).map(([c, t]) => {
            const gain = t.value - t.cost;
            const pct = t.cost > 0 ? (gain / t.cost) * 100 : 0;
            return (
              <div key={c} className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 py-2 last:border-b">
                <div className="text-sm">
                  <div className="font-semibold">{c}</div>
                  <div className="text-xs text-slate-500">
                    Cost {t.cost.toLocaleString()} → Value {t.value.toLocaleString()}
                  </div>
                </div>
                <div className={`text-right font-bold ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {gain >= 0 ? "+" : ""}{gain.toLocaleString()} {c}
                  <div className="text-xs">{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <form onSubmit={add} className="card p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Symbol *</label>
              <input
                className="input"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL, BTC, GLD"
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Quantity *</label>
              <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
            <div>
              <label className="label">Buy price *</label>
              <input className="input" inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} required />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={cur} onChange={(e) => setCur(e.target.value)}>
                <option value="THB">THB</option>
                <option value="MMK">MMK</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Current price (optional)</label>
            <input className="input" inputMode="decimal" value={now} onChange={(e) => setNow(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Saving..." : "Save Position"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No investments yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => {
            const gainPositive = (p.gain_loss ?? 0) >= 0;
            const noPrice = p.current_price == null;
            return (
              <li key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold flex items-center gap-2">
                      {p.symbol}
                      <span className="text-xs font-normal text-slate-400 uppercase">{p.asset_type}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {Number(p.quantity).toLocaleString()} units · cost {p.cost.toLocaleString()} {p.buy_currency}
                    </div>
                    {p.notes && (
                      <div className="text-xs text-slate-400 mt-1">{p.notes}</div>
                    )}
                  </div>
                  <button onClick={() => del(p)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {editingId === p.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        className="input text-sm"
                        inputMode="decimal"
                        placeholder="New current price"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                      <button onClick={() => savePrice(p)} className="btn-primary text-xs py-1.5">
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditPrice("");
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
                          setEditingId(p.id);
                          setEditPrice(p.current_price != null ? String(p.current_price) : "");
                        }}
                        className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />{" "}
                        {noPrice ? "Set current price" : `Current: ${Number(p.current_price).toLocaleString()}`}
                      </button>
                      {p.gain_loss != null && (
                        <div className={`text-right ${gainPositive ? "text-green-600" : "text-red-600"}`}>
                          <div className="font-bold inline-flex items-center gap-1">
                            {gainPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {gainPositive ? "+" : ""}
                            {p.gain_loss!.toLocaleString()} {p.buy_currency}
                          </div>
                          <div className="text-xs">
                            {gainPositive ? "+" : ""}
                            {p.gain_loss_pct!.toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
