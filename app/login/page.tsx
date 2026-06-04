"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wallet } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const btnRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // GIS button click opens the full centered account-chooser popup, and the
  // consent screen reads "Sign in to kowallet.app" because Google validates
  // the JS origin (not Supabase). One Tap corner widget is suppressed.
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    function init() {
      if (cancelled || !window.google?.accounts?.id || !btnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse,
          ux_mode: "popup",
          auto_select: false,
          context: "signin",
          itp_support: true,
          // FedCM gives the OS-native account chooser (no Chrome Custom Tab
          // header on Android PWA) and a cleaner desktop popup. Falls back
          // to the legacy chooser automatically if the browser doesn't
          // support FedCM yet.
          use_fedcm_for_prompt: true,
          use_fedcm_for_button: true,
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "filled_blue",
          size: "large",
          type: "standard",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          locale: "en",
          width: 320,
        });
        setGisReady(true);
      } catch {
        // fall through to legacy button
      }
    }

    const existing = document.getElementById("gsi-script");
    if (existing) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.id = "gsi-script";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCredentialResponse(response: { credential: string }) {
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.credential,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function legacySignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-600 grid place-items-center text-white mx-auto mb-5">
          <Wallet className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Ko Wallet</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8">
          Sign in with your Google account. <br />
          Your data is saved to the cloud, so it follows you across every device.
        </p>

        {/* Real GIS button — click opens centered popup chooser with kowallet.app.
            We clip the iframe's outer white edges by sizing the wrapper to the
            pill's exact dimensions and using overflow:hidden + a pill border-radius.
            The blue pill and its white text are preserved untouched. */}
        {CLIENT_ID && (
          <div className="flex justify-center">
            <div
              style={{
                width: 320,
                height: 40,
                overflow: "hidden",
                borderRadius: 999,
                display: "inline-block",
                lineHeight: 0,
              }}
            >
              <div ref={btnRef} style={{ marginTop: -1 }} />
            </div>
          </div>
        )}

        {/* Legacy fallback — only shown if env var missing or GIS failed to load */}
        {(!CLIENT_ID || !gisReady) && (
          <button
            onClick={legacySignIn}
            disabled={busy}
            className="btn w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-white py-3 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853"/>
              <path d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83Z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}

        {err && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm p-3 text-left">
            {err}
          </div>
        )}

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
          By signing in, you agree to our Privacy Policy and Terms.
        </p>
      </div>
    </main>
  );
}
