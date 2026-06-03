import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import Link from "next/link";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { CancelInviteButton } from "@/components/CancelInviteButton";
import { Copy } from "lucide-react";
import { ClientDate } from "@/components/ClientDate";

export default async function WorkspaceSettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;

  const srv = createServiceClient();
  const { data: members } = await srv
    .from("workspace_members")
    .select("id, role, joined_at, user_id")
    .eq("workspace_id", ctx.workspace.id);

  // Enrich with email — we need to look up via auth.users (service role only)
  const memberIds = (members ?? []).map((m: any) => m.user_id);
  const userEmails: Record<string, string> = {};
  if (memberIds.length) {
    const { data: usersList } = await srv.auth.admin.listUsers();
    for (const u of usersList?.users || []) {
      if (memberIds.includes(u.id)) userEmails[u.id] = u.email || u.id;
    }
  }

  const { data: invites } = await srv
    .from("workspace_invites")
    .select("id, email, token, accepted, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("accepted", false)
    .order("created_at", { ascending: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href="/settings" className="text-sm text-slate-500">← Settings</Link>
        <h1 className="text-2xl font-bold mt-1">Family Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">
          အကောင့်များ မျှသုံး — အားလုံး transaction တွေ မြင်နိုင်ပြီး edit လုပ်နိုင်တယ်။
        </p>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Members ({members?.length ?? 0})</h3>
        <ul className="divide-y divide-slate-100">
          {(members ?? []).map((m: any) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{userEmails[m.user_id] || m.user_id}</div>
                <div className="text-xs text-slate-500">Joined <ClientDate value={m.joined_at} /></div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${m.role === "owner" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700"}`}>
                {m.role}
              </span>
              {ctx.role === "owner" && m.role !== "owner" && m.user_id !== ctx.user.id && (
                <RemoveMemberButton memberId={m.id} email={userEmails[m.user_id] || m.user_id} />
              )}
            </li>
          ))}
        </ul>
      </div>

      {ctx.role === "owner" && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Invite a family member</h3>
          <InviteMemberForm workspaceId={ctx.workspace.id} />
        </div>
      )}

      {invites && invites.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Pending Invites</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {invites.map((inv: any) => {
              const url = `${appUrl}/invite/${inv.token}`;
              return (
                <li key={inv.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-slate-500 break-all">{url}</div>
                    <CopyLinkButton url={url} />
                  </div>
                  {ctx.role === "owner" && (
                    <CancelInviteButton inviteId={inv.id} email={inv.email} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  // server component → cannot have onClick; render a small client component inline
  return (
    <Link
      href={`#`}
      // we make this a no-op link; users can copy the URL above directly.
      className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 mt-1"
    >
      <Copy className="w-3 h-3" /> Copy link manually
    </Link>
  );
}
