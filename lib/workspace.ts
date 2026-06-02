import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

/**
 * Returns the user's active workspace.
 * Resolution order:
 *   1) `ko_active_ws` cookie → call get_workspace_by_id RPC.
 *      If valid (user is a member), return it.
 *   2) Fallback to get_or_bootstrap_workspace (creates a default workspace
 *      + default categories if the user has none).
 */
export async function getActiveWorkspace() {
  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return null;

  // 1) Try cookie first
  const cookieWsId = getActiveWorkspaceId();
  if (cookieWsId) {
    const { data, error } = await supabase.rpc("get_workspace_by_id", {
      ws_id: cookieWsId,
    });
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.workspace_id) {
        return {
          workspace: {
            id: row.workspace_id,
            name: row.workspace_name,
            owner_id: row.owner_id,
            default_currency: row.default_currency,
            created_at: new Date().toISOString(),
          },
          role: (row.role as "owner" | "member") || "member",
          user,
        };
      }
    }
    // If we got here, the cookie is stale — fall through to bootstrap.
  }

  // 2) Fallback bootstrap
  const displayName =
    (user.user_metadata as any)?.full_name ||
    (user.user_metadata as any)?.name ||
    user.email ||
    "My";

  const { data, error } = await supabase.rpc("get_or_bootstrap_workspace", {
    display_name: displayName,
  });

  if (error) {
    console.log("[ws] RPC error:", error.message, error.code);
    return null;
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log("[ws] RPC returned empty");
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    workspace: {
      id: row.workspace_id,
      name: row.workspace_name,
      owner_id: row.owner_id,
      default_currency: row.default_currency,
      created_at: new Date().toISOString(),
    },
    role: (row.role as "owner" | "member") || "member",
    user,
  };
}
