import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const LANG_LABEL: Record<string, string> = {
  en: "English",
  my: "Burmese (Myanmar)",
  th: "Thai",
};

function buildPrompt(language: string, wsName: string, defaultCurrency: string) {
  return `You are a personal-finance advisor for the wallet "${wsName}".
The user gives you a pre-computed 6-week summary. Use the numbers EXACTLY as given.

Output ONLY JSON (no markdown):
{
  "summary": "1 sentence overall assessment with the net figure",
  "cards": [
    {
      "icon": "💸" | "💰" | "📊" | "⚠️" | "✅" | "🎯" | "🍔" | "📈" | "📉" | "🛒",
      "title": "short string",
      "value": "the headline number",
      "body": "1 sentence explanation (max 20 words)",
      "recommendation": "1 sentence concrete action with estimated saving in ${defaultCurrency} (max 20 words)",
      "tone": "positive" | "warning" | "info"
    }
  ]
}

Make 4 cards:
1. Net flow — income vs expense
2. Top category — biggest expense category + % of total
3. Top merchant — most-spent merchant + visit count
4. One recommendation — concrete action with estimated saving

Language: ALL string fields in <b>${LANG_LABEL[language] || "English"}</b>.
- Burmese: Myanmar Unicode mixed with English numbers/category names.
- Thai: Thai script, comma-separated numbers.
- English: casual but precise.

Numbers MUST match the pre-computed summary exactly. Use comma separators (e.g. 2,540 ${defaultCurrency}).`;
}

