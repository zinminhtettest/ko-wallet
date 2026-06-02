"use client";
import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

type Parsed = {
  kind: "expense" | "income" | null;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  category_hint: string | null;
  note: string | null;
  transcript: string;
  confidence: number;
};

export function VoiceCaptureButton({
  onParsed,
}: {
  onParsed: (p: Parsed) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (blob.size === 0) {
          setErr("Empty recording");
          return;
        }
        await upload(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e: any) {
      setErr("Microphone permission denied or unsupported");
    }
  }

  function stop() {
    setRecording(false);
    mediaRecorderRef.current?.stop();
  }

  async function upload(blob: Blob) {
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("audio", blob, "voice.webm");
    try {
      const r = await fetch("/api/voice/parse", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      if ((j.parsed?.confidence ?? 0) < 0.3) {
        setErr(`🎤 Could not understand: "${j.parsed?.transcript || ""}"`);
        return;
      }
      onParsed(j.parsed);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        className={`w-full py-3 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 ${
          recording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-300"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> AI ဆီ ပို့နေပါတယ်...
          </>
        ) : recording ? (
          <>
            <Square className="w-4 h-4" /> Stop & Use
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" /> 🎤 ပြောပြီး auto-fill (Voice)
          </>
        )}
      </button>
      {err && (
        <div className="text-xs text-red-600">{err}</div>
      )}
    </div>
  );
}
