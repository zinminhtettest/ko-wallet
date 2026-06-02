import { createServiceClient } from "@/lib/supabase/server";
import { tgSendMessage } from "@/lib/telegram";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const CURRENCIES = ["THB", "MMK", "USD"];

const NL_PROMPT = `You are a personal finance bot for a user who code-switches in Burmese, English, Thai (any mix). Return ONLY a single JSON object — no markdown, no prose.

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

CORE RULES:
- If the message has a NUMBER (in any digit form), it is almost certainly a transaction. Default kind=expense unless income signals are clear.
- "expense" signals: spent, paid, bought, ထမင်းစား, ဝယ်, သုံး, ပေး, ပေါင်းပေး, ထည့်, ပေါင်း, ค่า, ใช้, ซื้อ, จ่าย
- "income" signals: got/received/earned/salary, ရတယ်, လစာ, ဝင်လာ, ရှင်းပေး, refund, gift, ได้, รับ, เงินเดือน
- "balance" signals: how much spent, summary, total, ဒီလ ဘယ်လောက်, ဘယ်လောက်သုံး, ပြန်ပြ, ใช้ไปเท่าไหร่
- "help" only for greetings ("hi", "hello", "မင်္ဂလာပါ") or commands list questions. Never use "help" if there is a clear number with intent.
- "unknown" only if literally nonsensical garbage. Anything with number + word should attempt add_transaction.

CURRENCY DETECTION:
- baht / บาท / ฿ / THB → THB
- kyat / ကျပ် / MMK → MMK
- dollar / $ / USD → USD
- No currency mentioned → null (caller will fill default).

NUMBER PARSING (CRITICAL):
- Burmese digits ၀၁၂၃၄၅၆၇၈၉ → 0123456789. e.g. "၁၂၀" = 120, "၂၀၀၀" = 2000, "၅သိန်း" = 500000 (သိန်း = 100000), "၁သောင်း" = 10000 (သောင်း = 10000), "ငါးထောင်" = 5000 (ထောင် = 1000).
- Thai digits ๐๑๒๓๔๕๖๗๘๙ → 0-9.
- Words: "သိန်း"=100000, "သောင်း"=10000, "ထောင်"=1000, "ရာ"=100, "หมื่น"=10000, "พัน"=1000, "ร้อย"=100.

MERCHANT / NOTE EXTRACTION:
- The non-number, non-verb text is the merchant or note.
- "7-11", "lotus", "starbucks", "grab" → merchant.
- Order can be anything: "7-11, 200" → amount=200, merchant="7-11"; "200 at 7-11" → same.
- Burmese verb-only descriptions go into note: "ထမင်းစား ၁၂၀" → note="ထမင်းစား".

CATEGORY (pick one): Food, Transport, Shopping, Bills, Health, Entertainment, Education, Travel, Bank Fee, Salary, Business, Gift, Other.
- ထမင်း/ကော်ဖီ/coffee/lunch/food/7-11/Lotus/restaurant → Food
- Grab/taxi/bus/train/transport/ဂရပ်/ပို့စရိတ်/ပို့ဆောင် → Transport
- ဈေး/ဈေးသွား/စျေးသွား/shopping/buy stuff/ဝယ်တာ → Shopping
- bill/ဖုန်းဘီး/မီးဘီး/internet → Bills
- ဆေး/ဆေးရုံ/ဆရာဝန် → Health
- ရုပ်ရှင်/Netflix → Entertainment
- စာ/စာသင် → Education
- လေယာဉ်/hotel/ခရီး → Travel

CONFIDENCE: 0..1. For transactions caller requires ≥ 0.5. Be generous: if you can extract amount + plausible context, confidence ≥ 0.7.

EXAMPLES (study carefully, especially Burmese variations):
"250 thb coffee" → {"intent":"add_transaction","kind":"expense","amount":250,"currency":"THB","merchant":"coffee","category_hint":"Food","note":null,"confidence":0.95}
"bought lunch for 120 baht at 7-11" → {"intent":"add_transaction","kind":"expense","amount":120,"currency":"THB","merchant":"7-11","category_hint":"Food","note":"lunch","confidence":0.95}
"7-11 , 200" → {"intent":"add_transaction","kind":"expense","amount":200,"currency":null,"merchant":"7-11","category_hint":"Food","note":null,"confidence":0.9}
"7-11 200" → {"intent":"add_transaction","kind":"expense","amount":200,"currency":null,"merchant":"7-11","category_hint":"Food","note":null,"confidence":0.9}
"got salary 50000 thb" → {"intent":"add_transaction","kind":"income","amount":50000,"currency":"THB","merchant":null,"category_hint":"Salary","note":"salary","confidence":0.95}
"ထမင်းစား ၁၂၀" → {"intent":"add_transaction","kind":"expense","amount":120,"currency":null,"merchant":null,"category_hint":"Food","note":"ထမင်းစား","confidence":0.9}
"စျေးသွား ၂၂၀" → {"intent":"add_transaction","kind":"expense","amount":220,"currency":null,"merchant":null,"category_hint":"Shopping","note":"စျေးသွား","confidence":0.9}
"၂၀၀၀ ပေါင်းပေး" → {"intent":"add_transaction","kind":"expense","amount":2000,"currency":null,"merchant":null,"category_hint":"Other","note":"ပေါင်းပေး","confidence":0.85}
"၂၀၀ ပေး" → {"intent":"add_transaction","kind":"expense","amount":200,"currency":null,"merchant":null,"category_hint":"Other","note":"ပေး","confidence":0.85}
"ကော်ဖီ ၈၀" → {"intent":"add_transaction","kind":"expense","amount":80,"currency":null,"merchant":"ကော်ဖီ","category_hint":"Food","note":null,"confidence":0.9}
"ဂရပ်ဘ် ၆၀" → {"intent":"add_transaction","kind":"expense","amount":60,"currency":null,"merchant":"Grab","category_hint":"Transport","note":null,"confidence":0.9}
"လစာ ၅သိန်း ရတယ်" → {"intent":"add_transaction","kind":"income","amount":500000,"currency":"MMK","merchant":null,"category_hint":"Salary","note":"လစာ","confidence":0.95}
"ဖုန်းဘီး ၃၀၀" → {"intent":"add_transaction","kind":"expense","amount":300,"currency":null,"merchant":null,"category_hint":"Bills","note":"ဖုန်းဘီး","confidence":0.9}
"ဒီလ ဘယ်လောက် သုံးသွားပြီလဲ" → {"intent":"balance","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.95}
"ဒီလ summary" → {"intent":"balance","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.9}
"how much have I spent" → {"intent":"balance","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.95}
"hi" → {"intent":"help","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.9}
"မင်္ဂလာပါ" → {"intent":"help","kind":null,"amount":null,"currency":null,"merchant":null,"category_hint":null,"note":null,"confidence":0.9}
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
      .select("user_id, workspace_id, expires_at")
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
      {
        user_id: row.user_id,
        chat_id: chatId,
        username,
        active_workspace_id: row.workspace_id,
      },
      { onConflict: "user_id" }
    );
    // Resolve the wallet name for a friendly confirmation
    let walletName = "your wallet";
    if (row.workspace_id) {
      const { data: ws } = await srv
        .from("workspaces")
        .select("name")
        .eq("id", row.workspace_id)
        .maybeSingle();
      if (ws?.name) walletName = ws.name;
    }
    await srv.from("telegram_link_codes").delete().eq("code", code);
    await tgSendMessage(
      chatId,
      `✅ Linked to <b>${walletName}</b>. All bot transactions go to this wallet.\nType /use to see/change wallet.`
    );
    return NextResponse.json({ ok: true });
  }

  // From here on, the chat must be linked
  const { data: link } = await srv
    .from("telegram_links")
    .select("user_id, active_workspace_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (!link) {
    await tgSendMessage(chatId, "⚠️ Not linked. Run /link <code> first.\nGet a code at Settings → Telegram in the app.");
    return NextResponse.json({ ok: true });
  }
  const userId = link.user_id;
  const activeWsId: string | null = link.active_workspace_id;

  // /unlink
  if (/^\/unlink\b/i.test(text)) {
    await srv.from("telegram_links").delete().eq("user_id", userId);
    await tgSendMessage(chatId, "🔌 Unlinked.");
    return NextResponse.json({ ok: true });
  }

  // /use — list wallets or switch
  const useMatch = text.match(/^\/use(?:@\w+)?(?:\s+(.+))?$/i);
  if (useMatch) {
    const allWs = await listUserWorkspaces(srv, userId);
    if (!allWs.length) {
      await tgSendMessage(chatId, "❌ No workspace found. Open the app first.");
      return NextResponse.json({ ok: true });
    }
    const arg = (useMatch[1] || "").trim();
    if (!arg) {
      const list = allWs
        .map((w: any) => `${w.id === activeWsId ? "✅" : "▫️"} ${w.name} (${w.default_currency})`)
        .join("\n");
      await tgSendMessage(
        chatId,
        `<b>Wallets</b>\n${list}\n\nSwitch with: <code>/use WalletName</code>`
      );
      return NextResponse.json({ ok: true });
    }
    const lower = arg.toLowerCase();
    const target = allWs.find((w: any) => w.name.toLowerCase() === lower) ||
      allWs.find((w: any) => w.name.toLowerCase().includes(lower));
    if (!target) {
      await tgSendMessage(chatId, `❌ No wallet matches "${arg}". Send /use to see all.`);
      return NextResponse.json({ ok: true });
    }
    await srv
      .from("telegram_links")
      .update({ active_workspace_id: target.id })
      .eq("user_id", userId);
    await tgSendMessage(chatId, `✅ Now using <b>${target.name}</b>.`);
    return NextResponse.json({ ok: true });
  }

  // Resolve workspace for transactions: use link.active_workspace_id if set & accessible
  let ws: any = null;
  if (activeWsId) {
    const allWs = await listUserWorkspaces(srv, userId);
    ws = allWs.find((w: any) => w.id === activeWsId) || null;
  }
  if (!ws) {
    ws = await getActiveWorkspaceForUser(srv, userId);
  }
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

  // Voice note → Gemini audio transcribe + parse
  const voice = msg.voice || msg.audio;
  if (voice?.file_id) {
    if (!process.env.GEMINI_API_KEY) {
      await tgSendMessage(chatId, "🎤 Voice support needs GEMINI_API_KEY.");
      return NextResponse.json({ ok: true });
    }
    const audio = await downloadTelegramFile(voice.file_id);
    if (!audio) {
      await tgSendMessage(chatId, "🎤 Voice download failed. Try again.");
      return NextResponse.json({ ok: true });
    }
    const voiceParsed = await parseAudioWithGemini(audio.base64, audio.mimeType);
    if (!voiceParsed) {
      await tgSendMessage(chatId, "🎤 Could not understand the voice. Try speaking the amount clearly, e.g. \"ထမင်းစား ၁၂၀\".");
      return NextResponse.json({ ok: true });
    }
    await handleParsedTransaction(srv, chatId, voiceParsed, {
      userId,
      wsId,
      defaultCur,
      sourceLabel: `via Telegram voice${voiceParsed.transcript ? ` · "${voiceParsed.transcript}"` : ""}`,
    });
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
    await handleParsedTransaction(srv, chatId, parsed, {
      userId,
      wsId,
      defaultCur,
      sourceLabel: "via Telegram",
    });
    return NextResponse.json({ ok: true });
  }

  await sendHelp(chatId);
  return NextResponse.json({ ok: true });
}

// Shared transaction-creation flow used by both text NL and voice NL.
async function handleParsedTransaction(
  srv: any,
  chatId: number | string,
  parsed: any,
  ctx: { userId: string; wsId: string; defaultCur: string; sourceLabel: string }
) {
  if (parsed.intent !== "add_transaction") {
    await tgSendMessage(chatId, "🤔 ဘာပြောတာလဲ နားမလည်ပါ။");
    return;
  }
  const kind = parsed.kind === "income" ? "income" : "expense";
  const amt = Number(parsed.amount);
  if (!amt || amt <= 0 || (parsed.confidence ?? 0) < 0.5) {
    await tgSendMessage(chatId, "🤔 Amount မှန်ကန်အောင် ပြန်ပြောပါ။");
    return;
  }
  const cur =
    parsed.currency && CURRENCIES.includes(parsed.currency)
      ? parsed.currency
      : ctx.defaultCur;
  let categoryId: string | null = null;
  if (parsed.category_hint) {
    const { data: catRow } = await srv
      .from("categories")
      .select("id")
      .eq("workspace_id", ctx.wsId)
      .eq("kind", kind)
      .ilike("name", parsed.category_hint)
      .maybeSingle();
    if (catRow) categoryId = catRow.id;
  }
  await insertTx(srv, {
    wsId: ctx.wsId,
    userId: ctx.userId,
    amt,
    cur,
    kind,
    categoryId,
    merchant: parsed.merchant || null,
    note: parsed.note ? `${parsed.note} (${ctx.sourceLabel})` : ctx.sourceLabel,
  });
  const label = kind === "income" ? "Income" : "Expense";
  const tail = [parsed.merchant, parsed.category_hint].filter(Boolean).join(" · ");
  await tgSendMessage(
    chatId,
    `✅ ${label} ${amt} ${cur}${tail ? ` · ${tail}` : ""}`
  );
}

// ---- helpers ----

async function sendHelp(chatId: number | string) {
  await tgSendMessage(
    chatId,
    `<b>Ko Wallet Bot</b>\n` +
      `🎤 <b>Voice notes ပါ ရတယ်</b> — ပြောရုံ "ထမင်းစား ၁၂၀"\n\n` +
      `Natural language — just type:\n` +
      `• <i>250 baht coffee</i>\n` +
      `• <i>bought lunch for 120 at 7-11</i>\n` +
      `• <i>got salary 50000</i>\n` +
      `• <i>ထမင်းစား ၁၂၀</i>\n` +
      `• <i>ဒီလ ဘယ်လောက် သုံးပြီလဲ</i>\n\n` +
      `Slash commands:\n` +
      `<code>/balance</code> — this month's summary\n` +
      `<code>/add 250 thb food coffee</code> — quick expense\n` +
      `<code>/income 50000 mmk salary</code> — quick income\n` +
      `<code>/use</code> — list wallets / <code>/use WalletName</code> switch\n` +
      `<code>/link 123456</code> — link account\n` +
      `<code>/unlink</code> — disconnect`
  );
}

