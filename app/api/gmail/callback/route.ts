import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { exchangeCode, gmailClient } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(new URL("/settings/gmail?error=" + encodeURIComponent(err), request.url));
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/settings/gmail?error=missing_code", request.url));
  }

  let state: { ws: string; u: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"));
  } catch {
    return NextResponse.redirect(new URL("/settings/gmail?error=bad_state", request.url));
  }

  // Verify user
  const ctx = await getActiveWorkspace();
  if (!ctx || ctx.user.id !== state.u || ctx.workspace.id !== state.ws) {
    return NextResponse.redirect(new URL("/settings/gmail?error=unauthorized", request.url));
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      // refresh_token only returned on first consent — force re-prompt if missing
      return NextResponse.redirect(
        new URL("/settings/gmail?error=no_refresh_token&hint=revoke_and_reconnect", request.url)
      );
    }

    // Get email of connected Gmail account
    const { gmail } = gmailClient(tokens.access_token, tokens.refresh_token);
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress || "unknown";

    const expires_at = new Date(tokens.expiry_date || Date.now() + 3600_000).toISOString();

    const srv = createServiceClient();
    await srv.from("gmail_connections").upsert(
      {
        user_id: ctx.user.id,
        workspace_id: ctx.workspace.id,
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at,
        is_active: true,
      },
      { onConflict: "user_id,workspace_id" }
    );

    return NextResponse.redirect(new URL("/settings/gmail?connected=1", request.url));
  } catch (e: any) {
    console.error("Gmail callback error:", e);
    return NextResponse.redirect(new URL("/settings/gmail?error=" + encodeURIComponent(e.message || "unknown"), request.url));
  }
}
