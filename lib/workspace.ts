import { createClient } from "@/lib/supabase/server";

/**
 * Returns the user's active workspace. Uses database RPC functions
 * (which run with security definer) so we don't need to rely on
 * RLS or service-role from the application layer.
 */
export async function getActiveWorkspace() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1) Try to find existing workspace id via RPC (bypasses RLS).
  let { data: wsId, error: rpcErr } = await supabase.rpc(
    "get_my_workspace_id"
  );

  // 2) If none, bootstrap via RPC.
  if (!wsId) {
    const displayName =
      (user.user_metadata as any)?.full_name ||
      (user.user_metadata as any)?.name ||
      user.email ||
      "My";
    const { data: createdId, error: bsErr } = await supabase.rpc(
      "bootstrap_my_workspace",
      { display_name: displayName }
    );
    if (bsErr) {
      console.error("bootstrap_my_workspace RPC failed:", bsErr);
      return null;
    }
    wsId = createdId;
  }
  if (!wsId) return null;

  // 3) Fetch workspace details + membership role.
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, default_currency, created_at")
    .eq("id", wsId)
    .single();
  const { data: m } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", wsId)
    .eq("user_id", user.id)
    .single();

  if (!ws) return null;
  return {
    workspace: ws,
    role: (m?.role as "owner" | "member") || "member",
    user,
  };
}
