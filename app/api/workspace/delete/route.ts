import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";

/**
 * POST /api/workspace/delete
 * Owner-only. Deletes the currently active workspace + every workspace-scoped
 * child row. After this call the active_workspace cookie should be cleared by
 * the caller and the user redirected (a new "My" wallet will be auto-created
 * by getActiveWorkspace's bootstrap on the next request).
 */
export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wsId: string = (body?.workspaceId || ctx.workspace.id).toString();

  const supabase = createClient();
  // delete_workspace RPC enforces owner check via auth.uid() — but verify
  // upfront so we return a cleaner 403 instead of a generic 500.
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", wsId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "only_owner" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("delete_workspace", {
    ws_id: wsId,
  });
  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Run sql/wallet_delete.sql in Supabase first." },
      { status: 500 }
    );
  }
  if (data !== true) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
