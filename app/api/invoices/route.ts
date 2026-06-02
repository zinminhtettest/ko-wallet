import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const supabase = createClient();
  let q = supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const { client_id, amount, currency, description, due_date, status } = body;
  if (!client_id || !amount || !currency) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const supabase = createClient();
  const { error } = await supabase.from("invoices").insert({
    workspace_id: ctx.workspace.id,
    client_id,
    amount: Number(amount),
    currency,
    description: description || null,
    due_date: due_date || null,
    status: status || "unpaid",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
