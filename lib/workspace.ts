import { createClient } from "@/lib/supabase/server";

/**
 * Returns the user's active workspace using a single DB RPC that bypasses RLS.
 * The RPC also bootstraps a workspace + default categories if the user has none.
 */
export async function getActiveWorkspace() {
  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return null;

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
  console.log("[ws] OK", row.workspace_id);

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
