"use client";
import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DigestPrefsForm() {
  const [frequency, setFrequency] = useState<"off" | "daily" | "weekly">("off");
  const [hour, setHour] = useState(20);
  const [day, setDay] = useState(0);
  const [tzMinutes, setTzMinutes] = useState(420);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Telegram bot က ပုံမှန် summary auto-push ပါမယ်။ Telegram bot link လုပ်ထားရင်သာ အလုပ်လုပ်ပါ။
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

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? "Saving..." : saved ? "✅ Saved" : "Save"}
      </button>
    </div>
  );
}
