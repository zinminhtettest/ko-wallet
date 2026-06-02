import { CurrencyRatesForm } from "@/components/CurrencyRatesForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CurrencySettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
      </Link>
      <h1 className="text-2xl font-bold">Currency Rates</h1>
      <CurrencyRatesForm />
    </div>
  );
}
