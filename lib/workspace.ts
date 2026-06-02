import { createClient } from "@/lib/supabase/server";

/**
 * Returns the user's active workspace using DB RPC functions.
 * Logs verbosely so failures show up in Vercel runtime logs.
 */
export async function getActiveWorkspace() {
  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.log("[ws] getUser error:", userErr.message);
    return null;
  }
  if (!user) {
    console.log("[ws] no user");
    return null;
  }
  console.log("[ws] user:", user.id, user.email);

  // 1) Lookup existing workspace via RPC
  const { data: wsIdRaw, error: rpcErr } = await supabase.rpc(
    "get_my_workspace_id"
  );
  if (rpcErr) {
    console.log("[ws] get_my_workspace_id error:", rpcErr.message, rpcErr.code);
  }
  let wsId: string | null = (wsIdRaw as any) ?? null;
  console.log("[ws] existing wsId:", wsId);

  // 2) Bootstrap if missing
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
      console.log(
        "[ws] bootstrap RPC error:",
        bsErr.message,
        bsErr.code,
        bsErr.details
      );
      return null;
    }
    wsId = (createdId as any) ?? null;
    console.log("[ws] bootstrapped wsId:", wsId);
  }
  if (!wsId) {
    console.log("[ws] no wsId after bootstrap");
    return null;
  }

  // 3) Fetch workspace details
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, default_currency, created_at")
    .eq("id", wsId)
    .single();
  if (wsErr) {
    console.log("[ws] workspaces fetch error:", wsErr.message, wsErr.code);
  }
  const { data: m, error: mErr } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", wsId)
    .eq("user_id", user.id)
    .single();
  if (mErr) {
    console.log("[ws] members fetch error:", mErr.message, mErr.code);
  }

  if (!ws) {
    console.log("[ws] workspace row not loaded");
    return null;
  }
  console.log("[ws] OK", ws.id);
  return {
    workspace: ws,
    role: (m?.role as "owner" | "member") || "member",
    user,
  };
}
