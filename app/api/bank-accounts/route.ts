import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { bank_name, account_label, currency, balance } = await request.json();
  if (!bank_name || !currency) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const supabase = createClient();
  const { error } = await supabase.from("bank_accounts").insert({
    workspace_id: ctx.workspace.id,
    bank_name,
    account_label: account_label || null,
    currency,
    balance: balance != null ? Number(balance) : 0,
    last_updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
