import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Returns the user's active workspace (first one they belong to).
 * If the user is authenticated but has no workspace (e.g. trigger didn't fire
 * on signup), this function will bootstrap a fresh workspace + default
 * categories so the app never gets stuck in a redirect loop.
 */
export async function getActiveWorkspace() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Use service-role client to bypass RLS for these admin-style reads.
  // RLS on workspace_members has a circular dependency that can fail in some
  // contexts; service role gives us a reliable read for the layout check.
  const srv = createServiceClient();

  const { data: memberships } = await srv
    .from("workspace_members")
    .select(
      "workspace_id, role, joined_at, workspaces!inner(id, name, owner_id, default_currency, created_at)"
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  if (memberships && memberships.length > 0) {
    const row = memberships[0] as any;
    return {
      workspace: row.workspaces,
      role: row.role as "owner" | "member",
      user,
    };
  }

  // ---- Bootstrap fallback ----
  // The signup trigger should have created a workspace, but if it didn't
  // (e.g. trigger was missing when the user signed up), create one now.
  const displayName =
    (user.user_metadata as any)?.full_name ||
    (user.user_metadata as any)?.name ||
    user.email ||
    "My";
  const wsName = `${displayName}'s Wallet`;

  const { data: newWs, error: wsErr } = await srv
    .from("workspaces")
    .insert({ name: wsName, owner_id: user.id, default_currency: "THB" })
    .select("id, name, owner_id, default_currency, created_at")
    .single();
  if (wsErr || !newWs) {
    console.error("Bootstrap workspace failed:", wsErr);
    return null;
  }

  await srv.from("workspace_members").insert({
    workspace_id: newWs.id,
    user_id: user.id,
    role: "owner",
  });

  // Seed default categories
  const cats = [
    ["Food", "utensils", "#ef4444", "expense"],
    ["Transport", "car", "#f59e0b", "expense"],
    ["Shopping", "shopping-bag", "#ec4899", "expense"],
    ["Bills", "receipt", "#8b5cf6", "expense"],
    ["Health", "heart", "#10b981", "expense"],
    ["Entertainment", "film", "#06b6d4", "expense"],
    ["Education", "book-open", "#6366f1", "expense"],
    ["Travel", "plane", "#0ea5e9", "expense"],
    ["Bank Fee", "banknote", "#64748b", "expense"],
    ["Other", "wallet", "#94a3b8", "expense"],
    ["Salary", "briefcase", "#22c55e", "income"],
    ["Business", "trending-up", "#16a34a", "income"],
    ["Gift", "gift", "#84cc16", "income"],
    ["Other Income", "plus-circle", "#65a30d", "income"],
  ] as const;
  await srv.from("categories").insert(
    cats.map(([name, icon, color, kind]) => ({
      workspace_id: newWs.id,
      name,
      icon,
      color,
      kind,
      is_system: true,
    }))
  );

  return {
    workspace: newWs,
    role: "owner" as const,
    user,
  };
}
