import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";

const ALLOWED_KINDS = new Set(["expense", "income"]);

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name: string = (body?.name || "").toString().trim();
  const icon: string = (body?.icon || "").toString().trim() || "wallet";
  const color: string = (body?.color || "#3b82f6").toString().trim();
  const kind: string = (body?.kind || "expense").toString().toLowerCase();

  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: ctx.workspace.id,
      name,
      icon,
      color,
      kind,
      is_system: false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}
