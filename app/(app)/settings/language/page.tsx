import { LanguagePicker } from "@/components/LanguagePicker";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerT } from "@/lib/user-lang";

export default async function LanguagePage() {
  const t = await getServerT();
  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back to Settings")}
      </Link>
      <h1 className="text-2xl font-bold">{t("Language")}</h1>
      <LanguagePicker />
    </div>
  );
}
