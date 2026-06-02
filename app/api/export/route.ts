import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { NextResponse } from "next/server";

function csvEscape(s: any): string {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (sp[k] = v));
  const range = parseRangeFromSearchParams(sp);

  const supabase = createClient();
  let q = supabase
    .from("transactions")
    .select(
      "id, amount, currency, kind, note, merchant, occurred_at, source, tax_deductible, created_by_name, telegram_username, category:categories(name)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", range.from.toISOString())
    .lte("occurred_at", range.to.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(5000);

  if (sp.kind === "expense" || sp.kind === "income") q = q.eq("kind", sp.kind);
  if (sp.currency) q = q.eq("currency", sp.currency);
  if (sp.tax === "1") q = q.eq("tax_deductible", true);
  if (sp.min) {
    const min = parseFloat(sp.min);
    if (!isNaN(min)) q = q.gte("amount", min);
  }
  if (sp.max) {
    const max = parseFloat(sp.max);
    if (!isNaN(max)) q = q.lte("amount", max);
  }
  if (sp.q) {
    const term = sp.q.replace(/[%_]/g, "");
    q = q.or(`merchant.ilike.%${term}%,note.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as any[];
  const header = [
    "Date",
    "Kind",
    "Amount",
    "Currency",
    "Category",
    "Merchant",
    "Note",
    "Source",
    "TaxDeductible",
    "CreatedBy",
    "TelegramUsername",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.occurred_at).toISOString(),
        r.kind,
        r.amount,
        r.currency,
        r.category?.name || "",
        r.merchant || "",
        r.note || "",
        r.source || "manual",
        r.tax_deductible ? "yes" : "no",
        r.created_by_name || "",
        r.telegram_username || "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = "﻿" + lines.join("\n"); // BOM so Excel reads UTF-8
  const filename = `ko-wallet_${ctx.workspace.name.replace(/\s+/g, "_")}_${
    range.from.toISOString().slice(0, 10)
  }_${range.to.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
