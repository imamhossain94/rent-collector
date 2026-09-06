import Link from "next/link";
import {
  Building2,
  ReceiptText,
  Gauge,
  MessageSquare,
  Wallet,
  BarChart3,
  ShieldCheck,
  Printer,
  Check,
  ArrowRight,
  Languages,
} from "lucide-react";
import { getCurrentUser, getLang } from "@/lib/auth";
import { pick } from "@/lib/i18n";
import { setLanguage } from "@/app/actions/preferences";

export default async function LandingPage() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLang()]);

  const features = [
    {
      icon: <ReceiptText className="size-4" />,
      titleBn: "এক ক্লিকে মাসিক বিল",
      titleEn: "Bill the whole month in one click",
      bodyBn: "প্রতিটি চলমান ভাড়াটিয়ার ভাড়া, সার্ভিস চার্জ, গ্যাস ও বিদ্যুৎ মিলিয়ে বিল তৈরি হয় — দুবার চাপলেও ডুপ্লিকেট হয় না।",
      bodyEn: "Rent, service charge, gas and electricity roll into one bill per tenant. Press twice — still no duplicates.",
    },
    {
      icon: <Gauge className="size-4" />,
      titleBn: "সাব-মিটারের হিসাব নিজে থেকেই",
      titleEn: "Sub-meter maths, done for you",
      bodyBn: "আগের রিডিং আগে থেকেই বসানো থাকে। শুধু নতুন রিডিং লিখুন, ইউনিট × রেট হিসাব হয়ে বিলে বসে যাবে।",
      bodyEn: "Last month's reading is pre-filled. Type the new one and units × rate lands straight on the bill.",
    },
    {
      icon: <Printer className="size-4" />,
      titleBn: "প্রিন্টযোগ্য মানি রিসিট",
      titleEn: "Printable money receipt",
      bodyBn: "বাড়ি ভাড়া নিয়ন্ত্রণ আইন ১৯৯১ অনুযায়ী রসিদ দেওয়া বাধ্যতামূলক। টাকা নেওয়ার সাথে সাথেই রসিদ — কথায় লেখা টাকাসহ।",
      bodyEn: "The 1991 Rent Control Act makes a receipt mandatory. Print one the moment you take the money — amount in words included.",
    },
    {
      icon: <MessageSquare className="size-4" />,
      titleBn: "বকেয়ার তাগাদা এসএমএসে",
      titleEn: "Chase dues over SMS",
      bodyBn: "যাদের বকেয়া আছে সবাইকে একসাথে বাংলা এসএমএস। প্রতিটি বার্তায় নাম ও সঠিক বকেয়ার অঙ্ক বসে যায়।",
      bodyEn: "One button texts every tenant who owes you, each message carrying their own name and exact balance.",
    },
    {
      icon: <Wallet className="size-4" />,
      titleBn: "খরচসহ নীট আয়",
      titleEn: "Net income, not just rent",
      bodyBn: "মেরামত, দারোয়ানের বেতন, হোল্ডিং ট্যাক্স — খরচ বাদ দিয়ে আসল লাভ দেখুন।",
      bodyEn: "Repairs, guard salary, holding tax — subtract the costs and see what you actually earned.",
    },
    {
      icon: <BarChart3 className="size-4" />,
      titleBn: "১২ মাসের রিপোর্ট",
      titleEn: "Twelve months of proof",
      bodyBn: "মাসভিত্তিক আদায়, বাড়িভিত্তিক লাভ, ভাড়াটিয়াভিত্তিক বকেয়া — প্রিন্ট করে ব্যাংকে জমা দেওয়ার মতো।",
      bodyEn: "Collections by month, profit by property, dues by tenant — printable enough for a bank file.",
    },
  ];

  const compare = [
    { bn: "কাগজের খাতা", en: "Paper khata", ours: false, note_bn: "হারিয়ে যায়, হিসাব মেলে না", note_en: "Gets lost, never reconciles" },
    { bn: "সাধারণ ডিজিটাল খাতা", en: "Generic digital khata", ours: false, note_bn: "ভাড়াটিয়া বা মিটার বোঝে না", note_en: "Knows nothing about tenants or meters" },
    { bn: "ভাড়া খাতা", en: "Bhara Khata", ours: true, note_bn: "বাড়ি → ইউনিট → ভাড়াটিয়া → বিল → রসিদ", note_en: "Property → unit → tenant → bill → receipt" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="icon-box-primary size-8">
              <Building2 className="size-4" />
            </span>
            <span className="text-base font-bold tracking-tight">
              {pick(lang, "ভাড়া", "Bhara")}
              <span className="text-[color:var(--primary)]">{pick(lang, "খাতা", "Khata")}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <form action={setLanguage.bind(null, lang === "bn" ? "en" : "bn")}>
              <button className="btn btn-ghost btn-sm gap-1.5">
                <Languages className="size-4" />
                <span className="text-xs font-bold">{lang === "bn" ? "EN" : "বাং"}</span>
              </button>
            </form>
            {user ? (
              <Link href={user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard"} className="btn btn-primary btn-sm">
                {pick(lang, "ড্যাশবোর্ড", "Dashboard")}
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  {pick(lang, "লগইন", "Sign in")}
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  {pick(lang, "ফ্রি শুরু করুন", "Start free")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="glow left-[8%] top-[10%] size-80 bg-[color:var(--primary)]" />
        <div className="glow bottom-[5%] right-[8%] size-72 bg-[color:var(--success)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="badge badge-primary">
                {pick(lang, "বাংলাদেশের বাড়িওয়ালাদের জন্য", "Built for Bangladeshi landlords")}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                {pick(lang, "ভাড়া আদায়ের ঝামেলা ", "Rent collection, ")}
                <span className="text-[color:var(--primary)]">
                  {pick(lang, "এবার শেষ", "finally sorted")}
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed muted">
                {pick(
                  lang,
                  "বাড়ি, দোকান বা গ্যারেজ — যা কিছু ভাড়া দেন সব এক খাতায়। ভাড়াটিয়ার তথ্য, মাসিক বিল, বিদ্যুৎ মিটার, মানি রিসিট আর বকেয়ার তাগাদা — সবকিছু এক জায়গা থেকে।",
                  "Houses, shops, garages — every rentable thing in one ledger. Tenants, monthly bills, electricity meters, money receipts and due reminders, all from one screen.",
                )}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/register" className="btn btn-primary btn-lg">
                  {pick(lang, "ফ্রি অ্যাকাউন্ট খুলুন", "Create a free account")}
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  {pick(lang, "ডেমো দেখুন", "Try the demo")}
                </Link>
              </div>
              <p className="mt-3 text-xs muted">
                {pick(
                  lang,
                  "ডেমো লগইন: ০১৭১১১১১১১১ / 123456",
                  "Demo login: 01711111111 / 123456",
                )}
              </p>
            </div>

            {/* mock dashboard card */}
            <div className="card card-pad">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xs font-bold uppercase tracking-wider muted">
                    {pick(lang, "সেপ্টেম্বর ২০২৬", "September 2026")}
                  </p>
                  <p className="num mt-1 text-2xl font-extrabold text-[color:var(--success)]">৳ 1,84,500</p>
                  <p className="text-xs muted">{pick(lang, "এ মাসে আদায়", "collected this month")}</p>
                </div>
                <span className="icon-box-primary size-10">
                  <Wallet className="size-5" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [pick(lang, "ভাড়াটিয়া", "Tenants"), "18"],
                  [pick(lang, "বকেয়া", "Due"), "৳ 27,000"],
                  [pick(lang, "খালি", "Vacant"), "2"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded border border-border p-2.5">
                    <p className="num text-sm font-extrabold">{v}</p>
                    <p className="text-2xs muted">{k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ["রহিম উদ্দিন", "A-3", "৳ 12,500", "PAID"],
                  ["সালমা বেগম", "B-1", "৳ 9,800", "PARTIAL"],
                  ["দোকান নং ৪", "Shop 4", "৳ 22,000", "UNPAID"],
                ].map(([name, unit, amount, st]) => (
                  <div key={name} className="flex items-center justify-between rounded border border-border p-2.5 text-xs">
                    <span>
                      <span className="block font-bold">{name}</span>
                      <span className="block text-2xs muted">{unit}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num font-bold">{amount}</span>
                      <span
                        className={
                          st === "PAID" ? "badge badge-success" : st === "PARTIAL" ? "badge badge-warning" : "badge badge-destructive"
                        }
                      >
                        {st === "PAID"
                          ? pick(lang, "পরিশোধিত", "Paid")
                          : st === "PARTIAL"
                            ? pick(lang, "আংশিক", "Partial")
                            : pick(lang, "বকেয়া", "Due")}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">
          {pick(lang, "যা যা করতে পারবেন", "Everything the khata does")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs muted">
          {pick(
            lang,
            "বাংলাদেশের ভাড়ার বাস্তবতা মাথায় রেখে বানানো — জামানত, সাব-মিটার, সার্ভিস চার্জ, বিকাশ/নগদ, বাংলা রসিদ।",
            "Shaped around how renting actually works here: deposits, sub-meters, service charges, bKash/Nagad and Bangla receipts.",
          )}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.titleEn} className="card card-pad">
              <span className="icon-box size-9">{f.icon}</span>
              <h3 className="mt-3 text-sm font-bold">{pick(lang, f.titleBn, f.titleEn)}</h3>
              <p className="mt-1 text-xs leading-relaxed muted">{pick(lang, f.bodyBn, f.bodyEn)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* comparison */}
      <section className="border-y border-border bg-[color-mix(in_oklab,var(--muted)_35%,transparent)]">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-center text-2xl font-extrabold tracking-tight">
            {pick(lang, "কেন আলাদা", "Why not just a digital khata?")}
          </h2>
          <div className="mt-6 space-y-2">
            {compare.map((row) => (
              <div
                key={row.en}
                className={`card card-pad flex items-center justify-between gap-3 ${
                  row.ours ? "border-[color-mix(in_oklab,var(--primary)_50%,transparent)]" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-bold">{pick(lang, row.bn, row.en)}</p>
                  <p className="text-xs muted">{pick(lang, row.note_bn, row.note_en)}</p>
                </div>
                {row.ours ? (
                  <span className="badge badge-success">
                    <Check className="size-3.5" />
                    {pick(lang, "এটাই লাগবে", "This one")}
                  </span>
                ) : (
                  <span className="badge badge-muted">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* trust + cta */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="icon-box-primary mx-auto size-11">
          <ShieldCheck className="size-5" />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight">
          {pick(lang, "আপনার হিসাব আপনারই থাকে", "Your ledger stays yours")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed muted">
          {pick(
            lang,
            "পাসওয়ার্ড এনক্রিপ্ট করা, প্রতিটি বাড়িওয়ালার তথ্য সম্পূর্ণ আলাদা। এখন SQLite, পরে PostgreSQL বা Firebase-এ সরানো যাবে কোনো ঝামেলা ছাড়াই।",
            "Passwords are hashed and every owner's data is fully separated. SQLite today, PostgreSQL or Firebase tomorrow, with no schema rewrite.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="btn btn-primary btn-lg">
            {pick(lang, "এখনই শুরু করুন", "Get started")}
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/login" className="btn btn-outline btn-lg">
            {pick(lang, "লগইন", "Sign in")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs muted sm:flex-row">
          <span>
            © {new Date().getFullYear()} {pick(lang, "ভাড়া খাতা", "Bhara Khata")} ·{" "}
            {pick(lang, "বাংলাদেশের বাড়িওয়ালাদের জন্য", "for landlords in Bangladesh")}
          </span>
          <span>{pick(lang, "নগদ · বিকাশ · নগদ · রকেট · ব্যাংক", "Cash · bKash · Nagad · Rocket · Bank")}</span>
        </div>
      </footer>
    </div>
  );
}
