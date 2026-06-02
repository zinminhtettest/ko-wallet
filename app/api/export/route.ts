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
      "id, amount, currency, kind, note, merchant, occurred_at, source, category:categories(name)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", range.from.toISOString())
    .lte("occurred_at", range.to.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(5000);

  if (sp.kind === "expense" || sp.kind === "income") q = q.eq("kind", sp.kind);
  if (sp.currency) q = q.eq("currency", sp.currency);

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
