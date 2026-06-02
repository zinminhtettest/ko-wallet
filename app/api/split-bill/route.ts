import { createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * POST /api/split-bill
 * Body: {
 *   total: number,
 *   currency: string,
 *   merchant?: string,
 *   note?: string,
 *   participant_user_ids: string[],  // workspace members to share the bill (including or excluding payer)
 *   category_id?: string,
 *   occurred_at?: ISO,
 *   payer_share?: number,            // if payer also pays a share, default = equal share
 * }
 *
 * Behavior:
 *   - Inserts N transactions, one per participant
 *   - All share the same `transfer_id` (we reuse this column to group split-bill rows)
 *   - Each row's user_id = the participant who owes
 *   - merchant/note prefix "Split:"
 */
export async function POST(request: Request) {
  const ctx = await getActiveWorkspace();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    total,
    currency,
    merchant,
    note,
    participant_user_ids,
    category_id,
    occurred_at,
  } = body;

  const ids: string[] = Array.isArray(participant_user_ids)
    ? participant_user_ids.filter(Boolean)
    : [];
  if (!total || Number(total) <= 0 || !currency || ids.length === 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const srv = createServiceClient();

  // Verify all participants are members of this workspace
  const { data: members } = await srv
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ctx.workspace.id)
    .in("user_id", ids);
  if ((members?.length || 0) !== ids.length) {
    return NextResponse.json({ error: "non_member_participant" }, { status: 400 });
  }

  const splitId = randomUUID();
  const share = Math.round((Number(total) / ids.length) * 100) / 100;
  const when = occurred_at ? new Date(occurred_at).toISOString() : new Date().toISOString();

  const rows = ids.map((uid) => ({
    workspace_id: ctx.workspace.id,
    user_id: uid,
    amount: share,
    currency,
    kind: "expense",
    category_id: category_id || null,
    merchant: merchant ? `Split: ${merchant}` : "Split bill",
    note: note || null,
    occurred_at: when,
    source: "manual",
    transfer_id: splitId, // reuse to group split rows
  }));

  const { error } = await srv.from("transactions").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    split_id: splitId,
    share,
    participants: ids.length,
  });
}
