import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";

const ALLOWED_KINDS = new Set(["expense", "income"]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const supabase = createClient();

  // Verify the category belongs to the active workspace before updating
  const { data: existing, error: fetchErr } = await supabase
    .from("categories")
    .select("id, workspace_id, is_system")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing || existing.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
    updates.name = name;
  }
  if (typeof body?.icon === "string") {
    updates.icon = body.icon.trim() || "wallet";
  }
  if (typeof body?.color === "string") {
    updates.color = body.color.trim();
  }
  if (typeof body?.kind === "string") {
    const k = body.kind.toLowerCase();
    if (!ALLOWED_KINDS.has(k)) {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    updates.kind = k;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("categories")
    .select("id, workspace_id, is_system")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing || existing.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.is_system) {
    return NextResponse.json({ error: "cannot_delete_system" }, { status: 400 });
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
