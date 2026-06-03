import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { SplitBillForm } from "@/components/SplitBillForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerT } from "@/lib/user-lang";

export default async function SplitBillPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();
  const supabase = createClient();
  const srv = createServiceClient();

  const { data: members } = await srv
    .from("workspace_members")
    .select("id, user_id")
    .eq("workspace_id", ctx.workspace.id);
  const memberRows = (members ?? []) as any[];

  // Enrich with emails
  const memberEmails: Record<string, string> = {};
  if (memberRows.length) {
    const { data: usersList } = await srv.auth.admin.listUsers();
    const ids = memberRows.map((m) => m.user_id);
    for (const u of usersList?.users || []) {
      if (ids.includes(u.id)) memberEmails[u.id] = u.email || u.id;
    }
  }

  const enrichedMembers = memberRows.map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    email: memberEmails[m.user_id] || m.user_id,
  }));

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("workspace_id", ctx.workspace.id);

  return (
    <div className="max-w-xl">
      <Link href="/transactions" className="inline-flex items-center text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back")}
      </Link>
      <h1 className="text-2xl font-bold mb-2">{t("Split Bill")}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {t("Share a bill across family members — we create an equal-share expense in each person's wallet.")}
      </p>
      <SplitBillForm
        members={enrichedMembers}
        categories={(categories || []) as any}
        defaultCurrency={ctx.workspace.default_currency}
      />
    </div>
  );
}
