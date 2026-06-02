import { BulkImportForm } from "@/components/BulkImportForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BulkImportPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Bulk Import</h1>
      <p className="text-sm text-slate-500 mb-6">
        CSV ဖိုင် တင်ပြီး transaction တွေ တစ်ပတ်တည်း add လုပ်ပါ။
      </p>
      <BulkImportForm />
    </div>
  );
}
