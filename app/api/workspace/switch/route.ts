import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const workspaceId: string | undefined = body?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "missing_workspaceId" }, { status: 400 });
  }

  // Validate that the user is a member by calling the RPC (which is RLS-aware).
  const { data, error } = await supabase.rpc("get_workspace_by_id", {
    ws_id: workspaceId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.workspace_id) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  setActiveWorkspaceCookie(workspaceId);
  return NextResponse.json({ ok: true });
}
