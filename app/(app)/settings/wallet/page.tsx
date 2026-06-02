import Link from "next/link";
import { getActiveWorkspace } from "@/lib/workspace";
import { WalletSettingsForm } from "@/components/WalletSettingsForm";

export default async function WalletSettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <Link href="/settings" className="text-sm text-slate-500">← Settings</Link>
        <h1 className="text-2xl font-bold mt-1">Wallet Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Wallet name + default currency ပြောင်းနိုင်တယ်။
        </p>
      </div>

      <div className="card p-5">
        <WalletSettingsForm
          initialName={ctx.workspace.name}
          initialCurrency={ctx.workspace.default_currency}
          canEdit={ctx.role === "owner"}
        />
      </div>
    </div>
  );
}
