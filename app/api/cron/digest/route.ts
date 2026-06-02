import { createServiceClient } from "@/lib/supabase/server";
import { tgSendMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

// Triggered hourly by GitHub Actions. Sends a digest to every linked-Telegram
// user whose digest_prefs match the current hour-of-day (and, for weekly,
// day-of-week) in their local timezone.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const srv = createServiceClient();

  // Find users with active digest + Telegram link
  const { data: prefs } = await srv
    .from("digest_prefs")
    .select("user_id, frequency, hour_local, day_of_week, tz_offset_minutes")
    .neq("frequency", "off");
  if (!prefs?.length) return NextResponse.json({ sent: 0, message: "no users" });

  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  let sent = 0;
  const skipped: string[] = [];
  for (const p of prefs as any[]) {
    // User's local time
    const localMinutes = (utcMinutes + p.tz_offset_minutes + 24 * 60) % (24 * 60);
    const localHour = Math.floor(localMinutes / 60);
    if (localHour !== p.hour_local) {
      skipped.push(`user ${p.user_id}: hour mismatch (local ${localHour} vs ${p.hour_local})`);
      continue;
    }
    if (p.frequency === "weekly") {
      const utcDay = now.getUTCDay();
      const offsetDays =
        utcMinutes + p.tz_offset_minutes >= 24 * 60
          ? 1
          : utcMinutes + p.tz_offset_minutes < 0
          ? -1
          : 0;
      const localDay = (utcDay + offsetDays + 7) % 7;
      if (localDay !== p.day_of_week) {
        skipped.push(`user ${p.user_id}: day mismatch`);
        continue;
      }
    }

    // Find Telegram link + workspaces this user is a member of
    const { data: link } = await srv
      .from("telegram_links")
      .select("chat_id, active_workspace_id")
      .eq("user_id", p.user_id)
      .maybeSingle();
    if (!link?.chat_id) continue;

    // Compute summary range
    const isWeekly = p.frequency === "weekly";
    const since = new Date(now);
    if (isWeekly) since.setUTCDate(since.getUTCDate() - 7);
    else since.setUTCDate(since.getUTCDate() - 1);

    // Get all transactions across user's workspaces in range
    const { data: memberships } = await srv
      .from("workspace_members")
      .select("workspace_id, workspaces(id, name)")
      .eq("user_id", p.user_id);
    const wsList = ((memberships ?? []) as any[])
      .map((m) => m.workspaces)
      .filter((w) => w);

    if (!wsList.length) continue;

    const wsIds = wsList.map((w: any) => w.id);
    const { data: txs } = await srv
      .from("transactions")
      .select("workspace_id, amount, currency, kind, category:categories(name)")
      .in("workspace_id", wsIds)
      .gte("occurred_at", since.toISOString());

    // Aggregate by workspace + currency
    const summary: Record<string, Record<string, { exp: number; inc: number }>> = {};
    const topCategoryByWs: Record<string, Record<string, number>> = {};
    for (const t of (txs ?? []) as any[]) {
      const wsKey = t.workspace_id;
      summary[wsKey] = summary[wsKey] || {};
      summary[wsKey][t.currency] = summary[wsKey][t.currency] || { exp: 0, inc: 0 };
      if (t.kind === "expense") summary[wsKey][t.currency].exp += Number(t.amount);
      else summary[wsKey][t.currency].inc += Number(t.amount);
      if (t.kind === "expense" && t.category?.name) {
        topCategoryByWs[wsKey] = topCategoryByWs[wsKey] || {};
        topCategoryByWs[wsKey][t.category.name] =
          (topCategoryByWs[wsKey][t.category.name] || 0) + Number(t.amount);
      }
    }

    // Build message
    const label = isWeekly ? "This week" : "Yesterday";
    const lines: string[] = [`📊 <b>Ko Wallet ${label}</b>\n`];
    for (const ws of wsList) {
      const wsSummary = summary[ws.id];
      if (!wsSummary || Object.keys(wsSummary).length === 0) continue;
      lines.push(`<b>${ws.name}</b>`);
      for (const [cur, v] of Object.entries(wsSummary)) {
        const net = v.inc - v.exp;
        const sign = net >= 0 ? "+" : "";
        lines.push(
          `  ${cur}: −${v.exp.toLocaleString()} / +${v.inc.toLocaleString()} = ${sign}${net.toLocaleString()}`
        );
      }
      const cats = topCategoryByWs[ws.id];
      if (cats) {
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        if (top) lines.push(`  Top: ${top[0]} (${top[1].toLocaleString()})`);
      }
      lines.push("");
    }
    if (lines.length <= 1) {
      lines.push("No transactions in this period.");
    }

    try {
      await tgSendMessage(link.chat_id, lines.join("\n"));
      sent += 1;
    } catch (e: any) {
      skipped.push(`send failed for ${p.user_id}: ${e?.message}`);
    }
  }

  return NextResponse.json({ sent, skipped });
}
