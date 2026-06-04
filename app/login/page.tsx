"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KLogo } from "@/components/KLogo";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const btnRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Direct Google Identity Services flow — makes the consent screen say
  // "Sign in to kowallet.app" instead of the supabase project URL.
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    function init() {
      if (cancelled) return;
      if (!window.google?.accounts?.id || !btnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse,
          ux_mode: "popup",
          auto_select: false,
          context: "signin",
          locale: "en",
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "filled_blue",
          size: "large",
          type: "standard",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          locale: "en",
        });
        setGisReady(true);
      } catch (e) {
        // fall through to legacy button
      }
    }

    const existing = document.getElementById("gsi-script");
    if (existing) {
      init();
      return;
    }
    const script = document.createElement("script");
    // hl=en forces the button text into English regardless of the
    // browser's Accept-Language header (otherwise Thai/Burmese users
    // would see localized text on this English landing page).
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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.credential,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  // Legacy fallback — used when CLIENT_ID env var isn't set or GIS script
  // fails to load. Goes through Supabase OAuth → Google → supabase callback.
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
        <KLogo className="w-14 h-14 rounded-2xl mx-auto mb-5" />
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Ko Wallet</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-8">
          Sign in with your Google account. <br />
          Your data is saved to the cloud, so it follows you across every device.
        </p>

        {CLIENT_ID && (
          <div ref={btnRef} className="flex justify-center" />
        )}

        {(!CLIENT_ID || !gisReady) && (
          <button
            onClick={legacySignIn}
            className="btn w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-white py-3"
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
