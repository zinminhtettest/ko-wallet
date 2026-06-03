import { getActiveWorkspace } from "@/lib/workspace";
import { InvestmentsManager } from "@/components/InvestmentsManager";
import { getServerT } from "@/lib/user-lang";

export default async function InvestmentsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("Investments")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("Track stocks, crypto, gold positions with gain/loss")}
        </p>
      </div>
      <InvestmentsManager />
    </div>
  );
}
