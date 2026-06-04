import Link from "next/link";
import { Wallet, Mail, Users, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-brand-600 grid place-items-center text-white">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">Ko Wallet</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          A Money Tracker for Your Family
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-200 mb-2">
          Auto-import Thai bank emails and share one wallet with your family.
        </p>
        <p className="text-slate-500 dark:text-slate-400 mb-10">
          THB / MMK / USD support · Beautiful reports · Free to use.
        </p>

        <Link href="/login" className="btn-primary text-base px-6 py-3">
          Get started — Sign in with Google
        </Link>

        <div className="grid md:grid-cols-2 gap-4 mt-16">
          <Feature
            icon={<Mail className="w-5 h-5" />}
            title="Thai Banks Auto-Import"
            body="Connect Gmail. AI reads your bank emails and adds each transaction for you."
          />
          <Feature
            icon={<Users className="w-5 h-5" />}
            title="Family Workspace"
            body="Share one wallet with your family. Everyone can see and edit every transaction."
          />
          <Feature
            icon={<BarChart3 className="w-5 h-5" />}
            title="Beautiful Reports"
            body="Weekly, monthly, and category charts — all with multi-currency support."
          />
          <Feature
            icon={<Wallet className="w-5 h-5" />}
            title="No APK needed (PWA)"
            body='Open the site, tap "Add to Home Screen", and it installs like a regular app.'
          />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 grid place-items-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1.5 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
