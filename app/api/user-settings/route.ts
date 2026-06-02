import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    base_currency: data?.base_currency || "THB",
    rate_thb_to_mmk: Number(data?.rate_thb_to_mmk ?? 130),
    rate_thb_to_usd: Number(data?.rate_thb_to_usd ?? 0.028),
    ui_language: data?.ui_language || "en",
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();

  // Build patch with only the keys provided so other settings stay intact
  const upd: any = { user_id: user.id, updated_at: new Date().toISOString() };
  if (body.base_currency) upd.base_currency = body.base_currency;
  if (body.rate_thb_to_mmk != null) upd.rate_thb_to_mmk = Number(body.rate_thb_to_mmk);
  if (body.rate_thb_to_usd != null) upd.rate_thb_to_usd = Number(body.rate_thb_to_usd);
  if (body.ui_language && ["en", "my", "th"].includes(body.ui_language)) {
    upd.ui_language = body.ui_language;
  }
  // For an upsert without specifying defaults, fill them when row doesn't exist:
  if (!upd.base_currency) upd.base_currency = "THB";
  if (upd.rate_thb_to_mmk == null) upd.rate_thb_to_mmk = 130;
  if (upd.rate_thb_to_usd == null) upd.rate_thb_to_usd = 0.028;
  const { error } = await supabase.from("user_settings").upsert(upd, {
    onConflict: "user_id",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
