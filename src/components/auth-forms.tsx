"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Phone, Lock, User, Mail, Building2 } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "./client-bits";
import type { Lang } from "@/lib/constants";
import { pick, t } from "@/lib/i18n";

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded border border-[color-mix(in_oklab,var(--destructive)_45%,transparent)] bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[color:var(--destructive)]">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function IconInput({
  icon,
  ...props
}: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted">{icon}</span>
      <input {...props} className="input pl-9" />
    </div>
  );
}

export function LoginForm({ lang }: { lang: Lang }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-3">
      <ErrorBox message={state?.error} />
      <div>
        <span className="label">{t("phone", lang)}</span>
        <IconInput
          icon={<Phone className="size-4" />}
          name="phone"
          inputMode="numeric"
          placeholder="01712345678"
          required
          autoComplete="tel"
        />
      </div>
      <div>
        <span className="label">{t("password", lang)}</span>
        <IconInput
          icon={<Lock className="size-4" />}
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingText={pick(lang, "অপেক্ষা করুন…", "Signing in…")}>
        {t("login", lang)}
      </SubmitButton>
      <p className="text-center text-xs muted">
        {t("noAccount", lang)}{" "}
        <Link href="/register" className="link">
          {t("register", lang)}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ lang }: { lang: Lang }) {
  const [state, action] = useActionState<AuthState, FormData>(registerAction, null);
  return (
    <form action={action} className="space-y-3">
      <ErrorBox message={state?.error} />
      <div>
        <span className="label">{t("name", lang)}</span>
        <IconInput icon={<User className="size-4" />} name="name" placeholder={pick(lang, "আপনার নাম", "Your name")} required />
      </div>
      <div>
        <span className="label">{t("phone", lang)}</span>
        <IconInput
          icon={<Phone className="size-4" />}
          name="phone"
          inputMode="numeric"
          placeholder="01712345678"
          required
        />
      </div>
      <div>
        <span className="label">
          {t("businessName", lang)} <span className="font-normal">({t("optional", lang)})</span>
        </span>
        <IconInput
          icon={<Building2 className="size-4" />}
          name="businessName"
          placeholder={pick(lang, "যেমন: রহমান ভিলা", "e.g. Rahman Villa")}
        />
      </div>
      <div>
        <span className="label">
          {t("email", lang)} <span className="font-normal">({t("optional", lang)})</span>
        </span>
        <IconInput icon={<Mail className="size-4" />} name="email" type="email" placeholder="name@example.com" />
      </div>
      <div>
        <span className="label">{t("password", lang)}</span>
        <IconInput
          icon={<Lock className="size-4" />}
          name="password"
          type="password"
          placeholder={pick(lang, "কমপক্ষে ৬ অক্ষর", "At least 6 characters")}
          required
          autoComplete="new-password"
        />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingText={pick(lang, "তৈরি হচ্ছে…", "Creating…")}>
        {t("register", lang)}
      </SubmitButton>
      <p className="text-center text-xs muted">
        {t("haveAccount", lang)}{" "}
        <Link href="/login" className="link">
          {t("login", lang)}
        </Link>
      </p>
    </form>
  );
}
