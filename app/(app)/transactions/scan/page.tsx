import { ReceiptScanner } from "@/components/ReceiptScanner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="space-y-5">
      <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>
      <h1 className="text-2xl font-bold">Scan Receipt</h1>
      <ReceiptScanner />
    </div>
  );
}
