import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const srv = createServiceClient();
  // Get the connection to revoke the token
  const { data: conn } = await srv
    .from("gmail_connections")
    .select("access_token, refresh_token")
    .eq("user_id", ctx.user.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (conn?.refresh_token) {
    // Revoke via Google
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${conn.refresh_token}`, { method: "POST" });
    } catch {}
  }

  await srv
    .from("gmail_connections")
    .delete()
    .eq("user_id", ctx.user.id)
    .eq("workspace_id", ctx.workspace.id);

  return NextResponse.redirect(new URL("/settings/gmail?disconnected=1", request.url), { status: 303 });
}
