import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getCurrentUser, getLang } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";
import { pick, t } from "@/lib/i18n";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
  const lang = await getLang();

  return (
    <div className="auth-container relative">
      <div className="glow left-[10%] top-[15%] size-72 bg-[color:var(--primary)]" />
      <div className="glow bottom-[10%] right-[12%] size-64 bg-[color:var(--success)]" />

      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="icon-box-primary size-9">
            <Building2 className="size-4.5" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            {pick(lang, "ভাড়া", "Bhara")}
            <span className="text-[color:var(--primary)]">{pick(lang, "খাতা", "Khata")}</span>
          </span>
        </Link>

        <div className="card card-pad">
          <h1 className="text-lg font-bold tracking-tight">{t("signInTitle", lang)}</h1>
          <p className="mb-4 mt-0.5 text-xs muted">{t("appTagline", lang)}</p>
          <LoginForm lang={lang} />
        </div>

        <div className="card card-pad mt-3 text-xs muted">
          <p className="mb-1 font-bold text-[color:var(--foreground)]">
            {pick(lang, "ডেমো অ্যাকাউন্ট", "Demo accounts")}
          </p>
          <p className="num">01711111111 / 123456 — {pick(lang, "বাড়িওয়ালা", "House owner")}</p>
          <p className="num">01700000000 / admin123 — {pick(lang, "সুপার অ্যাডমিন", "Super admin")}</p>
        </div>
      </div>
    </div>
  );
}
