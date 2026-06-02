import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const updates: Record<string, any> = {};
  for (const k of ["symbol", "asset_type", "quantity", "buy_price", "buy_currency", "current_price", "notes"]) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  if (body.current_price !== undefined) {
    updates.current_price_updated_at = new Date().toISOString();
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("investments")
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
    .from("investments")
    .delete()
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
