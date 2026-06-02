"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Loader2 } from "lucide-react";

export function ReceiptScanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);

    const fd = new FormData();
    fd.append("image", file);
    const r = await fetch("/api/ocr/parse", { method: "POST", body: fd });
    const j = await r.json();
    setBusy(false);

    if (!r.ok || !j?.parsed) {
      setErr(j?.error || "Could not read receipt");
      return;
    }
    const p = j.parsed;
    if ((p.confidence ?? 0) < 0.3) {
      setErr("Image doesn't look like a receipt. Try a clearer photo.");
      return;
    }
    const params = new URLSearchParams();
    if (p.amount != null) params.set("amount", String(p.amount));
    if (p.currency) params.set("currency", p.currency);
    if (p.merchant) params.set("merchant", p.merchant);
    if (p.occurred_at) params.set("occurred_at", p.occurred_at);
    if (p.category_hint) params.set("category_hint", p.category_hint);
    if (p.items) params.set("note", p.items);
    router.push(`/transactions/new?${params.toString()}`);
  }

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-sm text-slate-600">
        Receipt ပုံ တင်ပါ — AI က amount, merchant, date ကို auto-detect ပြီး form ထဲ ဖြည့်ပေးပါမယ်။
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="card p-6 text-center cursor-pointer hover:bg-slate-50 border-2 border-dashed border-slate-300">
          <Camera className="w-10 h-10 mx-auto text-brand-500 mb-2" />
          <div className="font-medium">Take photo</div>
          <div className="text-xs text-slate-500">Camera</div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </label>
        <label className="card p-6 text-center cursor-pointer hover:bg-slate-50 border-2 border-dashed border-slate-300">
          <Upload className="w-10 h-10 mx-auto text-brand-500 mb-2" />
          <div className="font-medium">Upload</div>
          <div className="text-xs text-slate-500">JPG / PNG / HEIC</div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </label>
      </div>

      {busy && (
        <div className="card p-6 flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Reading receipt with AI…
        </div>
      )}

      {preview && (
        <div className="card p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="receipt" className="rounded-lg max-h-96 mx-auto" />
        </div>
      )}

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}
    </div>
  );
}
