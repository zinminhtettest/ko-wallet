import Link from "next/link";
import { Wallet, Mail, Users, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-brand-600 grid place-items-center text-white">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold">Ko Wallet</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          မိသားစုအတွက် Money Tracker
        </h1>
        <p className="text-lg text-slate-600 mb-2">
          Krungthai Bank email auto-import + Family workspace sharing.
        </p>
        <p className="text-slate-500 mb-10">
          THB / MMK / USD support · Beautiful reports · Free to use.
        </p>

        <Link href="/login" className="btn-primary text-base px-6 py-3">
          Get Started — Google နဲ့ Login ဝင်ပါ
        </Link>

        <div className="grid md:grid-cols-2 gap-4 mt-16">
          <Feature icon={<Mail className="w-5 h-5" />}
            title="Krungthai Bank Auto-Import"
            body="Gmail နဲ့ ချိတ်ပြီး bank email တွေကို AI က parse လုပ်ပြီး transaction အဖြစ် auto-add လုပ်ပေးတယ်။" />
          <Feature icon={<Users className="w-5 h-5" />}
            title="Family Workspace"
            body="အကောင့်များ မျှသုံး — အားလုံး transaction တွေ မြင်နိုင်ပြီး edit လုပ်နိုင်တယ်။" />
          <Feature icon={<BarChart3 className="w-5 h-5" />}
            title="Beautiful Reports"
            body="Weekly, monthly, category-wise charts. Multi-currency support။" />
          <Feature icon={<Wallet className="w-5 h-5" />}
            title="PWA — APK အလို မလို"
            body='Browser ထဲမှာ ဖွင့်ပြီး "Add to Home Screen" → APK လို install ဖြစ်တယ်။' />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}
