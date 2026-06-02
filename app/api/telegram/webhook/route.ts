import { createServiceClient } from "@/lib/supabase/server";
import { tgSendMessage } from "@/lib/telegram";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const CURRENCIES = ["THB", "MMK", "USD"];

const NL_PROMPT = `You are a personal finance bot assistant. The user sends a short message in Burmese, English, Thai, or any mix.
Determine the intent and return ONLY a single JSON object — no markdown, no commentary.

Schema:
{
  "intent": "add_transaction" | "balance" | "help" | "unknown",
  "kind": "expense" | "income" | null,
  "amount": number | null,
  "currency": "THB" | "MMK" | "USD" | null,
  "merchant": string | null,
  "category_hint": string | null,
  "note": string | null,
  "confidence": number
}

Rules:
- "expense" = money the user spent / paid / bought.
- "income" = money the user received / earned / got / was paid (salary, gift, transfer-in, refund).
- "category_hint" must be one of: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Travel, Bank Fee, Salary, Business, Gift, Other.
- Default currency is the user's wallet currency (THB unless specified). Detect "baht/บาท/฿/THB"=THB, "kyat/ကျပ်/MMK"=MMK, "dollar/$/USD"=USD.
- If the user asks how much they spent / current balance / their summary → intent=balance.
- If unclear or just chit-chat → intent=help (so the bot can show commands).
- confidence: 0..1. For transactions, require ≥ 0.6 to act.

Examples:
"250 thb coffee" → {"intent":"add_transaction","kind":"expense","amount":250,"currency":"THB","merchant":"coffee","category_hint":"Food","note":null,"confidence":0.9}
"bought lunch for 120 baht at 7-11" → {"intent":"add_transaction","kind":"expense","amount":120,"currency":"THB","merchant":"7-11","category_hint":"Food","note":"lunch","confidence":0.95}
"got salary 50000 thb" → {"intent":"add_transaction","kind":"income","amount":50000,"currency":"THB","merchant":null,"category_hint":"Salary","note":"salary","confidence":0.95}
"ထမင်းစား ၁၂၀" → {"intent":"add_transaction","kind":"expense","amount":120,"currency":"THB","merchant":null,"category_hint":"Food","note":"ထမင်းစား","confidence":0.85}
"လစာ ၅သိန်း ရတယ်" → {"intent":"add_transaction","kind":"income","amount":500000,"currency":"MMK","merchant":null,"category_hint":"Salary","note":"လစာ","confidence":0.9}
"ဒီလ ဘယ်လောက် သုံးသွားပြီလဲ" → {"intent":"balance","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.95}
"how much have I spent" → {"intent":"balance","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.95}
"hi" → {"intent":"help","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.9}
`;

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
    await sendHelp(chatId);
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
    await tgSendMessage(chatId, "✅ Linked! Try /balance, /add, /income — or just type naturally.");
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

  // Resolve user's active workspace
  const ws = await getActiveWorkspaceForUser(srv, userId);
  if (!ws) {
    await tgSendMessage(chatId, "❌ No workspace found. Open the app first.");
    return NextResponse.json({ ok: true });
  }
  const wsId: string = ws.id;
  const defaultCur: string = ws.default_currency || "THB";

  // /balance
  if (/^\/balance\b/i.test(text)) {
    await sendBalance(srv, chatId, wsId, ws.name);
    return NextResponse.json({ ok: true });
  }

  // /add and /income — share parser, just differ in kind
  const addMatch = text.match(/^\/(add|income)(?:@\w+)?\s+(\d+(?:\.\d+)?)(?:\s+(.*))?$/i);
  if (addMatch) {
    const kind: "expense" | "income" = addMatch[1].toLowerCase() === "income" ? "income" : "expense";
    const amt = parseFloat(addMatch[2]);
    const remainder = (addMatch[3] || "").trim();
    const tokens = remainder.split(/\s+/);
    let cur = defaultCur;
    let rest = remainder;
    if (tokens[0] && CURRENCIES.includes(tokens[0].toUpperCase())) {
      cur = tokens[0].toUpperCase();
      rest = tokens.slice(1).join(" ");
    }
    const { categoryId, merchant, note } = await resolveCategoryAndMerchant(
      srv,
      wsId,
      kind,
      rest
    );
    await insertTx(srv, {
      wsId,
      userId,
      amt,
      cur,
      kind,
      categoryId,
      merchant,
      note: note || "via Telegram",
    });
    await tgSendMessage(
      chatId,
      `✅ ${kind === "income" ? "Income" : "Expense"} ${amt} ${cur}${
        merchant ? ` · ${merchant}` : ""
      }`
    );
    return NextResponse.json({ ok: true });
  }

  // Anything else → try natural language with Gemini
  if (text.startsWith("/")) {
    await tgSendMessage(chatId, "Unknown command. Type /help.");
    return NextResponse.json({ ok: true });
  }

  if (!process.env.GEMINI_API_KEY) {
    await sendHelp(chatId);
    return NextResponse.json({ ok: true });
  }

  const parsed = await parseNaturalLanguage(text);
  if (!parsed) {
    await tgSendMessage(
      chatId,
      "🤔 ဘာပြောတာလဲ နားမလည်ပါ။ ဥပမာ <code>250 baht coffee</code> ဒါမှ <code>got salary 50000</code> သို့ <code>balance</code>"
    );
    return NextResponse.json({ ok: true });
  }

  if (parsed.intent === "balance") {
    await sendBalance(srv, chatId, wsId, ws.name);
    return NextResponse.json({ ok: true });
  }

  if (parsed.intent === "help" || parsed.intent === "unknown") {
    await sendHelp(chatId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.intent === "add_transaction") {
    const kind = parsed.kind === "income" ? "income" : "expense";
    const amt = Number(parsed.amount);
    if (!amt || amt <= 0 || (parsed.confidence ?? 0) < 0.6) {
      await tgSendMessage(chatId, "🤔 Amount မှန်ကန်အောင် ပြန်ပြောပါ။");
      return NextResponse.json({ ok: true });
    }
    const cur = (parsed.currency && CURRENCIES.includes(parsed.currency))
      ? parsed.currency
      : defaultCur;
    let categoryId: string | null = null;
    if (parsed.category_hint) {
      const { data: catRow } = await srv
        .from("categories")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("kind", kind)
        .ilike("name", parsed.category_hint)
        .maybeSingle();
      if (catRow) categoryId = catRow.id;
    }
    await insertTx(srv, {
      wsId,
      userId,
      amt,
      cur,
      kind,
      categoryId,
      merchant: parsed.merchant || null,
      note: parsed.note ? `${parsed.note} (via Telegram)` : "via Telegram",
    });
    const label = kind === "income" ? "Income" : "Expense";
    const tail = [parsed.merchant, parsed.category_hint].filter(Boolean).join(" · ");
    await tgSendMessage(
      chatId,
      `✅ ${label} ${amt} ${cur}${tail ? ` · ${tail}` : ""}`
    );
    return NextResponse.json({ ok: true });
  }

  await sendHelp(chatId);
  return NextResponse.json({ ok: true });
}

