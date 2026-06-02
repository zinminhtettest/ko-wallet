import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * POST /api/transfers
 * Body: {
 *   from_workspace_id: uuid,
 *   to_workspace_id: uuid,
 *   from_amount: number,
 *   from_currency: string,
 *   to_amount: number,        // for cross-currency transfers
 *   to_currency: string,
 *   note?: string,
 *   occurred_at?: ISO string  // defaults to now
 * }
 *
 * Creates two linked transactions sharing a transfer_id.
 */
export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    from_workspace_id,
    to_workspace_id,
    from_amount,
    from_currency,
    to_amount,
    to_currency,
    note,
    occurred_at,
  } = body;

  if (!from_workspace_id || !to_workspace_id || !from_amount || !to_amount) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (from_workspace_id === to_workspace_id) {
    return NextResponse.json({ error: "same_wallet" }, { status: 400 });
  }
  if (Number(from_amount) <= 0 || Number(to_amount) <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const srv = createServiceClient();

  // Verify user is a member of BOTH workspaces
  const { data: memberships } = await srv
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", ctx.user.id)
    .in("workspace_id", [from_workspace_id, to_workspace_id]);
  const ids = new Set((memberships ?? []).map((m: any) => m.workspace_id));
  if (!ids.has(from_workspace_id) || !ids.has(to_workspace_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Resolve workspace names for note
  const { data: wsRows } = await srv
    .from("workspaces")
    .select("id, name")
    .in("id", [from_workspace_id, to_workspace_id]);
  const fromWs = wsRows?.find((w: any) => w.id === from_workspace_id);
  const toWs = wsRows?.find((w: any) => w.id === to_workspace_id);

  const transferId = randomUUID();
  const when = occurred_at ? new Date(occurred_at).toISOString() : new Date().toISOString();
  const displayName =
    (ctx.user.user_metadata as any)?.full_name ||
    (ctx.user.user_metadata as any)?.name ||
    ctx.user.email?.split("@")[0] ||
    null;
  const baseNote = note ? `${note}` : `Transfer to ${toWs?.name || "wallet"}`;
  const incomingNote = note ? `${note}` : `Transfer from ${fromWs?.name || "wallet"}`;

  const rows = [
    {
      workspace_id: from_workspace_id,
      user_id: ctx.user.id,
      amount: Number(from_amount),
      currency: from_currency,
      kind: "expense",
      merchant: toWs?.name || "Transfer",
      note: baseNote,
      occurred_at: when,
      source: "transfer",
      transfer_id: transferId,
      created_by_name: displayName,
    },
    {
      workspace_id: to_workspace_id,
      user_id: ctx.user.id,
      amount: Number(to_amount),
      currency: to_currency,
      kind: "income",
      merchant: fromWs?.name || "Transfer",
      note: incomingNote,
      occurred_at: when,
      source: "transfer",
      transfer_id: transferId,
      created_by_name: displayName,
    },
  ];

  const { error } = await srv.from("transactions").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, transfer_id: transferId });
}
