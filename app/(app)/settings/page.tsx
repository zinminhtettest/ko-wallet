import Link from "next/link";
import { Users, Mail, Wallet, Tag } from "lucide-react";
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
