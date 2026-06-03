import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { intendedFireUtc, sendDigestForUser } from "@/lib/digest";

// Triggered hourly by GitHub Actions. Resilient to schedule skips:
// we fire a digest if the most recent intended fire time has already passed
// AND we haven't sent for that window yet (tracked via digest_prefs.last_sent_at).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const srv = createServiceClient();

  const { data: prefs } = await srv
    .from("digest_prefs")
    .select("user_id, frequency, hour_local, day_of_week, tz_offset_minutes, last_sent_at")
    .neq("frequency", "off");
  if (!prefs?.length) return NextResponse.json({ sent: 0, message: "no users" });

  const now = new Date();
  let sent = 0;
  const skipped: string[] = [];

  for (const p of prefs as any[]) {
    const intended = intendedFireUtc({
      frequency: p.frequency,
      hour_local: p.hour_local,
      day_of_week: p.day_of_week,
      tz_offset_minutes: p.tz_offset_minutes,
      now,
    });
    if (!intended) continue;

    // Skip if intended fire time is in the future (config saved for later today/week).
    if (intended.getTime() > now.getTime()) {
      skipped.push(`user ${p.user_id}: not due yet (next ${intended.toISOString()})`);
      continue;
    }

    // Skip if we've already sent for this window.
    if (p.last_sent_at && new Date(p.last_sent_at).getTime() >= intended.getTime()) {
      skipped.push(`user ${p.user_id}: already sent at ${p.last_sent_at}`);
      continue;
    }

    const res = await sendDigestForUser({
      user_id: p.user_id,
      frequency: p.frequency,
    });

    if (!res.ok) {
      skipped.push(`user ${p.user_id}: ${res.reason}`);
      continue;
    }

    await srv
      .from("digest_prefs")
      .update({ last_sent_at: now.toISOString() })
      .eq("user_id", p.user_id);
    sent += 1;
  }

  return NextResponse.json({ sent, skipped });
}
