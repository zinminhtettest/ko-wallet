"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";

export function TelegramLinkPanel() {
  const [state, setState] = useState<any>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<string | null>(null);
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
    setExpiry(j?.expires_at || null);
  }

  async function unlink() {
    if (!confirm("Disconnect Telegram?")) return;
    await fetch("/api/telegram/link", { method: "DELETE" });
    await load();
  }

  if (!state) return <div className="card p-6 text-slate-500">Loading…</div>;

  const botName = state.bot_username || "your_bot";

  if (state.linked) {
    return (
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 grid place-items-center">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold">Connected</div>
            <div className="text-sm text-slate-500">
              {state.username ? `@${state.username}` : `chat ${state.chat_id}`}
              {state.linked_at ? ` · since ${new Date(state.linked_at).toLocaleDateString()}` : ""}
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-600">
          Try in Telegram: <code className="bg-slate-100 px-1.5 rounded">/balance</code> ·{" "}
          <code className="bg-slate-100 px-1.5 rounded">/add 250 thb food coffee</code>
        </div>
        <button onClick={unlink} className="btn-danger text-sm">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="font-semibold">Connect Telegram</div>
          <div className="text-sm text-slate-500">Quick add transactions + budget alerts</div>
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
