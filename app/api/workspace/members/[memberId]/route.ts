import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

// DELETE /api/workspace/members/[memberId]
// memberId is the workspace_members.id (not user_id).
// Only owners can remove members; owners cannot remove themselves.
export async function DELETE(_: Request, { params }: { params: { memberId: string } }) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "only_owner" }, { status: 403 });
  }

  const srv = createServiceClient();
  const { data: row } = await srv
    .from("workspace_members")
    .select("id, user_id, workspace_id, role")
    .eq("id", params.memberId)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "wrong_workspace" }, { status: 400 });
  }
  if (row.user_id === ctx.user.id) {
    return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 });
  }
  if (row.role === "owner") {
    return NextResponse.json({ error: "cannot_remove_owner" }, { status: 400 });
  }

  const { error } = await srv
    .from("workspace_members")
    .delete()
    .eq("id", params.memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the removed user
  try {
    await srv.from("notifications").insert({
      user_id: row.user_id,
      workspace_id: row.workspace_id,
      kind: "system",
      title: `Removed from ${ctx.workspace.name}`,
      body: "The wallet owner removed you from this shared wallet.",
      link: "/dashboard",
    });
    const { pushToTelegram } = await import("@/lib/telegram-push");
    await pushToTelegram(
      row.user_id,
      `⚠️ You were removed from <b>${ctx.workspace.name}</b>.`
    );
  } catch {}

  return NextResponse.json({ ok: true });
}
