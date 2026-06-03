import { createClient } from "@/lib/supabase/server";
import { NotificationsList, type NotificationItem } from "@/components/NotificationsList";
import { getServerT } from "@/lib/user-lang";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const t = await getServerT();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("Notifications")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("Workspace activity + invites — latest 30.")}
        </p>
      </div>
      <NotificationsList initial={(data || []) as NotificationItem[]} />
    </div>
  );
}
