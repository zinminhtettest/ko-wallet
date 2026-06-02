import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

/**
 * POST /api/import/bulk
 * Body: { rows: Array<{ date, kind, amount, currency, merchant?, note?, category? }> }
 * Inserts the rows into transactions, mapping category by name if found.
 */
export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "no_rows" }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "too_many_rows" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("workspace_id", ctx.workspace.id);
  const catMap: Record<string, string> = {};
  for (const c of (cats ?? []) as any[]) {
    catMap[`${c.kind}|${c.name.toLowerCase()}`] = c.id;
  }

  const displayName =
    (ctx.user.user_metadata as any)?.full_name ||
    (ctx.user.user_metadata as any)?.name ||
    ctx.user.email?.split("@")[0] ||
    null;

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];
  const inserts: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const amt = parseFloat(r.amount);
    if (!amt || amt <= 0) {
      skipped += 1;
      errors.push(`Row ${i + 1}: invalid amount`);
      continue;
    }
    const kind = r.kind === "income" ? "income" : "expense";
    const cur = (r.currency || ctx.workspace.default_currency).toUpperCase();
    if (!["THB", "MMK", "USD"].includes(cur)) {
      skipped += 1;
      errors.push(`Row ${i + 1}: bad currency "${cur}"`);
      continue;
    }
    const occurredAt = r.date ? new Date(r.date).toISOString() : new Date().toISOString();
    const catName = (r.category || "").toLowerCase().trim();
    const catId = catName ? catMap[`${kind}|${catName}`] : null;

    inserts.push({
      workspace_id: ctx.workspace.id,
      user_id: ctx.user.id,
      amount: amt,
      currency: cur,
      kind,
      category_id: catId || null,
      merchant: r.merchant || null,
      note: r.note || null,
      occurred_at: occurredAt,
      source: "manual",
      created_by_name: displayName,
    });
    added += 1;
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("transactions").insert(inserts);
    if (error) {
      return NextResponse.json(
        { error: error.message, added: 0, skipped },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, added, skipped, errors });
}
