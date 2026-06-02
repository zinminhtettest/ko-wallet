// Lightweight Telegram Bot API client.
// Reads TELEGRAM_BOT_TOKEN from env. No external dependency.

const BASE = "https://api.telegram.org";

export function tgEnabled() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function tgCall(method: string, payload: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "no_token" };
  const r = await fetch(`${BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export async function tgSendMessage(chat_id: number | string, text: string) {
  return tgCall("sendMessage", { chat_id, text, parse_mode: "HTML" });
}
