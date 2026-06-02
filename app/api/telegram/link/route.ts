import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

// POST — generate a 6-digit code for the user. They type
// `/link 123456` to the bot to link their account.
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
    expires_at: expires.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, code, expires_at: expires.toISOString() });
}

// GET — current link status
export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const srv = createServiceClient();
  const { data } = await srv
    .from("telegram_links")
    .select("chat_id, username, linked_at")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  return NextResponse.json({
    linked: !!data,
    chat_id: data?.chat_id || null,
    username: data?.username || null,
    linked_at: data?.linked_at || null,
    bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
  });
}

// DELETE — unlink
export async function DELETE() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const srv = createServiceClient();
  await srv.from("telegram_links").delete().eq("user_id", ctx.user.id);
  return NextResponse.json({ ok: true });
}
