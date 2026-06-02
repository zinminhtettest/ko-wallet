import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  // Calculate progress: sum of income - sum of expenses since goal creation (per currency)
  // For simplicity, progress = net (income − expense) in the goal's currency since created_at
  const goalsWithProgress = await Promise.all(
    (goals ?? []).map(async (g: any) => {
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, kind")
        .eq("workspace_id", ctx.workspace.id)
        .eq("currency", g.currency)
        .gte("occurred_at", g.created_at);
      let net = 0;
      for (const t of (txs ?? []) as any[]) {
        if (t.kind === "income") net += Number(t.amount);
        else net -= Number(t.amount);
      }
      const progress = Math.max(0, net);
      const pct = g.target_amount > 0
        ? Math.min(100, Math.round((progress / Number(g.target_amount)) * 100))
        : 0;
      return { ...g, progress, pct };
    })
  );

  return NextResponse.json({ goals: goalsWithProgress });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, target_amount, currency, deadline } = await request.json();
  if (!name || !target_amount || !currency) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const supabase = createClient();
  const { error } = await supabase.from("savings_goals").insert({
    workspace_id: ctx.workspace.id,
    name,
    target_amount: Number(target_amount),
    currency,
    deadline: deadline || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
