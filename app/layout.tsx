import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DialogProvider } from "@/components/DialogProvider";

export const metadata: Metadata = {
  title: "Ko Wallet — Family Money Tracker",
  description: "Track expenses and income with your family. Krungthai Bank email auto-import.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ko Wallet" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Runs BEFORE React hydrates to set the html.dark class.
// Prevents the light→dark flash for users on Dark or System+OS-prefers-dark.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('ko_theme') || 'system';
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = t === 'dark' || (t === 'system' && prefersDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <DialogProvider>{children}</DialogProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(()=>{});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
