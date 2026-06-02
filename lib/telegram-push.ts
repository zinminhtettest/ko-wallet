import { createServiceClient } from "@/lib/supabase/server";
import { tgSendMessage } from "@/lib/telegram";

/**
 * If the user has linked a Telegram chat, send them a push message.
 * Silently no-ops when not linked or when the bot isn't configured.
 */
export async function pushToTelegram(userId: string, html: string) {
  try {
    const srv = createServiceClient();
    const { data } = await srv
      .from("telegram_links")
      .select("chat_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data?.chat_id) return false;
    await tgSendMessage(data.chat_id, html);
    return true;
  } catch (e: any) {
    console.error("[tg-push] failed:", e?.message);
    return false;
  }
}
