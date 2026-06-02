import { createClient } from "@/lib/supabase/server";

/** Returns the user's active workspace (first one they belong to). */
export async function getActiveWorkspace() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces!inner(id, name, owner_id, default_currency, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  if (!memberships || memberships.length === 0) return null;
  const row = memberships[0] as any;
  return {
    workspace: row.workspaces,
    role: row.role as "owner" | "member",
    user,
  };
}
