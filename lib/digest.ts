import { createServiceClient } from "@/lib/supabase/server";
import { tgSendMessage } from "@/lib/telegram";

type Frequency = "off" | "daily" | "weekly";

/**
 * Compute the most recent intended fire time for a user's digest, in UTC.
 * Returns null if `off`. This is the time at which the digest SHOULD fire
 * for the current calendar day (daily) or current weekday (weekly), in the
 * user's local timezone, converted back to UTC.
 */
export function intendedFireUtc(opts: {
  frequency: Frequency;
  hour_local: number;
  day_of_week: number; // 0=Sun..6=Sat
  tz_offset_minutes: number;
  now?: Date;
}): Date | null {
  if (opts.frequency === "off") return null;
  const now = opts.now ?? new Date();
  const nowUtcMs = now.getTime();

  // Convert "now" to user-local Date
  const localMs = nowUtcMs + opts.tz_offset_minutes * 60 * 1000;
  const local = new Date(localMs);
  const localY = local.getUTCFullYear();
  const localM = local.getUTCMonth();
  const localD = local.getUTCDate();
  const localDay = local.getUTCDay();

  // For daily: today at hour_local in local TZ.
  // For weekly: most recent occurrence of day_of_week at hour_local in local TZ.
  let targetLocal = new Date(
    Date.UTC(localY, localM, localD, opts.hour_local, 0, 0)
  );
  if (opts.frequency === "weekly") {
    // Days to subtract to reach last day_of_week (could be today).
    const diff = (localDay - opts.day_of_week + 7) % 7;
    targetLocal = new Date(
      Date.UTC(localY, localM, localD - diff, opts.hour_local, 0, 0)
    );
  }

  // Convert that local time back to real UTC by subtracting the TZ offset.
  return new Date(targetLocal.getTime() - opts.tz_offset_minutes * 60 * 1000);
}

/**
 * Build the digest message body for a single user and send it via Telegram.
 * Returns the message that was sent (or about to be sent).
 */
export async function sendDigestForUser(opts: {
  user_id: string;
  frequency: "daily" | "weekly";
}): Promise<{ ok: boolean; reason?: string; message?: string }> {
  const srv = createServiceClient();
  const now = new Date();

  // Telegram link
  const { data: link } = await srv
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", opts.user_id)
    .maybeSingle();
  if (!link?.chat_id) return { ok: false, reason: "no telegram link" };

  // Workspaces the user can see
  const { data: memberships } = await srv
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name)")
    .eq("user_id", opts.user_id);
  const wsList = ((memberships ?? []) as any[])
    .map((m) => m.workspaces)
    .filter((w) => w);
  if (!wsList.length) return { ok: false, reason: "no workspaces" };

  // Range
  const since = new Date(now);
  if (opts.frequency === "weekly") since.setUTCDate(since.getUTCDate() - 7);
  else since.setUTCDate(since.getUTCDate() - 1);

  const wsIds = wsList.map((w: any) => w.id);
  const { data: txs } = await srv
    .from("transactions")
    .select("workspace_id, amount, currency, kind, category:categories(name)")
    .in("workspace_id", wsIds)
    .gte("occurred_at", since.toISOString());

  // Aggregate
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

  const isWeekly = opts.frequency === "weekly";
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
  if (lines.length <= 1) lines.push("No transactions in this period.");

  const message = lines.join("\n");
  try {
    await tgSendMessage(link.chat_id, message);
    return { ok: true, message };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "telegram send failed" };
  }
}
