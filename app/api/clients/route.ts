import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*, invoices(amount, currency, status)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, contact, notes } = await request.json();
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ workspace_id: ctx.workspace.id, name, contact, notes })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
