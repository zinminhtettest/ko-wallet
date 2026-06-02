"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function ImportNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/import-krungthai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });
      const j = await r.json();
      setResult(`✓ Added: ${j.added}, Skipped: ${j.skipped}, Errors: ${j.errors}`);
      router.refresh();
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button onClick={run} disabled={loading} className="btn-primary text-sm">
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Import Now (last 30 days)"}
      </button>
      {result && <span className="text-xs text-slate-600">{result}</span>}
    </div>
  );
}
