import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { getAuthUrl } from "@/lib/gmail";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.redirect(new URL("/login", request.url));

  // encode workspace_id + user_id + nonce as state
  const nonce = crypto.randomBytes(8).toString("hex");
  const state = Buffer.from(
    JSON.stringify({ ws: ctx.workspace.id, u: ctx.user.id, n: nonce })
  ).toString("base64url");

  const url = getAuthUrl(state);
  return NextResponse.redirect(url);
}
