"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, TxKind } from "@/lib/types";
import { useDialog } from "@/components/DialogProvider";

const PRESET_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#0ea5e9",
  "#64748b",
  "#94a3b8",
  "#22c55e",
  "#16a34a",
  "#84cc16",
  "#65a30d",
];

type FormState = {
  name: string;
  icon: string;
  color: string;
  kind: TxKind;
};

const EMPTY_FORM: FormState = {
  name: "",
  icon: "",
  color: PRESET_COLORS[0],
  kind: "expense",
};

function isEmojiIcon(icon: string) {
  return !!icon && !/^[a-z\-]+$/i.test(icon);
}

function IconBadge({ icon, color, name }: { icon: string; color: string; name: string }) {
  const useEmoji = isEmojiIcon(icon);
  return (
    <div
      className="w-9 h-9 rounded-lg grid place-items-center text-white text-sm font-bold"
      style={{ background: color }}
    >
      {useEmoji ? (
        <span className="text-base leading-none">{icon}</span>
      ) : (
        <span>{name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const dialog = useDialog();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setErr(null);
  }

  function startAdd() {
    setEditingId(null);
    resetForm();
    setAdding(true);
  }

  function startEdit(c: Category) {
    setAdding(false);
    setEditingId(c.id);
    setForm({
      name: c.name,
      icon: c.icon,
      color: c.color,
      kind: c.kind,
    });
    setErr(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    resetForm();
  }

  async function save() {
    setErr(null);
    if (!form.name.trim()) {
      setErr("Name မထည့်ရသေးပါ");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const r = await fetch(`/api/categories/${editingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Update failed");
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? (j.category as Category) : c))
        );
      } else {
        const r = await fetch(`/api/categories`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Create failed");
        setCategories((prev) => [...prev, j.category as Category]);
      }
      cancelForm();
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    if (c.is_system) {
      dialog.notify({ kind: "error", message: "System category တွေ delete မလုပ်နိုင်ပါ။" });
      return;
    }
    if (!(await dialog.confirm({ message: `Delete "${c.name}" — သေချာလား?`, destructive: true }))) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Delete failed");
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    } catch (e: any) {
      dialog.notify({ kind: "error", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  const expenses = categories.filter((c) => c.kind === "expense");
  const incomes = categories.filter((c) => c.kind === "income");

  return (
    <div className="space-y-5">
      {(adding || editingId) && (
        <div className="card p-4 space-y-3">
          <div className="font-semibold">
            {editingId ? "Edit Category" : "Add Category"}
          </div>

          <div className="grid grid-cols-[1fr,90px] gap-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Coffee"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Emoji</label>
              <input
                className="input text-center text-lg"
                maxLength={4}
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="☕"
              />
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    "w-7 h-7 rounded-lg border-2",
                    form.color.toLowerCase() === c.toLowerCase()
                      ? "border-slate-900"
                      : "border-transparent"
                  )}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="input w-28 ml-2 text-xs"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div>
            <label className="label">Kind</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              {(["expense", "income"] as TxKind[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setForm({ ...form, kind: k })}
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium",
                    form.kind === k
                      ? k === "expense"
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                      : "text-slate-600"
                  )}
                >
                  {k === "expense" ? "Expense" : "Income"}
                </button>
              ))}
            </div>
          </div>

          {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{err}</div>}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Preview:{" "}
              <span className="inline-flex items-center gap-2 ml-1">
                <IconBadge icon={form.icon} color={form.color} name={form.name || "??"} />
                <span>{form.name || "Category"}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="btn-secondary text-sm"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="btn-primary text-sm"
              >
                <Check className="w-4 h-4" /> {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!(adding || editingId) && (
        <button
          type="button"
          onClick={startAdd}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      )}

      <CategoryList
        title="Expense"
        categories={expenses}
        onEdit={startEdit}
        onDelete={remove}
        disabled={busy}
      />
      <CategoryList
        title="Income"
        categories={incomes}
        onEdit={startEdit}
        onDelete={remove}
        disabled={busy}
      />
    </div>
  );
}

function CategoryList({
  title,
  categories,
  onEdit,
  onDelete,
  disabled,
}: {
  title: string;
  categories: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  disabled: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">{title} ({categories.length})</div>
      {categories.length === 0 ? (
        <div className="text-sm text-slate-500">No categories yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {categories.map((c) => (
            <li key={c.id} className="py-2.5 flex items-center gap-3">
              <IconBadge icon={c.icon} color={c.color} name={c.name} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-slate-500">
                  {c.is_system ? "System" : "Custom"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEdit(c)}
                disabled={disabled}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(c)}
                disabled={disabled || c.is_system}
                className={cn(
                  "p-2 rounded-lg",
                  c.is_system
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-red-600 hover:bg-red-50"
                )}
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