async function getActiveWorkspaceForUser(srv: any, userId: string) {
  const list = await listUserWorkspaces(srv, userId);
  if (!list.length) return null;
  // Prefer owner workspaces when no explicit active is set
  return list.find((w: any) => w._role === "owner") || list[0];
}

async function listUserWorkspaces(srv: any, userId: string) {
  const { data: members } = await srv
    .from("workspace_members")
    .select("role, workspaces(id, name, default_currency, owner_id)")
    .eq("user_id", userId);
  return ((members ?? []) as any[])
    .map((m) => ({ ...m.workspaces, _role: m.role }))
    .filter((w) => w && w.id);
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

async function downloadTelegramFile(
  fileId: string
): Promise<{ base64: string; mimeType: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const meta = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`).then(
      (r) => r.json()
    );
    const filePath = meta?.result?.file_path;
    if (!filePath) return null;
    const dl = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!dl.ok) return null;
    const buf = Buffer.from(await dl.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return null; // 8MB cap
    // Telegram voice messages are OGG with Opus codec
    const lower = filePath.toLowerCase();
    let mimeType = "audio/ogg";
    if (lower.endsWith(".m4a")) mimeType = "audio/mp4";
    else if (lower.endsWith(".mp3")) mimeType = "audio/mpeg";
    else if (lower.endsWith(".wav")) mimeType = "audio/wav";
    else if (lower.endsWith(".oga") || lower.endsWith(".ogg")) mimeType = "audio/ogg";
    return { base64: buf.toString("base64"), mimeType };
  } catch (e: any) {
    console.error("[telegram] file download failed:", e?.message);
    return null;
  }
}

const AUDIO_NL_PROMPT = `${NL_PROMPT}

The input is an AUDIO clip (Burmese / English / Thai / mixed). First transcribe it, then apply the same parsing rules above.
Add a "transcript" field with the transcribed text:

{
  "intent": ...,
  "kind": ...,
  "amount": ...,
  "currency": ...,
  "merchant": ...,
  "category_hint": ...,
  "note": ...,
  "confidence": ...,
  "transcript": "verbatim transcript"
}

If unintelligible, return intent="unknown" with confidence < 0.3.`;

async function parseAudioWithGemini(
  base64: string,
  mimeType: string
): Promise<any | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    const result = await model.generateContent([
      { text: AUDIO_NL_PROMPT },
      { inlineData: { mimeType, data: base64 } },
    ]);
    const out = result.response.text();
    return JSON.parse(out);
  } catch (e: any) {
    console.error("[telegram] audio parse failed:", e?.message);
    return null;
  }
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
