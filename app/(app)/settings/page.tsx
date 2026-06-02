import Link from "next/link";
import { Users, Mail, Wallet, Tag, Repeat, PieChart, MessageCircle, ArrowRightLeft, Send, Target } from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function SettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Link href="/settings/wallet" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Wallet Settings</div>
          <div className="text-sm text-slate-500">
            Rename wallet, change default currency
          </div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/workspace" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Family Workspace</div>
          <div className="text-sm text-slate-500">Invite family members to share this workspace</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/categories" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Tag className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Categories</div>
          <div className="text-sm text-slate-500">Add, edit, or delete custom categories</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/budgets" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <PieChart className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Budgets</div>
          <div className="text-sm text-slate-500">Set monthly limits per category + alerts</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/recurring" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Repeat className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Recurring Transactions</div>
          <div className="text-sm text-slate-500">Subscriptions, rent, salary — auto-create on schedule</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/telegram" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Telegram Bot</div>
          <div className="text-sm text-slate-500">Add transactions and get alerts via Telegram</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/digest" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Auto Digest</div>
          <div className="text-sm text-slate-500">Daily/weekly summary pushed to Telegram</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/transfers/new" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Transfer Between Wallets</div>
          <div className="text-sm text-slate-500">Move money from one wallet to another</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/goals" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Saving Goals</div>
          <div className="text-sm text-slate-500">Set targets and track progress</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <Link href="/settings/gmail" className="card p-5 flex items-center gap-4 hover:bg-slate-50">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Krungthai Bank Auto-Import</div>
          <div className="text-sm text-slate-500">Connect Gmail to auto-import bank transactions</div>
        </div>
        <div className="text-slate-400">→</div>
      </Link>

      <div className="card p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 grid place-items-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{ctx.workspace.name}</div>
          <div className="text-sm text-slate-500">Default currency: {ctx.workspace.default_currency}</div>
        </div>
      </div>
    </div>
  );
}
