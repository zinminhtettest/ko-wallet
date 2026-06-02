import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const updates: Record<string, any> = {};
  for (const k of [
    "name",
    "amount",
    "currency",
    "kind",
    "category_id",
    "merchant",
    "note",
    "frequency",
    "next_run_at",
    "active",
  ]) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  if (updates.amount !== undefined) updates.amount = Number(updates.amount);
  if (updates.next_run_at) updates.next_run_at = new Date(updates.next_run_at).toISOString();

  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_rules")
    .update(updates)
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
