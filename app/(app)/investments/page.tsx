import { getActiveWorkspace } from "@/lib/workspace";
import { InvestmentsManager } from "@/components/InvestmentsManager";

export default async function InvestmentsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Investments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track stocks, crypto, gold positions with gain/loss
        </p>
      </div>
      <InvestmentsManager />
    </div>
  );
}
