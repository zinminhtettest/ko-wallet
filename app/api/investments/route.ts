import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase
    .from("investments")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  // Compute gain/loss per position
  const enriched = (data ?? []).map((p: any) => {
    const cost = Number(p.quantity) * Number(p.buy_price);
    const curPrice = p.current_price ? Number(p.current_price) : null;
    const currentValue = curPrice != null ? Number(p.quantity) * curPrice : null;
    const gainLoss = currentValue != null ? currentValue - cost : null;
    const gainLossPct =
      currentValue != null && cost > 0
        ? Math.round(((currentValue - cost) / cost) * 10000) / 100
        : null;
    return { ...p, cost, current_value: currentValue, gain_loss: gainLoss, gain_loss_pct: gainLossPct };
  });

  return NextResponse.json({ investments: enriched });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const { symbol, asset_type, quantity, buy_price, buy_currency, current_price, notes } = body;
  if (!symbol || !quantity || !buy_price || !buy_currency) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const supabase = createClient();
  const { error } = await supabase.from("investments").insert({
    workspace_id: ctx.workspace.id,
    symbol: symbol.toUpperCase(),
    asset_type: asset_type || "stock",
    quantity: Number(quantity),
    buy_price: Number(buy_price),
    buy_currency,
    current_price: current_price ? Number(current_price) : null,
    current_price_updated_at: current_price ? new Date().toISOString() : null,
    notes: notes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
