"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function WalletSettingsForm({
  initialName,
  initialCurrency,
  canEdit,
}: {
  initialName: string;
  initialCurrency: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setSaving(true);
    try {
      const r = await fetch("/api/workspace/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), currency }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Save failed");
      setOk(true);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Wallet name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          required
        />
      </div>
      <div>
        <label className="label">Default currency</label>
        <select
          className="input"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={!canEdit}
        >
          <option value="THB">THB ฿</option>
          <option value="MMK">MMK K</option>
          <option value="USD">USD $</option>
        </select>
      </div>

      {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{err}</div>}
      {ok && <div className="rounded-lg bg-green-50 text-green-700 text-sm p-3">Saved!</div>}

      {canEdit ? (
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save changes"}
        </button>
      ) : (
        <div className="text-sm text-slate-500">
          Only the wallet owner can edit these settings.
        </div>
      )}
    </form>
  );
}
