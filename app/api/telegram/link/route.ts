import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

// POST — generate a 6-digit code for the user, scoped to the currently active wallet.
// When the user types `/link 123456` to the bot, the bot will route future
// transactions to THIS wallet.
export async function POST() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const srv = createServiceClient();

  // Clean up expired / old codes for this user
  await srv.from("telegram_link_codes").delete().eq("user_id", ctx.user.id);

  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  const { error } = await srv.from("telegram_link_codes").insert({
    code,
    user_id: ctx.user.id,
    workspace_id: ctx.workspace.id,
    expires_at: expires.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, code, expires_at: expires.toISOString() });
}

// GET — current link status, including which wallet the bot routes to.
export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const srv = createServiceClient();

  const { data: link } = await srv
    .from("telegram_links")
    .select("chat_id, username, linked_at, active_workspace_id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  let activeWorkspaceName: string | null = null;
  if (link?.active_workspace_id) {
    const { data: ws } = await srv
      .from("workspaces")
      .select("name")
      .eq("id", link.active_workspace_id)
      .maybeSingle();
    activeWorkspaceName = ws?.name || null;
  }

  return NextResponse.json({
    linked: !!link,
    chat_id: link?.chat_id || null,
    username: link?.username || null,
    linked_at: link?.linked_at || null,
    active_workspace_id: link?.active_workspace_id || null,
    active_workspace_name: activeWorkspaceName,
    current_workspace_id: ctx.workspace.id,
    current_workspace_name: ctx.workspace.name,
    is_linked_to_current: link?.active_workspace_id === ctx.workspace.id,
    bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
  });
}

// PATCH — switch the bot's active wallet to the currently active one in the app.
export async function PATCH() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const srv = createServiceClient();
  const { error } = await srv
    .from("telegram_links")
    .update({ active_workspace_id: ctx.workspace.id })
    .eq("user_id", ctx.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — unlink
export async function DELETE() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const srv = createServiceClient();
  await srv.from("telegram_links").delete().eq("user_id", ctx.user.id);
  return NextResponse.json({ ok: true });
}
