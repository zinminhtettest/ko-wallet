import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Try Gemini first for a JSON-mode text completion. If Gemini fails (quota,
 * rate limit, network error) AND DeepSeek key is available, fall back to
 * DeepSeek. Returns parsed JSON or null on total failure.
 *
 * Use only for TEXT-IN prompts. Image/audio inputs must use Gemini directly
 * (DeepSeek's chat model doesn't accept multimodal input).
 */
export async function parseJsonText(prompt: string): Promise<any | null> {
  let geminiErr: string | null = null;

  // 1. Gemini (primary)
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (e: any) {
      geminiErr = String(e?.message || e);
      console.error("[ai-text] gemini failed:", geminiErr);
    }
  }

  // 2. DeepSeek (fallback)
  if (process.env.DEEPSEEK_API_KEY) {
    try {
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
                "Respond ONLY with a single valid JSON object. No markdown fences. No commentary.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(
          "[ai-text] deepseek failed:",
          res.status,
          t.slice(0, 200)
        );
        return null;
      }
      const j = await res.json();
      const content = j?.choices?.[0]?.message?.content;
      if (!content) return null;
      return JSON.parse(content);
    } catch (e: any) {
      console.error("[ai-text] deepseek error:", e?.message);
    }
  }

  if (geminiErr) console.error("[ai-text] both providers failed. gemini:", geminiErr);
  return null;
}
