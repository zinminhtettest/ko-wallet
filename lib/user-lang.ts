import { createClient } from "@/lib/supabase/server";
import { makeT, type Lang, type T } from "@/lib/i18n";

/**
 * Reads the user's UI language from user_settings (server-side).
 * Falls back to "en" if not set.
 */
export async function getUserLang(): Promise<Lang> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "en";
    const { data } = await supabase
      .from("user_settings")
      .select("ui_language")
      .eq("user_id", user.id)
      .maybeSingle();
    const v = data?.ui_language;
    if (v === "my" || v === "th" || v === "en") return v;
    return "en";
  } catch {
    return "en";
  }
}

export async function getServerT(): Promise<T> {
  const lang = await getUserLang();
  return makeT(lang);
}
