"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, OK is a red destructive button. */
  destructive?: boolean;
};

type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  title?: string;
  message: string;
};

type DialogCtx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  notify: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<DialogCtx | null>(null);

export function useDialog() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDialog must be used inside <DialogProvider>");
  return v;
}

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const notify = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, ...t }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  function close(result: boolean) {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
  }

  // ESC closes, Enter confirms
  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Confirm modal */}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl grid place-items-center flex-shrink-0",
                  pending.destructive
                    ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {pending.title && (
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {pending.title}
                  </h3>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line mt-0.5">
                  {pending.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {pending.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold text-white",
                  pending.destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand-600 hover:bg-brand-700"
                )}
              >
                {pending.confirmLabel || (pending.destructive ? "Delete" : "OK")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 max-w-sm rounded-xl shadow-lg border px-4 py-3 bg-white dark:bg-slate-900",
              t.kind === "success" &&
                "border-green-200 dark:border-green-900/40",
              t.kind === "error" && "border-red-200 dark:border-red-900/40",
              t.kind === "info" && "border-slate-200 dark:border-slate-700"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.kind === "success" && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {t.kind === "error" && (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {t.kind === "info" && <Info className="w-5 h-5 text-brand-600" />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && (
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {t.title}
                </div>
              )}
              <div className="text-sm text-slate-700 dark:text-slate-300 break-words">
                {t.message}
              </div>
            </div>
            <button
              onClick={() =>
                setToasts((cur) => cur.filter((x) => x.id !== t.id))
              }
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
