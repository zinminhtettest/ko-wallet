"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Receipt } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";

type Invoice = { amount: number; currency: string; status: string };
type Client = {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
  invoices?: Invoice[];
};

export function ClientsManager({ defaultCurrency }: { defaultCurrency: string }) {
  const dialog = useDialog();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Invoice add state per client
  const [openInvoiceFor, setOpenInvoiceFor] = useState<string | null>(null);
  const [invAmount, setInvAmount] = useState("");
  const [invCurrency, setInvCurrency] = useState(defaultCurrency);
  const [invDesc, setInvDesc] = useState("");
  const [invDue, setInvDue] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/clients", { cache: "no-store" });
    const j = await r.json();
    setClients(j?.clients || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, contact: contact || null, notes: notes || null }),
    });
    setSaving(false);
    setShowAdd(false);
    setName("");
    setContact("");
    setNotes("");
    load();
  }

  async function delClient(c: Client) {
    if (!(await dialog.confirm({ message: `Delete client "${c.name}"? All invoices for this client will be removed too.`, destructive: true }))) return;
    await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
    load();
  }

  async function addInvoice(clientId: string) {
    if (!invAmount) return;
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        amount: parseFloat(invAmount),
        currency: invCurrency,
        description: invDesc || null,
        due_date: invDue || null,
      }),
    });
    setOpenInvoiceFor(null);
    setInvAmount("");
    setInvDesc("");
    setInvDue("");
    load();
  }

  function aggOwed(c: Client) {
    const totals: Record<string, number> = {};
    for (const inv of c.invoices || []) {
      if (inv.status === "paid" || inv.status === "cancelled") continue;
      totals[inv.currency] = (totals[inv.currency] || 0) + Number(inv.amount);
    }
    return totals;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Clients + မပေးရသေးတဲ့ invoices (mini-CRM)
        </p>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-primary text-sm py-2 px-3">
          <Plus className="w-4 h-4" /> {showAdd ? "Cancel" : "Add Client"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addClient} className="card p-5 space-y-3">
          <div>
            <label className="label">Client name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Contact (phone, email, Telegram)</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Save Client"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading…</div>
      ) : clients.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No clients yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((c) => {
            const owed = aggOwed(c);
            return (
              <li key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{c.name}</div>
                    {c.contact && (
                      <div className="text-xs text-slate-500 truncate">{c.contact}</div>
                    )}
                    {c.notes && (
                      <div className="text-xs text-slate-400 mt-1">{c.notes}</div>
                    )}
                  </div>
                  <button onClick={() => delClient(c)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                {Object.keys(owed).length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm">
                    <span className="text-amber-700 font-semibold">⏳ Owed:</span>{" "}
                    {Object.entries(owed)
                      .map(([cur, amt]) => `${amt.toLocaleString()} ${cur}`)
                      .join(" · ")}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {openInvoiceFor === c.id ? (
                    <div className="w-full space-y-2 border-t border-slate-200 pt-3">
                      <div className="grid grid-cols-[1fr,100px] gap-2">
                        <input
                          className="input"
                          placeholder="Amount"
                          inputMode="decimal"
                          value={invAmount}
                          onChange={(e) => setInvAmount(e.target.value)}
                        />
                        <select
                          className="input"
                          value={invCurrency}
                          onChange={(e) => setInvCurrency(e.target.value)}
                        >
                          <option value="THB">THB</option>
                          <option value="MMK">MMK</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <input
                        className="input"
                        placeholder="Description (optional)"
                        value={invDesc}
                        onChange={(e) => setInvDesc(e.target.value)}
                      />
                      <input
                        type="date"
                        className="input"
                        placeholder="Due date"
                        value={invDue}
                        onChange={(e) => setInvDue(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => addInvoice(c.id)}
                          className="btn-primary text-sm flex-1 py-2"
                        >
                          Save Invoice
                        </button>
                        <button
                          onClick={() => setOpenInvoiceFor(null)}
                          className="btn-secondary text-sm py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setOpenInvoiceFor(c.id)}
                      className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Receipt className="w-3 h-3" /> Add invoice
                    </button>
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
