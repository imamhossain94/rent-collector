import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { getCurrentUser, getLang } from "@/lib/auth";
import { RegisterForm } from "@/components/auth-forms";
import { pick, t } from "@/lib/i18n";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const lang = await getLang();

  const perks = [
    pick(lang, "যত খুশি বাড়ি, দোকান বা গ্যারেজ", "Unlimited houses, shops or garages"),
    pick(lang, "এক ক্লিকে সব ভাড়াটিয়ার মাসিক বিল", "One-click monthly bills for every tenant"),
    pick(lang, "সাব-মিটার থেকে বিদ্যুৎ বিল হিসাব", "Electricity billed straight from sub-meter units"),
    pick(lang, "প্রিন্টযোগ্য মানি রিসিট (আইনত বাধ্যতামূলক)", "Printable money receipt (required by law)"),
  ];

  return (
    <div className="auth-container relative">
      <div className="glow left-[12%] top-[10%] size-72 bg-[color:var(--primary)]" />
      <div className="glow bottom-[8%] right-[10%] size-64 bg-[color:var(--warning)]" />

      <div className="relative grid w-full max-w-4xl gap-6 lg:grid-cols-2">
        <div className="hidden flex-col justify-center lg:flex">
          <Link href="/" className="mb-5 flex items-center gap-2">
            <span className="icon-box-primary size-9">
              <Building2 className="size-4.5" />
            </span>
            <span className="text-xl font-bold tracking-tight">
              {pick(lang, "ভাড়া", "Bhara")}
              <span className="text-[color:var(--primary)]">{pick(lang, "খাতা", "Khata")}</span>
            </span>
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {pick(lang, "কাগজের খাতা এবার পকেটে", "Your paper khata, now in your pocket")}
          </h2>
          <p className="mt-2 text-xs muted">
            {pick(
              lang,
              "ভাড়া, বিদ্যুৎ, গ্যাস, সার্ভিস চার্জ — সব হিসাব এক জায়গায়। ভাড়াটিয়াকে এসএমএসে তাগাদা দিন, রসিদ প্রিন্ট করুন।",
              "Rent, electricity, gas and service charge in one ledger. Nudge tenants by SMS and print a receipt on the spot.",
            )}
          </p>
          <ul className="mt-5 space-y-2">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex size-4 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color:var(--success)]">
                  <Check className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-pad">
          <h1 className="text-lg font-bold tracking-tight">{t("signUpTitle", lang)}</h1>
          <p className="mb-4 mt-0.5 text-xs muted">
            {pick(lang, "ফ্রি — কোনো কার্ড লাগবে না", "Free — no card required")}
          </p>
          <RegisterForm lang={lang} />
        </div>
      </div>
    </div>
  );
}
