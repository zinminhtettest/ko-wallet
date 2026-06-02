import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const srv = createServiceClient();
  const { data: invite } = await srv
    .from("workspace_invites")
    .select("id, workspace_id, email, accepted, workspaces(name)")
    .eq("token", params.token)
    .maybeSingle();

  if (!invite) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Invite not found</h1>
          <p className="text-slate-600">Link မှားနေသလို ဖြစ်နေပါတယ်။</p>
          <Link href="/" className="btn-primary mt-4">Go home</Link>
        </div>
      </main>
    );
  }

  if (invite.accepted) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Already accepted</h1>
          <Link href="/dashboard" className="btn-primary mt-4">Open Dashboard</Link>
        </div>
      </main>
    );
  }

  if (!user) {
    // Need to log in first — store invite token in URL for round-trip
    redirect(`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`);
  }

  // Add user to workspace
  await srv.from("workspace_members").upsert(
    { workspace_id: invite.workspace_id, user_id: user!.id, role: "member" },
    { onConflict: "workspace_id,user_id" }
  );
  await srv.from("workspace_invites").update({ accepted: true }).eq("id", invite.id);

  redirect("/dashboard");
}
