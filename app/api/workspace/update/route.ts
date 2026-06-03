import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";

const ALLOWED_CURRENCIES = new Set(["THB", "MMK", "USD"]);

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const wsId: string = (body?.workspaceId || ctx.workspace.id).toString();
  const name: string = (body?.name || "").toString().trim();
  const currency: string = (body?.currency || ctx.workspace.default_currency)
    .toString()
    .toUpperCase();

  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  if (!ALLOWED_CURRENCIES.has(currency)) {
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  }

  const supabase = createClient();

  // Verify caller is owner of the target workspace (not just the active one).
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", wsId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "only_owner" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("update_workspace", {
    ws_id: wsId,
    ws_name: name,
    currency,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data === false) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
