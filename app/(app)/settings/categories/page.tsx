import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { CategoryManager } from "@/components/CategoryManager";
import type { Category } from "@/lib/types";
import { getServerT } from "@/lib/user-lang";

export default async function CategoriesSettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;
  const t = await getServerT();

  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("kind", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href="/settings" className="text-sm text-slate-500">← {t("Settings")}</Link>
        <h1 className="text-2xl font-bold mt-1">{t("Categories")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("Add, edit, or delete custom categories. System defaults cannot be deleted.")}
        </p>
      </div>

      <CategoryManager initialCategories={(data || []) as Category[]} />
    </div>
  );
}
