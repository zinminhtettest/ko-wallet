import { getActiveWorkspace } from "@/lib/workspace";
import { ClientsManager } from "@/components/ClientsManager";

export default async function ClientsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track clients and outstanding invoices for your business wallets.
        </p>
      </div>
      <ClientsManager defaultCurrency={ctx.workspace.default_currency} />
    </div>
  );
}
