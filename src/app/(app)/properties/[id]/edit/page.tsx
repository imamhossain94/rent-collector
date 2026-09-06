import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { PropertyForm } from "@/components/property-form";
import { updatePropertyAction, deletePropertyAction } from "@/app/actions/properties";
import { pick, t } from "@/lib/i18n";
import { ConfirmButton } from "@/components/client-bits";
import type { Lang } from "@/lib/constants";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const property = await prisma.property.findFirst({ where: { id, ownerId: user.id } });
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={`${t("edit", lang)} — ${property.name}`}
        subtitle={t("propSubtitle", lang)}
        icon={<Building2 className="size-4" />}
      />
      <PropertyForm action={updatePropertyAction} property={property} lang={lang} />

      <div className="card card-pad border-[color-mix(in_oklab,var(--destructive)_35%,transparent)]">
        <p className="text-xs font-bold text-[color:var(--destructive)]">{t("dangerZone", lang)}</p>
        <p className="mt-1 text-xs muted">
          {pick(
            lang,
            "সম্পত্তি মুছলে এর সব ইউনিট, বিল ও খরচের হিসাবও মুছে যাবে।",
            "Deleting a property also deletes its units, bills and expense history.",
          )}
        </p>
        <form action={deletePropertyAction} className="mt-2">
          <input type="hidden" name="id" value={property.id} />
          <ConfirmButton message={t("confirmDelete", lang)} className="btn btn-destructive btn-sm">
            {t("delete", lang)}
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
