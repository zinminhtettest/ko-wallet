import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";

/**
 * DELETE /api/workspace/invites/:id
 * Owner of the active workspace can cancel a pending invite belonging to that
 * workspace. Accepted invites cannot be cancelled (the member is already in).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getActiveWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "only_owner" }, { status: 403 });
  }

  const srv = createServiceClient();

  // Verify the invite belongs to this workspace and is still pending.
  const { data: invite, error: fetchErr } = await srv
    .from("workspace_invites")
    .select("id, workspace_id, accepted")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (invite.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (invite.accepted) {
    return NextResponse.json(
      { error: "already_accepted" },
      { status: 400 }
    );
  }

  const { error: delErr } = await srv
    .from("workspace_invites")
    .delete()
    .eq("id", params.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
