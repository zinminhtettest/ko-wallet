import { NextResponse } from "next/server";

// Lightweight liveness probe used by Docker healthcheck + UptimeRobot.
// Intentionally does NOT touch Supabase — if the DB is down we still want
// the container to stay up so Caddy serves the cached static assets.
export const runtime = "edge";

export async function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
