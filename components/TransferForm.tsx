"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type Wallet = {
  workspace_id: string;
  workspace_name: string;
  default_currency: string;
};

export function TransferForm({
  wallets,
  defaultFromId,
}: {
  wallets: Wallet[];
  defaultFromId: string;
}) {
  const router = useRouter();
  const [fromId, setFromId] = useState(defaultFromId);
  const [toId, setToId] = useState(
    wallets.find((w) => w.workspace_id !== defaultFromId)?.workspace_id || ""
  );
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fromWs = wallets.find((w) => w.workspace_id === fromId);
  const toWs = wallets.find((w) => w.workspace_id === toId);
  const sameCurrency = fromWs?.default_currency === toWs?.default_currency;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!fromId || !toId || fromId === toId) {
      setErr("Wallet ၂ ခု မတူအောင် ရွေးပါ");
      return;
    }
    const fAmt = parseFloat(fromAmount);
    if (!fAmt || fAmt <= 0) {
      setErr("Amount မှန်ကန်တဲ့ ဂဏန်း ထည့်ပါ");
      return;
    }
    const tAmt = sameCurrency ? fAmt : parseFloat(toAmount);
    if (!tAmt || tAmt <= 0) {
      setErr("To amount မှန်ကန်တဲ့ ဂဏန်း ထည့်ပါ");
      return;
    }
    setSaving(true);
    const r = await fetch("/api/transfers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        from_workspace_id: fromId,
        to_workspace_id: toId,
        from_amount: fAmt,
        from_currency: fromWs!.default_currency,
        to_amount: tAmt,
        to_currency: toWs!.default_currency,
        note: note || null,
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) {
      setErr(j?.error || "Transfer failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <div>
        <label className="label">From wallet</label>
        <select className="input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {wallets.map((w) => (
            <option key={w.workspace_id} value={w.workspace_id}>
              {w.workspace_name} ({w.default_currency})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-center">
        <ArrowRight className="w-5 h-5 text-slate-400" />
      </div>

      <div>
        <label className="label">To wallet</label>
        <select className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">— select —</option>
          {wallets
            .filter((w) => w.workspace_id !== fromId)
            .map((w) => (
              <option key={w.workspace_id} value={w.workspace_id}>
                {w.workspace_name} ({w.default_currency})
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="label">
          Amount {fromWs ? `(${fromWs.default_currency})` : ""}
        </label>
        <input
          className="input text-xl font-semibold"
          inputMode="decimal"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {!sameCurrency && toWs && (
        <div>
          <label className="label">
            Converted amount in {toWs.default_currency}
          </label>
          <input
            className="input text-xl font-semibold"
            inputMode="decimal"
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            FX rate ကိုကိုယ်တိုင်ဖြည့်ပါ (ဥပမာ 1000 THB → 100,000 MMK)
          </p>
        </div>
      )}

      <div>
        <label className="label">Note (optional)</label>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Move savings to business wallet"
        />
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{err}</div>}

      <button type="submit" disabled={saving} className="btn-primary w-full py-3">
        {saving ? "Saving..." : "Save Transfer"}
      </button>
    </form>
  );
}
