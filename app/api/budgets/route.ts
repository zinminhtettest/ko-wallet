import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("id, category_id, amount, currency, period, categories(name, icon, color, kind)")
    .eq("workspace_id", ctx.workspace.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch usage
  const { data: status } = await supabase.rpc("budget_status", { ws_id: ctx.workspace.id });
  return NextResponse.json({ budgets: data ?? [], status: status ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { category_id, amount, currency } = await request.json();
  if (!category_id || !amount || !currency) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const supabase = createClient();
  const { error } = await supabase.from("budgets").upsert(
    {
      workspace_id: ctx.workspace.id,
      category_id,
      amount: Number(amount),
      currency,
      period: "monthly",
    },
    { onConflict: "workspace_id,category_id,period" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
