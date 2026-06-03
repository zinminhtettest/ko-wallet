import { getActiveWorkspace } from "@/lib/workspace";
import { ClientsManager } from "@/components/ClientsManager";
import { getServerT } from "@/lib/user-lang";

export default async function ClientsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("Clients")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("Track clients and outstanding invoices for your business wallets (mini-CRM).")}
        </p>
      </div>
      <ClientsManager defaultCurrency={ctx.workspace.default_currency} />
    </div>
  );
}
