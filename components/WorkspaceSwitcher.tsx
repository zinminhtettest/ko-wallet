"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Check, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceRow = {
  workspace_id: string;
  workspace_name: string;
  owner_id: string;
  default_currency: string;
  role: "owner" | "member";
  is_owner: boolean;
};

export function WorkspaceSwitcher({ activeId }: { activeId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState("THB");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cache the workspace list per browser session so we don't refetch on every
    // remount / nav prefetch (multiple WorkspaceSwitcher instances + Transfer
    // page all hit the same RPC). 30-second TTL is enough to feel fresh.
    const CACHE_KEY = "ko_ws_cache_v1";
    const TTL_MS = 30_000;
    let cancelled = false;

    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.ts && Date.now() - cached.ts < TTL_MS && Array.isArray(cached.data)) {
          setWorkspaces(cached.data);
          setLoading(false);
          return;
        }
      }
    } catch {}

    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_my_workspaces");
      if (cancelled) return;
      if (!error && data) {
        const rows = data as WorkspaceRow[];
        setWorkspaces(rows);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: rows })
          );
        } catch {}
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = workspaces.find((w) => w.workspace_id === activeId);
  const activeName = active?.workspace_name || "My Wallet";

  async function switchTo(id: string) {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Switch failed");
      }
      try { sessionStorage.removeItem("ko_ws_cache_v1"); } catch {}
      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function createWallet(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!newName.trim()) {
      setErr("Name မထည့်ရသေးပါ");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), currency: newCurrency }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Create failed");
      try { sessionStorage.removeItem("ko_ws_cache_v1"); } catch {}
      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center text-white flex-shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight">Ko Wallet</div>
          <div className="text-xs text-slate-500 truncate">{activeName}</div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 card p-1 shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
          ) : (
            <>
              <ul className="max-h-72 overflow-y-auto">
                {workspaces.map((w) => {
                  const isActive = w.workspace_id === activeId;
                  return (
                    <li key={w.workspace_id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => switchTo(w.workspace_id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-slate-100",
                          isActive && "bg-brand-50 text-brand-700"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{w.workspace_name}</div>
                          <div className="text-xs text-slate-500">
                            {w.default_currency} · {w.role}
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4" />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-slate-100 mt-1 pt-1">
                {showCreate ? (
                  <form onSubmit={createWallet} className="p-2 space-y-2">
                    <input
                      autoFocus
                      className="input"
                      placeholder="Wallet name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <select
                      className="input"
                      value={newCurrency}
                      onChange={(e) => setNewCurrency(e.target.value)}
                    >
                      <option value="THB">THB ฿</option>
                      <option value="MMK">MMK K</option>
                      <option value="USD">USD $</option>
                    </select>
                    {err && (
                      <div className="text-xs text-red-700">{err}</div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="btn-primary text-xs flex-1 py-2"
                      >
                        {busy ? "..." : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreate(false);
                          setErr(null);
                        }}
                        className="btn-secondary text-xs py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-brand-700 hover:bg-brand-50"
                  >
                    <Plus className="w-4 h-4" /> New Wallet
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
