import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { THAI_BANKS } from "@/lib/banks";
import { NextResponse } from "next/server";

const VALID_KEYS = new Set(THAI_BANKS.map((b) => b.key));

export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { connectionId, bankKeys } = await request.json();
  if (typeof connectionId !== "string" || !Array.isArray(bankKeys)) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }

  const cleanKeys = bankKeys.filter((k: any) => typeof k === "string" && VALID_KEYS.has(k));

  const srv = createServiceClient();
  const { error } = await srv
    .from("gmail_connections")
    .update({ bank_keys: cleanKeys })
    .eq("id", connectionId)
    .eq("user_id", ctx.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
