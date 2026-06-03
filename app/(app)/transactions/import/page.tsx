import { BulkImportForm } from "@/components/BulkImportForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerT } from "@/lib/user-lang";

export default async function BulkImportPage() {
  const t = await getServerT();
  return (
    <div className="max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back")}
      </Link>
      <h1 className="text-2xl font-bold mb-2">{t("Bulk Import")}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {t("Upload a CSV to add many transactions at once.")}
      </p>
      <BulkImportForm />
    </div>
  );
}
