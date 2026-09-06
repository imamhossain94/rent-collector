import { Building2 } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PropertyForm } from "@/components/property-form";
import { createPropertyAction } from "@/app/actions/properties";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export default async function NewPropertyPage() {
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t("addProperty", lang)} subtitle={t("propSubtitle", lang)} icon={<Building2 className="size-4" />} />
      <PropertyForm action={createPropertyAction} lang={lang} />
    </div>
  );
}
