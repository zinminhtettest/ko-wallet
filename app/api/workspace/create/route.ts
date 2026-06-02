import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";

const ALLOWED_CURRENCIES = new Set(["THB", "MMK", "USD"]);

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
  const name: string = (body?.name || "").toString().trim();
  const currency: string = (body?.currency || "THB").toString().toUpperCase();

  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  if (!ALLOWED_CURRENCIES.has(currency)) {
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_workspace", {
    ws_name: name,
    currency,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const newId: string | null = Array.isArray(data) ? data[0] : data;
  if (!newId) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  setActiveWorkspaceCookie(newId);
  return NextResponse.json({ id: newId });
}
