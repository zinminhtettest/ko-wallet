import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select(
      "id, name, amount, currency, kind, category_id, merchant, note, frequency, next_run_at, active, categories(name, icon, color)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const {
    name,
    amount,
    currency,
    kind,
    category_id,
    merchant,
    note,
    frequency,
    next_run_at,
    reminder_days_before,
  } = body;

  if (!name || !amount || !currency || !kind || !frequency || !next_run_at) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      workspace_id: ctx.workspace.id,
      user_id: ctx.user.id,
      name,
      amount: Number(amount),
      currency,
      kind,
      category_id: category_id || null,
      merchant: merchant || null,
      note: note || null,
      frequency,
      next_run_at: new Date(next_run_at).toISOString(),
      reminder_days_before: parseInt(reminder_days_before as any) || 0,
      active: true,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
