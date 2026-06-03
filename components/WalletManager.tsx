"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Lock, Wallet as WalletIcon, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/DialogProvider";

export type WalletRow = {
  id: string;
  name: string;
  currency: string;
  role: "owner" | "member";
};

const CURRENCIES = ["THB", "MMK", "USD"];

export function WalletManager({
  initialWallets,
  activeId,
}: {
  initialWallets: WalletRow[];
  activeId: string;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [wallets, setWallets] = useState<WalletRow[]>(initialWallets);
  const [activeWalletId, setActiveWalletId] = useState(activeId);
  const [selectedId, setSelectedId] = useState<string>(activeId);
  const [showCreate, setShowCreate] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const selected = useMemo(
    () => wallets.find((w) => w.id === selectedId) || wallets[0],
    [wallets, selectedId]
  );

  function pickWallet(id: string) {
    setSelectedId(id);
    setShowMobileDetail(true);
  }

  async function setAsDefault(wsId: string) {
    if (wsId === activeWalletId) return;
    const r = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: wsId }),
    });
    if (r.ok) {
      try {
        sessionStorage.removeItem("ko_ws_cache_v1");
      } catch {}
      setActiveWalletId(wsId);
      dialog.notify({ kind: "success", message: "Default wallet updated" });
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      dialog.notify({ kind: "error", message: j?.error || "Failed to switch" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-5">
        {/* Master list — mobile shows full width, hidden when a wallet is opened */}
        <aside
          className={cn(
            "space-y-2",
            showMobileDetail ? "hidden md:block" : "block"
          )}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            My Wallets ({wallets.length})
          </div>
          {wallets.map((w) => {
            const isActive = w.id === activeWalletId;
            const isSelected = w.id === selected?.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => pickWallet(w.id)}
                className={cn(
                  "w-full text-left rounded-xl p-3 border transition",
                  isSelected
                    ? "bg-brand-600 border-brand-400 text-white shadow-md"
                    : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg grid place-items-center flex-shrink-0",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                      )}
                    >
                      <WalletIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-sm font-semibold truncate",
                          isSelected ? "text-white" : "text-slate-900 dark:text-white"
                        )}
                      >
                        {w.name}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] flex items-center gap-1",
                          isSelected
                            ? "text-blue-100"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {w.currency} · {w.role}
                        {w.role === "member" && (
                          <Lock className="w-2.5 h-2.5 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <span
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      )}
                    >
                      DEFAULT
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 px-3 py-2.5 text-brand-600 dark:text-brand-400 text-sm font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> New wallet
          </button>
        </aside>

        {/* Detail panel */}
        {selected && (
          <section
            className={cn(showMobileDetail ? "block" : "hidden md:block")}
          >
            <button
              type="button"
              onClick={() => setShowMobileDetail(false)}
              className="md:hidden mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" /> Back to wallets
            </button>
            <WalletDetail
              key={selected.id}
              wallet={selected}
              isActive={selected.id === activeWalletId}
              onSetDefault={() => setAsDefault(selected.id)}
              onUpdated={(name, currency) => {
                setWallets((cur) =>
                  cur.map((w) =>
                    w.id === selected.id ? { ...w, name, currency } : w
                  )
                );
                router.refresh();
              }}
              onDeleted={() => {
                const remaining = wallets.filter((w) => w.id !== selected.id);
                setWallets(remaining);
                if (selected.id === activeWalletId) {
                  // Active wallet deleted — server will bootstrap a fresh one
                  // on next request; navigate home so cookies/state reset.
                  try {
                    sessionStorage.removeItem("ko_ws_cache_v1");
                  } catch {}
                  window.location.href = "/dashboard";
                } else {
                  if (remaining[0]) setSelectedId(remaining[0].id);
                  router.refresh();
                }
              }}
            />
          </section>
        )}
      </div>

      {showCreate && (
        <CreateWalletModal
          onClose={() => setShowCreate(false)}
          onCreated={(newWs) => {
            setWallets((cur) => [...cur, newWs]);
            setSelectedId(newWs.id);
            setShowCreate(false);
            setShowMobileDetail(true);
            try {
              sessionStorage.removeItem("ko_ws_cache_v1");
            } catch {}
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function WalletDetail({
  wallet,
  isActive,
  onSetDefault,
  onUpdated,
  onDeleted,
}: {
  wallet: WalletRow;
  isActive: boolean;
  onSetDefault: () => void;
  onUpdated: (name: string, currency: string) => void;
  onDeleted: () => void;
}) {
  const dialog = useDialog();
  const [name, setName] = useState(wallet.name);
  const [currency, setCurrency] = useState(wallet.currency);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = wallet.role === "owner";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/workspace/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: wallet.id,
          name: name.trim(),
          currency,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        dialog.notify({ kind: "error", message: j?.error || "Save failed" });
      } else {
        dialog.notify({ kind: "success", message: "Wallet updated" });
        onUpdated(name.trim(), currency);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    const ok = await dialog.confirm({
      title: `Delete "${wallet.name}"?`,
      message:
        "Every transaction, category, budget, goal, member, and invite in this wallet will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete forever",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/workspace/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: wallet.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        dialog.notify({
          kind: "error",
          title: "Could not delete",
          message: j?.error || "Delete failed",
        });
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch (e: any) {
      dialog.notify({ kind: "error", message: e?.message || "Delete failed" });
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold truncate">{wallet.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {wallet.currency} · {wallet.role}
          {isActive && " · active (your default)"}
        </p>
      </div>

      <form onSubmit={save} className="card p-5 space-y-4">
        <div>
          <label className="label">Wallet name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner}
            required
          />
          {!isOwner && (
            <div className="text-xs text-slate-500 mt-1">
              Only the wallet owner can rename this wallet.
            </div>
          )}
        </div>
        <div>
          <label className="label">Default currency</label>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={!isOwner}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {!isOwner && (
            <div className="text-xs text-slate-500 mt-1">
              Only the wallet owner can change the default currency.
            </div>
          )}
        </div>
        {isOwner && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save changes"}
          </button>
        )}
      </form>

      <div className="card p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">Default wallet</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            The wallet that opens on login. Switch any time.
          </div>
        </div>
        {isActive ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
            <Check className="w-3 h-3" /> Default
          </span>
        ) : (
          <button
            type="button"
            onClick={onSetDefault}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex-shrink-0"
          >
            Set as default
          </button>
        )}
      </div>

      {isOwner && (
        <div className="card p-5 border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20">
          <div className="font-semibold text-red-700 dark:text-red-300">
            Danger zone
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-3">
            Permanently delete this wallet and all its data. If this is your
            last wallet, a fresh empty one is created automatically on your next
            visit.
          </p>
          <button
            type="button"
            onClick={del}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : `Delete "${wallet.name}"`}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateWalletModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (w: WalletRow) => void;
}) {
  const dialog = useDialog();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), currency }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        dialog.notify({ kind: "error", message: j?.error || "Create failed" });
        setBusy(false);
        return;
      }
      const wsId: string = j.workspace_id || j.id;
      if (!wsId) {
        dialog.notify({
          kind: "error",
          message: "Created but no id returned. Refresh the page.",
        });
        setBusy(false);
        return;
      }
      onCreated({
        id: wsId,
        name: name.trim(),
        currency,
        role: "owner",
      });
    } catch (e: any) {
      dialog.notify({ kind: "error", message: e?.message || "Create failed" });
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Create new wallet
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Wallet name</label>
            <input
              autoFocus
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Business"
              required
            />
          </div>
          <div>
            <label className="label">Default currency</label>
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="btn-primary flex-1"
            >
              {busy ? "Creating..." : "Create wallet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
