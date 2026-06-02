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
  return `You are a personal-finance AI advisor for the wallet "${wsName}".
The user wants insights for the LAST 6 WEEKS of their transactions.

Return ONLY a single JSON object (no markdown, no commentary) in this schema:
{
  "summary": "1-2 sentence executive summary",
  "cards": [
    {
      "icon": "💸" | "💰" | "📊" | "⚠️" | "✅" | "🎯" | "🍔" | "🚗" | "📈" | "📉",
      "title": "string (short bold title)",
      "value": "string (the headline number/fact)",
      "body": "string (1-2 sentence explanation)",
      "recommendation": "string (concrete action to take)",
      "tone": "positive" | "warning" | "info"
    }
  ]
}

REQUIRED CARDS (aim for 5-7 cards total):
1. Top spending category — what category dominates and by how much
2. Spending trend — is this week up or down vs the average of the prior 5 weeks (give %)
3. Top merchant — single merchant the user spends most at
4. Savings rate / net flow — income vs expense, surplus or deficit
5. Unusual pattern — any single transaction or category that's surprisingly large
6. Recommendation — concrete savings tip personalized to their data
7. Optional: an "achievement" card if income > expense or if they've reduced a category

LANGUAGE: Write ALL "title", "value", "body", "recommendation", "summary" fields in <b>${LANG_LABEL[language] || "English"}</b>.
- For Burmese, write naturally in Myanmar Unicode mixed with English numbers/terms where natural.
- For Thai, write in Thai script with comma-separated numbers.
- For English, casual but informative.

CURRENCY: Default is ${defaultCurrency}. Round large numbers (e.g. 2,540 not 2540.00). Mix currencies if user has multiple.

Be specific to the data — don't write generic platitudes. Cite real category/merchant names from the data.`;
}

async function callGemini(prompt: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured (GEMINI_API_KEY)");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // gemini-2.5-flash = latest free-tier model with best price/quality
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
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
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a personal-finance AI. Respond ONLY with a single valid JSON object matching the requested schema. No markdown fences, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
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
