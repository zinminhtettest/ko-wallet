import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { WalletManager, type WalletRow } from "@/components/WalletManager";

export const dynamic = "force-dynamic";

type WsRpc = {
  workspace_id: string;
  workspace_name: string;
  default_currency: string;
  role: "owner" | "member";
};

export default async function WalletSettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;

  const supabase = createClient();
  const { data } = await supabase.rpc("list_my_workspaces");
  const wallets: WalletRow[] = ((data ?? []) as WsRpc[]).map((w) => ({
    id: w.workspace_id,
    name: w.workspace_name,
    currency: w.default_currency,
    role: w.role,
  }));

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <Link href="/settings" className="text-sm text-slate-500">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold mt-1">Wallet Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage every wallet you own or belong to.
        </p>
      </div>

      <WalletManager initialWallets={wallets} activeId={ctx.workspace.id} />
    </div>
  );
}
