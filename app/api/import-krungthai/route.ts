import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { gmailClient, extractText } from "@/lib/gmail";
import { parseKrungthaiEmail } from "@/lib/gemini";
import { NextResponse } from "next/server";

/**
 * POST /api/import-krungthai
 * Body (optional): { days?: number }  // how many days back to scan (default 30)
 *
 * Auth: requires logged-in workspace member (manual trigger from settings page)
 *       OR cron secret in header `x-cron-secret` for scheduled runs.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const days = Number(body.days) > 0 ? Math.min(Number(body.days), 90) : 30;

  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  let connections: any[] = [];
  const srv = createServiceClient();

  if (isCron) {
    // Cron: process all active connections
    const { data } = await srv
      .from("gmail_connections")
      .select("*")
      .eq("is_active", true);
    connections = data ?? [];
  } else {
    // Manual: only current user
    const ctx = await getActiveWorkspace();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data } = await srv
      .from("gmail_connections")
      .select("*")
      .eq("user_id", ctx.user.id)
      .eq("workspace_id", ctx.workspace.id)
      .eq("is_active", true);
    connections = data ?? [];
  }

  if (connections.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No active Gmail connections." });
  }

  const senders = (process.env.KRUNGTHAI_EMAIL_SENDERS || "ktbalert@ktb.co.th,kma@ktbnetbank.com,no-reply@ktb.co.th")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const results: any[] = [];

  for (const conn of connections) {
    try {
      const { gmail, oauth2Client } = gmailClient(conn.access_token, conn.refresh_token);

      // Refresh token if needed
      const expiresAt = new Date(conn.expires_at).getTime();
      if (expiresAt - Date.now() < 60_000) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (credentials.access_token) {
          await srv
            .from("gmail_connections")
            .update({
              access_token: credentials.access_token,
              expires_at: new Date(credentials.expiry_date || Date.now() + 3600_000).toISOString(),
            })
            .eq("id", conn.id);
        }
      }

      // Build search query
      const fromQuery = senders.map((s) => `from:${s}`).join(" OR ");
      const afterDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10).replace(/-/g, "/");
      const q = `(${fromQuery}) after:${afterDate}`;

      const list = await gmail.users.messages.list({ userId: "me", q, maxResults: 100 });
      const msgs = list.data.messages ?? [];

      for (const m of msgs) {
        if (!m.id) continue;

        // Dedup: skip if already imported
        const { data: existing } = await srv
          .from("transactions")
          .select("id")
          .eq("workspace_id", conn.workspace_id)
          .eq("source_ref", m.id)
          .maybeSingle();
        if (existing) { totalSkipped++; continue; }

        // Fetch full message
        const full = await gmail.users.messages.get({ userId: "me", id: m.id, format: "full" });
        const text = extractText(full.data.payload);
        if (!text) { totalSkipped++; continue; }

        // Parse with Gemini
        const parsed = await parseKrungthaiEmail(text);
        if (!parsed || parsed.confidence < 0.5 || !parsed.amount || !parsed.kind) {
          totalSkipped++; continue;
        }

        // Find matching category by hint
        let category_id: string | null = null;
        if (parsed.category_hint) {
          const { data: cat } = await srv
            .from("categories")
            .select("id")
            .eq("workspace_id", conn.workspace_id)
            .eq("kind", parsed.kind)
            .ilike("name", parsed.category_hint)
            .maybeSingle();
          category_id = cat?.id ?? null;
        }
        if (!category_id) {
          // fallback to "Other" / "Other Income"
          const fbName = parsed.kind === "income" ? "Other Income" : "Other";
          const { data: cat } = await srv
            .from("categories")
            .select("id")
            .eq("workspace_id", conn.workspace_id)
            .eq("name", fbName)
            .maybeSingle();
          category_id = cat?.id ?? null;
        }

        const { error: insertErr } = await srv.from("transactions").insert({
          workspace_id: conn.workspace_id,
          user_id: conn.user_id,
          category_id,
          amount: parsed.amount,
          currency: parsed.currency || "THB",
          kind: parsed.kind,
          merchant: parsed.merchant,
          note: parsed.note,
          occurred_at: parsed.occurred_at || new Date().toISOString(),
          source: "krungthai_email",
          source_ref: m.id,
          raw_email: text.slice(0, 2000),
        });

        if (insertErr) {
          totalErrors++;
          console.error("Insert error:", insertErr);
        } else {
          totalAdded++;
        }
      }

      await srv
        .from("gmail_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", conn.id);

      results.push({ email: conn.email, scanned: msgs.length });
    } catch (e: any) {
      console.error("Sync error for", conn.email, e);
      totalErrors++;
      results.push({ email: conn.email, error: e.message });
    }
  }

  return NextResponse.json({
    ok: true,
    added: totalAdded,
    skipped: totalSkipped,
    errors: totalErrors,
    results,
  });
}
