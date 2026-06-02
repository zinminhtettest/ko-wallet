import { GoogleGenerativeAI } from "@google/generative-ai";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const PROMPT = `You extract receipt / bill data from photos and return ONLY a JSON object.
Schema:
{
  "amount": number,                          // total paid, no currency symbol
  "currency": "THB" | "MMK" | "USD",         // infer from symbol or country context
  "merchant": string|null,                   // merchant name
  "occurred_at": "YYYY-MM-DDTHH:mm:ss"|null, // receipt date/time
  "category_hint": string|null,              // Food / Transport / Shopping / Bills / Health / Entertainment / Travel / Education / Gift / Other
  "items": string|null,                      // short summary of items if visible
  "confidence": number                       // 0.0-1.0
}
If image is not a receipt or unreadable, set confidence < 0.3 and fields to null.
Thai dates may be DD/MM/YYYY. Burmese receipts use MMK. Strip currency symbols from amount.`;

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no_gemini_key" }, { status: 500 });

  const form = await request.formData();
  const file = form.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "no_image" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "image_too_large" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mimeType = file.type || "image/jpeg";

  const genAI = new GoogleGenerativeAI(apiKey);
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
    const text = result.response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "parse_failed", raw: text }, { status: 500 });
    }
    return NextResponse.json({ ok: true, parsed });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "gemini_failed" },
      { status: 500 }
    );
  }
}
