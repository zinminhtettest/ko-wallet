"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

type Row = {
  date: string;
  kind: string;
  amount: string;
  currency: string;
  merchant: string;
  note: string;
  category: string;
};

function parseCSV(text: string): Row[] {
  // Strip BOM
  text = text.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const splitRow = (row: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (inQuotes) {
        if (ch === '"' && row[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === ",") {
          out.push(cur);
          cur = "";
        } else if (ch === '"') {
          inQuotes = true;
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out;
  };

  const headers = splitRow(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );
  const required: Record<string, string> = {
    date: "date",
    kind: "kind",
    amount: "amount",
    currency: "currency",
    merchant: "merchant",
    note: "note",
    category: "category",
  };

  const colIdx: Record<string, number> = {};
  for (const [k, h] of Object.entries(required)) {
    colIdx[k] = headers.indexOf(h);
  }

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    rows.push({
      date: colIdx.date >= 0 ? cells[colIdx.date]?.trim() || "" : "",
      kind: colIdx.kind >= 0 ? cells[colIdx.kind]?.trim() || "expense" : "expense",
      amount: colIdx.amount >= 0 ? cells[colIdx.amount]?.trim() || "" : "",
      currency: colIdx.currency >= 0 ? cells[colIdx.currency]?.trim() || "" : "",
      merchant: colIdx.merchant >= 0 ? cells[colIdx.merchant]?.trim() || "" : "",
      note: colIdx.note >= 0 ? cells[colIdx.note]?.trim() || "" : "",
      category: colIdx.category >= 0 ? cells[colIdx.category]?.trim() || "" : "",
    });
  }
  return rows;
}

export function BulkImportForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErr("File too large (max 2MB).");
      return;
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      setErr("Could not parse rows. Make sure headers match: date,kind,amount,currency,merchant,note,category");
      return;
    }
    setRows(parsed);
  }

  async function importNow() {
    if (rows.length === 0) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    const r = await fetch("/api/import/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setErr(j?.error || "Import failed");
      return;
    }
    setResult(
      `✓ Added ${j.added}, skipped ${j.skipped}.${
        j.errors?.length ? "\n" + j.errors.slice(0, 5).join("\n") : ""
      }`
    );
    setRows([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="font-semibold mb-2">Expected CSV format</div>
        <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded overflow-x-auto">
          {`date,kind,amount,currency,merchant,note,category
2026-06-02,expense,120,THB,7-Eleven,lunch,Food
2026-06-02,income,50000,THB,,salary,Salary`}
        </pre>
        <p className="text-xs text-slate-500 mt-2">
          Tip: ki-Wallet Export CSV ဖိုင်က ဒီ format အတိုင်းပါ — ပြုပြင်ပြီး ပြန် import လုပ်လို့ ရ။
        </p>
      </div>

      <label className="card p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 border-2 border-dashed border-slate-300 block">
        <Upload className="w-10 h-10 mx-auto text-brand-500 mb-2" />
        <div className="font-medium">Upload CSV file</div>
        <div className="text-xs text-slate-500">Max 2 MB · UTF-8 encoded</div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFile}
        />
      </label>

      {rows.length > 0 && (
        <>
          <div className="card p-4">
            <div className="font-semibold mb-2">Preview ({rows.length} rows)</div>
            <div className="overflow-x-auto max-h-72">
              <table className="text-xs w-full">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left p-1">Date</th>
                    <th className="text-left p-1">Kind</th>
                    <th className="text-right p-1">Amount</th>
                    <th className="text-left p-1">Cur</th>
                    <th className="text-left p-1">Merchant</th>
                    <th className="text-left p-1">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-1">{r.date}</td>
                      <td className="p-1">{r.kind}</td>
                      <td className="p-1 text-right">{r.amount}</td>
                      <td className="p-1">{r.currency}</td>
                      <td className="p-1">{r.merchant}</td>
                      <td className="p-1">{r.category}</td>
                    </tr>
                  ))}
                  {rows.length > 50 && (
                    <tr>
                      <td colSpan={6} className="p-1 text-center text-slate-400">
                        ...and {rows.length - 50} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={importNow} disabled={busy} className="btn-primary w-full py-3">
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing...
              </>
            ) : (
              `Import ${rows.length} rows`
            )}
          </button>
        </>
      )}

      {err && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm whitespace-pre-wrap">{err}</div>}
      {result && <div className="rounded-lg bg-green-50 text-green-700 p-3 text-sm whitespace-pre-wrap">{result}</div>}
    </div>
  );
}
