import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspace";
import { CategoryManager } from "@/components/CategoryManager";
import type { Category } from "@/lib/types";

export default async function CategoriesSettingsPage() {
  const ctx = await getActiveWorkspace();
  if (!ctx) return null;

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
        <Link href="/settings" className="text-sm text-slate-500">← Settings</Link>
        <h1 className="text-2xl font-bold mt-1">Categories</h1>
        <p className="text-sm text-slate-500 mt-1">
          Custom category တွေ ထည့်/ပြင်/ဖျက် လုပ်နိုင်တယ်။ System default တွေကို delete မလုပ်နိုင်ပါ။
        </p>
      </div>

      <CategoryManager initialCategories={(data || []) as Category[]} />
    </div>
  );
}
