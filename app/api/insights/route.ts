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

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "no_gemini_key" }, { status: 500 });
  }

  const { language } = await request.json();
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

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  try {
    const result = await model.generateContent(
      `${buildPrompt(lang, ctx.workspace.name, ctx.workspace.default_currency)}\n\nTransactions JSON (last 6 weeks):\n${JSON.stringify(compact)}`
    );
    const parsed = JSON.parse(result.response.text());
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error("[insights] failed:", e?.message);
    return NextResponse.json({ error: e?.message || "ai_failed" }, { status: 500 });
  }
}
