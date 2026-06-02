import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedTransaction {
  amount: number | null;
  currency: "THB" | "MMK" | "USD" | null;
  kind: "expense" | "income" | null;
  merchant: string | null;
  note: string | null;
  occurred_at: string | null; // ISO string
  category_hint: string | null;
  confidence: number;
}

const PROMPT = `You parse Krungthai Bank email notifications into structured JSON.
Return ONLY a JSON object with these fields (no markdown, no commentary):
{
  "amount": number,                          // positive number, no currency symbol
  "currency": "THB" | "MMK" | "USD",         // bank emails are usually THB
  "kind": "expense" | "income",              // expense = withdrawal/payment; income = deposit/transfer-in
  "merchant": string|null,                   // where the money was spent / from
  "note": string|null,                       // brief description of the transaction
  "occurred_at": "YYYY-MM-DDTHH:mm:ss",      // transaction time in ISO 8601 (no timezone)
  "category_hint": string|null,              // suggested category: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Travel, Bank Fee, Salary, Business, Gift, Other
  "confidence": number                       // 0.0-1.0, how sure you are this is a real transaction
}
If the email is NOT a transaction notification (e.g. marketing, OTP, statement summary), set confidence < 0.3 and other fields to null.
Krungthai date format is often DD/MM/YYYY HH:MM and Thai. Thai months: ม.ค.=Jan ก.พ.=Feb มี.ค.=Mar เม.ย.=Apr พ.ค.=May มิ.ย.=Jun ก.ค.=Jul ส.ค.=Aug ก.ย.=Sep ต.ค.=Oct พ.ย.=Nov ธ.ค.=Dec.
Common merchants in Thai: 7-11 = 7-Eleven, โลตัส = Lotus's, บิ๊กซี = Big C.`;

export async function parseKrungthaiEmail(emailContent: string): Promise<ParsedTransaction | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const truncated = emailContent.slice(0, 4000); // keep prompt small
  const result = await model.generateContent(`${PROMPT}\n\nEmail:\n${truncated}`);
  const text = result.response.text();

  try {
    const json = JSON.parse(text) as ParsedTransaction;
    return json;
  } catch (e) {
    console.error("Gemini JSON parse failed:", text);
    return null;
  }
}
