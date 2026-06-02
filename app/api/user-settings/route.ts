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
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      base_currency: body.base_currency || "THB",
      rate_thb_to_mmk: Number(body.rate_thb_to_mmk) || 130,
      rate_thb_to_usd: Number(body.rate_thb_to_usd) || 0.028,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
