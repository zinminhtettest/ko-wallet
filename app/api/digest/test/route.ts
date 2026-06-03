import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { sendDigestForUser } from "@/lib/digest";

// Manual "send test digest now" — uses the same logic as the cron but
// bypasses the scheduling window. Session-auth only.
export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Read frequency preference (or default to weekly so the user sees the full picture).
  const supabase = createClient();
  const { data } = await supabase
    .from("digest_prefs")
    .select("frequency")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  const freq = (data?.frequency as string | undefined) || "weekly";
  const effective: "daily" | "weekly" = freq === "daily" ? "daily" : "weekly";

  const res = await sendDigestForUser({
    user_id: ctx.user.id,
    frequency: effective,
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.reason || "send failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, frequency: effective });
}
