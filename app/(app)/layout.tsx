import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveWorkspace();
  if (!ctx) redirect("/login");
  return (
    <AppShell workspaceName={ctx.workspace.name} userEmail={ctx.user.email ?? ""}>
      {children}
    </AppShell>
  );
}
