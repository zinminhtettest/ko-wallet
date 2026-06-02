import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Vercel Cron entrypoint — runs daily.
// 1) Imports Krungthai (and other) bank emails for connected users.
// 2) Materializes due recurring transactions.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const ok = auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  // 1) Bank email import
  let bankResult: any = null;
  try {
    const r = await fetch(`${appUrl}/api/import-krungthai`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET!,
      },
      body: JSON.stringify({ days: 2 }),
    });
    bankResult = await r.json();
  } catch (e: any) {
    bankResult = { error: e?.message || "bank_import_failed" };
  }

  // 2) Recurring transactions
  const recurring = await processRecurring();

  return NextResponse.json({ bank: bankResult, recurring });
}

async function processRecurring() {
  const srv = createServiceClient();
  const now = new Date();
  const { data: rules, error } = await srv
    .from("recurring_rules")
    .select("*")
    .eq("active", true)
    .lte("next_run_at", now.toISOString())
    .limit(500);
  if (error) return { error: error.message };
  if (!rules || rules.length === 0) return { processed: 0 };

  let processed = 0;
  for (const r of rules as any[]) {
    // Insert a transaction
    const occurred = new Date(r.next_run_at);
    const { error: txErr } = await srv.from("transactions").insert({
      workspace_id: r.workspace_id,
      user_id: r.user_id,
      amount: r.amount,
      currency: r.currency,
      kind: r.kind,
      category_id: r.category_id,
      merchant: r.merchant,
      note: r.note ? `[recurring] ${r.note}` : `[recurring] ${r.name}`,
      occurred_at: occurred.toISOString(),
      source: "recurring",
      created_by_name: `Recurring: ${r.name}`,
    });
    if (txErr) continue;

    // Advance next_run_at
    const next = advance(occurred, r.frequency);
    await srv
      .from("recurring_rules")
      .update({ next_run_at: next.toISOString() })
      .eq("id", r.id);
    processed += 1;
  }
  return { processed };
}

function advance(from: Date, frequency: string): Date {
  const d = new Date(from);
  if (frequency === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
