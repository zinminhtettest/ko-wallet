import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { workspaceId, email } = await request.json();
  if (workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: "wrong_workspace" }, { status: 400 });
  }
  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "only_owner_can_invite" }, { status: 403 });
  }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const srv = createServiceClient();
  const { data, error } = await srv
    .from("workspace_invites")
    .insert({ workspace_id: workspaceId, email, invited_by: ctx.user.id })
    .select("token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const url = `${appUrl}/invite/${data.token}`;

  // Try to find an existing user with this email and create a notification.
  try {
    const { data: usersList } = await srv.auth.admin.listUsers();
    const match = (usersList?.users || []).find(
      (u: any) => (u.email || "").toLowerCase() === email.toLowerCase()
    );
    if (match) {
      const inviterName =
        (ctx.user.user_metadata as any)?.full_name ||
        (ctx.user.user_metadata as any)?.name ||
        ctx.user.email ||
        "Someone";
      await srv.from("notifications").insert({
        user_id: match.id,
        workspace_id: workspaceId,
        kind: "invite",
        title: `${inviterName} invited you to ${ctx.workspace.name}`,
        body: "Click to accept",
        link: `/invite/${data.token}`,
      });
    }
  } catch (e) {
    // Non-fatal — the invite link still works without an in-app notification.
    console.log("[invites] notification insert failed:", (e as any)?.message);
  }

  return NextResponse.json({ ok: true, url });
}