// ---- helpers ----

async function sendHelp(chatId: number | string) {
  await tgSendMessage(
    chatId,
    `<b>Ko Wallet Bot</b>\n` +
      `Natural language also works — just type:\n` +
      `• <i>250 baht coffee</i>\n` +
      `• <i>bought lunch for 120 at 7-11</i>\n` +
      `• <i>got salary 50000</i>\n` +
      `• <i>ထမင်းစား ၁၂၀</i>\n` +
      `• <i>ဒီလ ဘယ်လောက် သုံးပြီလဲ</i>\n\n` +
      `Slash commands:\n` +
      `<code>/balance</code> — this month's summary\n` +
      `<code>/add 250 thb food coffee</code> — quick expense\n` +
      `<code>/income 50000 mmk salary</code> — quick income\n` +
      `<code>/link 123456</code> — link account\n` +
      `<code>/unlink</code> — disconnect`
  );
}

async function getActiveWorkspaceForUser(srv: any, userId: string) {
  const { data: members } = await srv
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, default_currency, owner_id)")
    .eq("user_id", userId);
  const list = (members ?? []) as any[];
  if (!list.length) return null;
  return (list.find((m) => m.role === "owner") || list[0]).workspaces;
}

async function sendBalance(srv: any, chatId: number | string, wsId: string, wsName: string) {
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
    ([c, v]) =>
      `<b>${c}</b>: spent −${v.exp.toLocaleString()} / received +${v.inc.toLocaleString()} = net ${(
        v.inc - v.exp
      ).toLocaleString()}`
  );
  await tgSendMessage(
    chatId,
    `<b>${wsName} — ${monthStart.toISOString().slice(0, 7)}</b>\n` +
      (lines.length ? lines.join("\n") : "No transactions yet this month.")
  );
}

async function resolveCategoryAndMerchant(
  srv: any,
  wsId: string,
  kind: "expense" | "income",
  rest: string
) {
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
      .eq("kind", kind)
      .ilike("name", catGuess)
      .maybeSingle();
    if (catRow) {
      categoryId = catRow.id;
      merchant = parts.slice(1).join(" ") || null;
    } else {
      merchant = rest;
    }
  }
  return { categoryId, merchant, note };
}

async function insertTx(
  srv: any,
  args: {
    wsId: string;
    userId: string;
    amt: number;
    cur: string;
    kind: "expense" | "income";
    categoryId: string | null;
    merchant: string | null;
    note: string | null;
  }
) {
  return srv.from("transactions").insert({
    workspace_id: args.wsId,
    user_id: args.userId,
    amount: args.amt,
    currency: args.cur,
    kind: args.kind,
    category_id: args.categoryId,
    merchant: args.merchant,
    note: args.note,
    occurred_at: new Date().toISOString(),
    source: "manual",
  });
}

async function parseNaturalLanguage(text: string): Promise<any | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    const result = await model.generateContent(`${NL_PROMPT}\n\nUser message: """${text.slice(0, 600)}"""`);
    const out = result.response.text();
    return JSON.parse(out);
  } catch (e: any) {
    console.error("[telegram] NL parse failed:", e?.message);
    return null;
  }
}
