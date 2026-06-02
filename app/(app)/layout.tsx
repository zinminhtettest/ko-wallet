import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1) Check auth directly — if no user, send to login.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2) Try to get workspace.
  const ctx = await getActiveWorkspace();

  // 3) If still no workspace, show debug page instead of redirecting
  //    (avoids infinite redirect loop). Click "Try again" to retry.
  if (!ctx) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Setting up your workspace…</h1>
          <p className="text-sm text-slate-600 mb-4">
            User: <code className="break-all">{user.email}</code>
            <br />
            Could not load workspace. This usually self-heals on retry.
          </p>
          <a href="/dashboard" className="btn-primary inline-flex">
            Try again
          </a>
          <form action="/auth/signout" method="POST" className="mt-3">
            <button className="text-sm text-slate-500 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      workspaceName={ctx.workspace.name}
      userEmail={ctx.user.email ?? ""}
      activeWorkspaceId={ctx.workspace.id}
    >
      {children}
    </AppShell>
  );
}
