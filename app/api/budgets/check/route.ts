import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

// POST — recompute budget usage for the active workspace. If any budget is at
// >=80% (warn) or >=100% (over), create an in-app notification for the user
// (only once per threshold per month, dedup via title).
export async function POST() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data: status, error } = await supabase.rpc("budget_status", {
    ws_id: ctx.workspace.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alerts: any[] = [];
  const srv = createServiceClient();
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

  for (const b of (status ?? []) as any[]) {
    const pct = Number(b.pct || 0);
    if (pct < 80) continue;
    const level = pct >= 100 ? "over" : "warn";
    const title =
      level === "over"
        ? `Budget exceeded: ${b.category_name} (${monthKey})`
        : `Budget at ${Math.round(pct)}%: ${b.category_name} (${monthKey})`;

    // Dedup — skip if same title already exists this month
    const { data: existing } = await srv
      .from("notifications")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("title", title)
      .limit(1);
    if (existing && existing.length) continue;

    await srv.from("notifications").insert({
      user_id: ctx.user.id,
      workspace_id: ctx.workspace.id,
      kind: "budget",
      title,
      body: `${b.spent} / ${b.amount} ${b.currency} spent so far.`,
      link: "/settings/budgets",
    });
    alerts.push({ category: b.category_name, pct, level });
  }

  return NextResponse.json({ ok: true, alerts });
}
