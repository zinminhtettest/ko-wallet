"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Copy, Check, AlertTriangle, ArrowRightLeft } from "lucide-react";

type State = {
  linked: boolean;
  chat_id: number | null;
  username: string | null;
  linked_at: string | null;
  active_workspace_id: string | null;
  active_workspace_name: string | null;
  current_workspace_id: string;
  current_workspace_name: string;
  is_linked_to_current: boolean;
  bot_username: string | null;
};

export function TelegramLinkPanel() {
  const [state, setState] = useState<State | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const r = await fetch("/api/telegram/link", { cache: "no-store" });
    const j = await r.json();
    setState(j);
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    const r = await fetch("/api/telegram/link", { method: "POST" });
    const j = await r.json();
    setBusy(false);
    setCode(j?.code || null);
  }

  async function switchToCurrentWallet() {
    setBusy(true);
    await fetch("/api/telegram/link", { method: "PATCH" });
    setBusy(false);
    setCode(null);
    await load();
  }

  async function unlink() {
    if (!confirm("Disconnect Telegram?")) return;
    await fetch("/api/telegram/link", { method: "DELETE" });
    setCode(null);
    await load();
  }

  if (!state) return <div className="card p-6 text-slate-500">Loading…</div>;

  const botName = state.bot_username || "your_bot";

  // ---------- State 1: Linked to THIS wallet ----------
  if (state.linked && state.is_linked_to_current) {
    return (
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 grid place-items-center">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold">Connected to this wallet</div>
            <div className="text-sm text-slate-500">
              {state.username ? `@${state.username}` : `chat ${state.chat_id}`}
              {state.linked_at ? ` · since ${new Date(state.linked_at).toLocaleDateString()}` : ""}
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-600">
          ဒီ wallet (<b>{state.current_workspace_name}</b>) ထဲ Telegram က transaction တွေ ဝင်ပါမယ်။<br />
          Try: <code className="bg-slate-100 px-1.5 rounded">/balance</code> ·{" "}
          <code className="bg-slate-100 px-1.5 rounded">250 baht coffee</code>
        </div>
        <button onClick={unlink} className="btn-danger text-sm">
          Disconnect
        </button>
      </div>
    );
  }

  // ---------- State 2: Linked to ANOTHER wallet ----------
  if (state.linked && !state.is_linked_to_current) {
    return (
      <div className="space-y-4">
        <div className="card p-6 space-y-3 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 grid place-items-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                Telegram က <span className="text-amber-700">{state.active_workspace_name || "another wallet"}</span> ထဲ ဝင်နေတယ်
              </div>
              <div className="text-sm text-slate-500">
                {state.username ? `@${state.username}` : `chat ${state.chat_id}`}
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Telegram bot က transaction တွေကို တစ်ခါတည်း တစ်ခုပဲ wallet ထဲ ပို့နိုင်တယ်။
            <br />
            ဒီ wallet (<b>{state.current_workspace_name}</b>) ထဲ ပြောင်းပို့ချင်ရင် —
          </div>
          <button
            onClick={switchToCurrentWallet}
            disabled={busy}
            className="btn-primary text-sm py-2.5 inline-flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {busy ? "Switching..." : `Switch Telegram to "${state.current_workspace_name}"`}
          </button>
        </div>

        <div className="card p-5 text-sm text-slate-600">
          💡 Telegram ထဲမှာ command နဲ့လည်း ပြောင်းနိုင်ပါတယ်:
          <div className="mt-2 space-y-1">
            <div><code className="bg-slate-100 px-1.5 rounded">/use</code> — list all wallets</div>
            <div><code className="bg-slate-100 px-1.5 rounded">/use {state.current_workspace_name}</code> — switch to this wallet</div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- State 3: Not linked yet ----------
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="font-semibold">Connect Telegram</div>
          <div className="text-sm text-slate-500">
            ဒီ <b>{state.current_workspace_name}</b> wallet ထဲ Telegram bot က transaction တွေ ပို့ပါမယ်
          </div>
        </div>
      </div>

      <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
        <li>
          Open Telegram and start chat with{" "}
          <a
            className="text-brand-600 underline"
            target="_blank"
            rel="noreferrer"
            href={`https://t.me/${botName}`}
          >
            @{botName}
          </a>
        </li>
        <li>Tap "Generate code" below</li>
        <li>
          In the bot, send: <code className="bg-slate-100 px-1.5 rounded">/link CODE</code>
        </li>
      </ol>

      <button onClick={generate} disabled={busy} className="btn-primary py-2.5">
        {busy ? "Generating…" : code ? "Generate new code" : "Generate code"}
      </button>

      {code && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-600 mb-1">Your code (valid 15 min):</div>
            <div className="font-mono text-2xl tracking-widest text-brand-700">{code}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`/link ${code}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="p-2 rounded-lg bg-white border border-brand-200"
            title="Copy /link command"
          >
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
