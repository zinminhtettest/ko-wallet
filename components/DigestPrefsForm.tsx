"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DigestPrefsForm() {
  const t = useT();
  const [frequency, setFrequency] = useState<"off" | "daily" | "weekly">("off");
  const [hour, setHour] = useState(20);
  const [day, setDay] = useState(0);
  const [tzMinutes, setTzMinutes] = useState(420);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    // Detect user's tz from browser
    setTzMinutes(-new Date().getTimezoneOffset());
    fetch("/api/digest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setFrequency(j.frequency || "off");
        setHour(j.hour_local ?? 20);
        setDay(j.day_of_week ?? 0);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const r = await fetch("/api/digest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        frequency,
        hour_local: hour,
        day_of_week: day,
        tz_offset_minutes: tzMinutes,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await fetch("/api/digest/test", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setTestMsg({ kind: "err", text: j?.error || `Send failed (${r.status})` });
      } else {
        setTestMsg({ kind: "ok", text: t("Test digest sent — check your Telegram.") });
      }
    } catch (e: any) {
      setTestMsg({ kind: "err", text: e?.message || "Send failed" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {t("The Telegram bot auto-pushes a periodic summary. Requires a connected Telegram bot.")}
      </p>

      <div>
        <label className="label">Frequency</label>
        <select
          className="input"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as any)}
        >
          <option value="off">Off (no digest)</option>
          <option value="daily">Daily (yesterday's summary)</option>
          <option value="weekly">Weekly (past 7 days)</option>
        </select>
      </div>

      {frequency !== "off" && (
        <>
          <div>
            <label className="label">Time of day (your local time)</label>
            <select
              className="input"
              value={hour}
              onChange={(e) => setHour(parseInt(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>

          {frequency === "weekly" && (
            <div>
              <label className="label">Day of week</label>
              <select
                className="input"
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value))}
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : saved ? "✅ Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {testing ? t("Sending...") : `✈ ${t("Send test digest now")}`}
        </button>
      </div>

      {testMsg && (
        <div
          className={
            testMsg.kind === "ok"
              ? "text-xs text-green-600 dark:text-green-400"
              : "text-xs text-red-600 dark:text-red-400"
          }
        >
          {testMsg.text}
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        {t("Tip: scheduled cron runs roughly every hour and may be delayed by up to an hour. Use \"Send test digest now\" to verify your Telegram connection.")}
      </p>
    </div>
  );
}
