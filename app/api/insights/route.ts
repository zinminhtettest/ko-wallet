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
  return `You are a careful personal-finance AI advisor for the wallet "${wsName}".
The user wants ACCURATE insights for the LAST 6 WEEKS of their transactions.

═══ ACCURACY REQUIREMENTS (CRITICAL) ═══
1. Before writing anything, compute these totals from the raw data:
   - total_income (sum of all kind="income")
   - total_expense (sum of all kind="expense")
   - net = total_income − total_expense
   - per-category expense sums (group by "cat")
   - per-merchant expense sums (group by "m")
2. Every number you mention MUST match these computed totals exactly.
3. Do NOT invent transactions, categories, or merchants that aren't in the data.
4. Round to whole currency units; never invent decimals.

═══ ESSENTIAL vs WASTE CLASSIFICATION ═══
Classify EVERY expense as one of:
- "essential" (လိုအပ်တာ): food groceries, rent, bills, transport-to-work, healthcare, education, basic utilities
- "discretionary" (လိုလားတာ): dining out moderately, hobbies, modest entertainment, gifts
- "waste" (အဖြုန်း): excessive dining/coffee, impulse shopping, unused subscriptions, splurges, anything the user is unlikely to repeat or value

Then compute:
- essential_total, discretionary_total, waste_total (sums in ${defaultCurrency})
- waste_pct = waste_total / total_expense × 100

═══ OUTPUT (ONLY this JSON, no markdown) ═══
{
  "summary": "1-2 sentence honest assessment with the exact net figure",
  "cards": [
    {
      "icon": "💸" | "💰" | "📊" | "⚠️" | "✅" | "🎯" | "🍔" | "🚗" | "📈" | "📉" | "🛒" | "🏠",
      "title": "string",
      "value": "string with the exact number",
      "body": "1-2 sentence explanation citing real categories/merchants from the data",
      "recommendation": "concrete action with an estimated saving in ${defaultCurrency}",
      "tone": "positive" | "warning" | "info"
    }
  ]
}

═══ REQUIRED CARDS (6–8 cards total, in this order) ═══
1. Net flow — income vs expense, surplus or deficit (exact ${defaultCurrency} figures)
2. Essential vs Waste split — show essential_total, discretionary_total, waste_total, and waste_pct%
3. Top spending category — name + amount + % of total_expense
4. Top merchant — name + how many visits + total spent
5. Biggest waste item — single category or merchant flagged as wasteful, with why
6. Trend — last 1 week vs avg of prior 5 weeks (% change), is it improving or worsening
7. Recommendation — ONE specific, actionable change with estimated monthly saving
8. Optional Achievement (only if income > expense OR waste_pct < 15%)

═══ LANGUAGE ═══
Write ALL string fields in <b>${LANG_LABEL[language] || "English"}</b>.
- Burmese: Myanmar Unicode, mix English for numbers/categories where natural.
- Thai: Thai script, comma-separated numbers.
- English: casual but precise.

CURRENCY: Default ${defaultCurrency}. Use comma separators (e.g. 2,540). If multiple currencies appear, report each separately — do NOT mix them in one total.

Be specific. Cite real names. No platitudes. Numbers MUST match the data.`;
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

async function callDeepSeek(prompt: string) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key not configured (DEEPSEEK_API_KEY)");
  }
  // deepseek-chat = current production model (DeepSeek-V3.x family, mapped as user's "V4 pro" alias)
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [
        {
          role: "system",
          content:
            "You are a careful personal-finance AI. Always compute totals from the raw data first, then write. Respond ONLY with a single valid JSON object matching the requested schema. Every number must match the data exactly. No markdown fences, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned empty response");
  return JSON.parse(content);
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

  // Compact rows for the prompt (limit to 500 records)
  const compact = list.slice(0, 500).map((t) => ({
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
  )}\n\nTransactions JSON (last 6 weeks):\n${JSON.stringify(compact)}`;

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
