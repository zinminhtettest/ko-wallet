import Link from "next/link";
import { getActiveWorkspace } from "@/lib/workspace";
import { WalletSettingsForm } from "@/components/WalletSettingsForm";

export const dynamic = "force-dynamic";

export default async function WalletSettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const isOwner = ctx.role === "owner";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href="/settings" className="text-sm text-slate-500">← Settings</Link>
        <h1 className="text-2xl font-bold mt-1">Wallet Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          {ctx.workspace.name} · {ctx.workspace.default_currency} · {ctx.role}
        </p>
      </div>

      <WalletSettingsForm
        initialName={ctx.workspace.name}
        initialCurrency={ctx.workspace.default_currency}
        canEdit={isOwner}
        isOwner={isOwner}
        workspaceId={ctx.workspace.id}
      />
    </div>
  );
}
