import { NextResponse } from "next/server";

// Vercel Cron entrypoint — calls /api/import-krungthai with the secret header.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const ok = auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const r = await fetch(`${appUrl}/api/import-krungthai`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": process.env.CRON_SECRET!,
    },
    body: JSON.stringify({ days: 2 }),
  });
  const j = await r.json();
  return NextResponse.json(j);
}
