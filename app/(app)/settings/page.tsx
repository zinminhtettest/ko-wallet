import Link from "next/link";
import { Users, Mail, Wallet, Tag, Repeat, PieChart, MessageCircle, ArrowRightLeft, Send, Target, Globe, Briefcase, TrendingUp, Building2, Languages, LogOut } from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";
import { getServerT } from "@/lib/user-lang";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("Settings")}</h1>

      <Link href="/settings/language" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Languages className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{t("Language")}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">English / မြန်မာ / ไทย</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/wallet" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{t("Wallet Settings")}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Rename wallet, change default currency
          </div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/investments" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{t("Investments")}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Stocks, crypto, gold positions</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/bank-accounts" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{t("Bank Accounts")}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Track balances across banks</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/workspace" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Family Workspace</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Invite family members to share this workspace</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/categories" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Tag className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Categories</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Add, edit, or delete custom categories</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/budgets" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <PieChart className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Budgets</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Set monthly limits per category + alerts</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/recurring" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Repeat className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Recurring Transactions</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Subscriptions, rent, salary — auto-create on schedule</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/telegram" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Telegram Bot</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Add transactions and get alerts via Telegram</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/digest" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Auto Digest</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Daily/weekly summary pushed to Telegram</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/transfers/new" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Transfer Between Wallets</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Move money from one wallet to another</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/goals" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Saving Goals</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Set targets and track progress</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/currency" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Currency Rates</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">FX rates for Net Worth combined view</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/clients" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Briefcase className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Clients & Invoices</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Track outstanding invoices for your business</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <Link href="/settings/gmail" className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Krungthai Bank Auto-Import</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Connect Gmail to auto-import bank transactions</div>
        </div>
        <div className="text-slate-400 dark:text-slate-500">→</div>
      </Link>

      <div className="card p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 grid place-items-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{ctx.workspace.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Default currency: {ctx.workspace.default_currency}</div>
        </div>
      </div>

      {/* Sign out (visible on mobile + desktop) */}
      <form action="/auth/signout" method="POST" className="md:hidden">
        <button
          type="submit"
          className="card p-5 flex items-center gap-4 w-full text-left hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 grid place-items-center">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-red-600 dark:text-red-400">Sign out</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {ctx.user.email}
            </div>
          </div>
        </button>
      </form>
    </div>
  );
}
