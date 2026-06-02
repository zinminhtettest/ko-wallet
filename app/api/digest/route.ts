import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase
    .from("digest_prefs")
    .select("*")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  return NextResponse.json({
    frequency: data?.frequency || "off",
    hour_local: data?.hour_local ?? 20,
    day_of_week: data?.day_of_week ?? 0,
    tz_offset_minutes: data?.tz_offset_minutes ?? 420,
  });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = createClient();
  const { error } = await supabase.from("digest_prefs").upsert(
    {
      user_id: ctx.user.id,
      frequency: body.frequency ?? "off",
      hour_local: body.hour_local ?? 20,
      day_of_week: body.day_of_week ?? 0,
      tz_offset_minutes: body.tz_offset_minutes ?? 420,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
