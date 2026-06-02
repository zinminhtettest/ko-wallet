import { createServiceClient } from "@/lib/supabase/server";
import { tgSendMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

// Telegram webhook — secret is passed via URL path token (TELEGRAM_WEBHOOK_SECRET).
// Set webhook with:
//   curl -F "url=https://<host>/api/telegram/webhook?secret=<TELEGRAM_WEBHOOK_SECRET>" \
//     https://api.telegram.org/bot<TOKEN>/setWebhook
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json();
  const msg = update?.message || update?.edited_message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id;
  const username = msg.from?.username || msg.from?.first_name || "";
  const text: string = (msg.text || "").trim();
  if (!chatId) return NextResponse.json({ ok: true });

  const srv = createServiceClient();

  // /start or /help
  if (/^\/(start|help)\b/i.test(text)) {
    await tgSendMessage(
      chatId,
      `<b>Ko Wallet Bot</b>\n` +
        `Commands:\n` +
        `<code>/link 123456</code> — link this Telegram to your Ko Wallet account\n` +
        `<code>/balance</code> — this month's expenses\n` +
        `<code>/add 250 thb food coffee</code> — quick add expense\n` +
        `<code>/unlink</code> — disconnect`
    );
    return NextResponse.json({ ok: true });
  }

  // /link CODE
  const linkMatch = text.match(/^\/link(?:@\w+)?\s+(\d{6})\b/i);
  if (linkMatch) {
    const code = linkMatch[1];
    const { data: row } = await srv
      .from("telegram_link_codes")
      .select("user_id, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (!row) {
      await tgSendMessage(chatId, "❌ Invalid code. Generate a new one in Settings → Telegram.");
      return NextResponse.json({ ok: true });
    }
    if (new Date(row.expires_at) < new Date()) {
      await tgSendMessage(chatId, "❌ Code expired. Generate a new one.");
      await srv.from("telegram_link_codes").delete().eq("code", code);
      return NextResponse.json({ ok: true });
    }
    await srv.from("telegram_links").upsert(
      { user_id: row.user_id, chat_id: chatId, username },
      { onConflict: "user_id" }
    );
    await srv.from("telegram_link_codes").delete().eq("code", code);
    await tgSendMessage(chatId, "✅ Linked! You can now use /balance and /add.");
    return NextResponse.json({ ok: true });
  }

  // From here on, the chat must be linked
  const { data: link } = await srv
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (!link) {
    await tgSendMessage(chatId, "⚠️ Not linked. Run /link <code> first.\nGet a code at Settings → Telegram in the app.");
    return NextResponse.json({ ok: true });
  }
  const userId = link.user_id;

  // /unlink
  if (/^\/unlink\b/i.test(text)) {
    await srv.from("telegram_links").delete().eq("user_id", userId);
    await tgSendMessage(chatId, "🔌 Unlinked.");
    return NextResponse.json({ ok: true });
  }

  // Resolve user's active workspace (owner-of or member-of, prefer first owner)
  const { data: members } = await srv
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, default_currency, owner_id)")
    .eq("user_id", userId);
  const list = (members ?? []) as any[];
  if (!list.length) {
    await tgSendMessage(chatId, "❌ No workspace found. Open the app first.");
    return NextResponse.json({ ok: true });
  }
  const ws = (list.find((m) => m.role === "owner") || list[0]).workspaces;
  const wsId: string = ws.id;
  const defaultCur: string = ws.default_currency || "THB";

  // /balance
  if (/^\/balance\b/i.test(text)) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: txs } = await srv
      .from("transactions")
      .select("amount, currency, kind")
      .eq("workspace_id", wsId)
      .gte("occurred_at", monthStart.toISOString());
    const totals: Record<string, { exp: number; inc: number }> = {};
    for (const t of (txs ?? []) as any[]) {
      const c = t.currency;
      totals[c] = totals[c] || { exp: 0, inc: 0 };
      if (t.kind === "expense") totals[c].exp += Number(t.amount);
      else totals[c].inc += Number(t.amount);
    }
    const lines = Object.entries(totals).map(
      ([c, v]) => `${c}: −${v.exp.toLocaleString()} / +${v.inc.toLocaleString()}`
    );
    await tgSendMessage(
      chatId,
      `<b>${ws.name} — ${monthStart.toISOString().slice(0, 7)}</b>\n` +
        (lines.length ? lines.join("\n") : "No transactions yet this month.")
    );
    return NextResponse.json({ ok: true });
  }

  // /add AMOUNT [currency] [category] [merchant...]
  const addMatch = text.match(
    /^\/add(?:@\w+)?\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})?\s*(.*)$/i
  );
  if (addMatch) {
    const amt = parseFloat(addMatch[1]);
    const cur = (addMatch[2] || defaultCur).toUpperCase();
    const rest = (addMatch[3] || "").trim();
    let categoryId: string | null = null;
    let merchant: string | null = null;
    let note: string | null = null;

    if (rest) {
      const parts = rest.split(/\s+/);
      const catGuess = parts[0];
      const { data: catRow } = await srv
        .from("categories")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("kind", "expense")
        .ilike("name", catGuess)
        .maybeSingle();
      if (catRow) {
        categoryId = catRow.id;
        merchant = parts.slice(1).join(" ") || null;
      } else {
        merchant = rest;
      }
      note = `via Telegram`;
    }

    const { error } = await srv.from("transactions").insert({
      workspace_id: wsId,
      user_id: userId,
      amount: amt,
      currency: cur,
      kind: "expense",
      category_id: categoryId,
      merchant,
      note,
      occurred_at: new Date().toISOString(),
      source: "manual",
    });
    if (error) {
      await tgSendMessage(chatId, `❌ Save failed: ${error.message}`);
    } else {
      await tgSendMessage(
        chatId,
        `✅ Added ${amt} ${cur}${merchant ? ` · ${merchant}` : ""}`
      );
    }
    return NextResponse.json({ ok: true });
  }

  await tgSendMessage(chatId, "Unknown command. Type /help.");
  return NextResponse.json({ ok: true });
}
