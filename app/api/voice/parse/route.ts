import { GoogleGenerativeAI } from "@google/generative-ai";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const PROMPT = `You parse a short voice note in Burmese/English/Thai and return ONLY a JSON object:
{
  "kind": "expense" | "income" | null,
  "amount": number | null,
  "currency": "THB" | "MMK" | "USD" | null,
  "merchant": string | null,
  "category_hint": string | null,    // Food/Transport/Shopping/Bills/Health/Entertainment/Travel/Education/Salary/Other
  "note": string | null,
  "transcript": string,              // verbatim
  "confidence": number               // 0..1
}
Burmese digits ၀-၉ → 0-9. "သိန်း"=100000, "သောင်း"=10000, "ထောင်"=1000.
"ထမင်းစား/coffee/lunch" → Food. "Grab/taxi" → Transport. "ဈေး/shopping" → Shopping.
If unclear, set confidence < 0.3.`;

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "no_gemini_key" }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("audio") as File | null;
  if (!file) return NextResponse.json({ error: "no_audio" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mimeType = file.type || "audio/webm";

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });
  try {
    const result = await model.generateContent([
      { text: PROMPT },
      { inlineData: { mimeType, data: base64 } },
    ]);
    const parsed = JSON.parse(result.response.text());
    return NextResponse.json({ ok: true, parsed });
  } catch (e: any) {
    console.error("[voice] failed:", e?.message);
    return NextResponse.json({ error: e?.message || "ai_failed" }, { status: 500 });
  }
}
