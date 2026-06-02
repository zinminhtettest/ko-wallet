import { TelegramLinkPanel } from "@/components/TelegramLinkPanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TelegramSettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/settings" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
      </Link>
      <h1 className="text-2xl font-bold">Telegram Bot</h1>
      <TelegramLinkPanel />
    </div>
  );
}