async function callGemini(prompt: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured (GEMINI_API_KEY)");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // gemini-3.1-flash-lite = current GA model, cheapest with strong quality
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// V4 Flash only — non-thinking model, direct JSON output, fast.
const DEEPSEEK_MODELS = ["deepseek-v4-flash"];

async function callDeepSeekModel(model: string, prompt: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Respond ONLY with a single valid JSON object. Compute all totals from the raw data first. No markdown fences, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${rawBody.slice(0, 300)}`);
  }
  let j: any;
  try {
    j = JSON.parse(rawBody);
  } catch {
    throw new Error(`non-JSON envelope: ${rawBody.slice(0, 300)}`);
  }
  if (j?.error) {
    const m = j.error?.message || JSON.stringify(j.error);
    throw new Error(String(m).slice(0, 300));
  }
  const content = j?.choices?.[0]?.message?.content;
  if (!content) {
    // V4 Pro and other reasoning models may spend the token budget on
    // reasoning_content and leave content empty. Treat as failure so the
    // chain tries the next model.
    const reason = j?.choices?.[0]?.message?.reasoning_content
      ? "reasoning model ran out of tokens"
      : "empty content";
    throw new Error(`${reason}`);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(
      `content not JSON: ${String(content).slice(0, 300)}`
    );
  }
}

async function callDeepSeek(prompt: string) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key not configured (DEEPSEEK_API_KEY)");
  }
  const errors: string[] = [];
  for (const model of DEEPSEEK_MODELS) {
    try {
      const out = await callDeepSeekModel(model, prompt);
      return { ...out, _model: model };
    } catch (e: any) {
      const msg = String(e?.message || e);
      errors.push(`${model}: ${msg}`);
      const isRetryable =
        /not\s*found/i.test(msg) ||
        /unknown\s*model/i.test(msg) ||
        /does\s*not\s*exist/i.test(msg) ||
        /invalid\s*model/i.test(msg) ||
        /HTTP\s*40[04]/i.test(msg) ||
        /reasoning model/i.test(msg) ||
        /empty content/i.test(msg) ||
        /timed out/i.test(msg);
      if (!isRetryable) {
        // Non-model error (balance, auth, network) — don't waste retries
        throw new Error(`DeepSeek ${model} failed: ${msg}`);
      }
      // else fall through to next model
    }
  }
  throw new Error(`All DeepSeek models failed:\n${errors.join("\n")}`);
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const language = body?.language;
  const provider: "gemini" | "deepseek" =
    body?.provider === "deepseek" ? "deepseek" : "gemini";
  const lang = ["en", "my", "th"].includes(language) ? language : "en";

  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 42); // 6 weeks

  const { data: txs } = await supabase
    .from("transactions")
    .select(
      "amount, currency, kind, occurred_at, merchant, note, category:categories(name)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: false });

  const list = (txs ?? []) as any[];
  if (list.length === 0) {
    return NextResponse.json({
      summary: "No transactions in the last 6 weeks yet.",
      cards: [
        {
          icon: "📊",
          title: "Not enough data",
          value: "0 transactions",
          body: "Add a few transactions to unlock insights.",
          recommendation: "Try /add 250 thb coffee on Telegram.",
          tone: "info",
        },
      ],
    });
  }

  // Pre-aggregate server-side so the prompt to the AI is tiny — that's the
  // single biggest factor in keeping response time under Vercel's 60s budget.
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};
  const byMerchant: Record<string, { sum: number; count: number }> = {};
  const weeklyExpense: Record<string, number> = {}; // yyyy-WW → sum
  const baseCcy = ctx.workspace.default_currency || "THB";
  for (const t of list) {
    const amt = Number(t.amount);
    if (t.currency !== baseCcy) continue; // skip cross-currency; keep it simple
    if (t.kind === "income") totalIncome += amt;
    else {
      totalExpense += amt;
      const cat = t.category?.name || "Uncategorized";
      byCategory[cat] = (byCategory[cat] || 0) + amt;
      const mk = t.merchant || t.note || "Other";
      byMerchant[mk] = byMerchant[mk] || { sum: 0, count: 0 };
      byMerchant[mk].sum += amt;
      byMerchant[mk].count += 1;
      // ISO week bucket
      const d = new Date(t.occurred_at);
      const wk = `${d.getUTCFullYear()}-W${Math.ceil(
        ((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 +
          new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getUTCDay() +
          1) /
          7
      )}`;
      weeklyExpense[wk] = (weeklyExpense[wk] || 0) + amt;
    }
  }
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, sum]) => ({ name, sum: Math.round(sum) }));
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1].sum - a[1].sum)
    .slice(0, 8)
    .map(([name, v]) => ({
      name,
      sum: Math.round(v.sum),
      count: v.count,
    }));
  const weeklyTrend = Object.entries(weeklyExpense)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-6)
    .map(([wk, sum]) => ({ wk, sum: Math.round(sum) }));
  const summary = {
    currency: baseCcy,
    income: Math.round(totalIncome),
    expense: Math.round(totalExpense),
    net: Math.round(totalIncome - totalExpense),
    tx_count: list.length,
    top_categories: topCategories,
    top_merchants: topMerchants,
    weekly_expense: weeklyTrend,
  };

  // Tiny back-compat object retained but unused for the AI prompt.
  const compact = list.slice(0, 0).map((t) => ({
    d: t.occurred_at.slice(0, 10),
    k: t.kind,
    a: Number(t.amount),
    c: t.currency,
    cat: t.category?.name || null,
    m: t.merchant || null,
    n: t.note || null,
  }));

  const prompt = `${buildPrompt(
    lang,
    ctx.workspace.name,
    ctx.workspace.default_currency
  )}\n\nPre-computed summary (USE THESE NUMBERS EXACTLY — do NOT recompute):\n${JSON.stringify(
    summary
  )}`;
  void compact;

  try {
    const parsed =
      provider === "deepseek" ? await callDeepSeek(prompt) : await callGemini(prompt);
    return NextResponse.json({ ...parsed, provider });
  } catch (e: any) {
    console.error(`[insights/${provider}] failed:`, e?.message);
    return NextResponse.json(
      { error: e?.message || "ai_failed", provider },
      { status: 500 }
    );
  }
}
