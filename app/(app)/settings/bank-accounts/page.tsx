import { getActiveWorkspace } from "@/lib/workspace";
import { BankAccountsManager } from "@/components/BankAccountsManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function BankAccountsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
      </Link>
      <h1 className="text-2xl font-bold">Bank Accounts</h1>
      <BankAccountsManager defaultCurrency={ctx.workspace.default_currency} />
    </div>
  );
}
