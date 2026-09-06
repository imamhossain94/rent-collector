"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { updateProfileAction, changePasswordAction, type AuthState } from "@/app/actions/auth";
import { Field, FormGrid, Input, Textarea } from "./ui";
import { SubmitButton } from "./client-bits";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

function Feedback({ state, lang }: { state: AuthState; lang: Lang }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--destructive)]">
        <AlertCircle className="size-4" />
        {state.error}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--success)]">
      <CheckCircle2 className="size-4" />
      {pick(lang, "সংরক্ষণ হয়েছে", "Saved")}
    </p>
  );
}

export function ProfileForm({
  lang,
  user,
}: {
  lang: Lang;
  user: { name: string; phone: string; email: string | null; businessName: string | null; address: string | null; nid: string | null };
}) {
  const [state, action] = useActionState<AuthState, FormData>(updateProfileAction, null);
  return (
    <form action={action} className="space-y-3">
      <FormGrid>
        <Field label={t("name", lang)} required>
          <Input name="name" defaultValue={user.name} required />
        </Field>
        <Field label={t("phone", lang)}>
          <Input defaultValue={user.phone} disabled />
        </Field>
        <Field label={t("businessName", lang)} hint={pick(lang, "বিল ও রসিদের উপরে ছাপা হবে", "Printed on bills and receipts")}>
          <Input name="businessName" defaultValue={user.businessName ?? ""} />
        </Field>
        <Field label={t("email", lang)}>
          <Input name="email" type="email" defaultValue={user.email ?? ""} />
        </Field>
        <Field label={t("nid", lang)}>
          <Input name="nid" defaultValue={user.nid ?? ""} />
        </Field>
        <Field label={t("address", lang)} className="sm:col-span-2">
          <Textarea name="address" rows={2} defaultValue={user.address ?? ""} />
        </Field>
      </FormGrid>
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm">{t("saveChanges", lang)}</SubmitButton>
        <Feedback state={state} lang={lang} />
      </div>
    </form>
  );
}

export function PasswordForm({ lang }: { lang: Lang }) {
  const [state, action] = useActionState<AuthState, FormData>(changePasswordAction, null);
  return (
    <form action={action} className="space-y-3">
      <FormGrid>
        <Field label={t("currentPassword", lang)} required>
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label={t("newPassword", lang)} required>
          <Input name="newPassword" type="password" required autoComplete="new-password" />
        </Field>
      </FormGrid>
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm">{t("changePassword", lang)}</SubmitButton>
        <Feedback state={state} lang={lang} />
      </div>
    </form>
  );
}
