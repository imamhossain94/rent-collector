import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUnitOptions } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TenantForm } from "@/components/tenant-form";
import { updateTenantAction, deleteTenantAction } from "@/app/actions/tenants";
import { ConfirmButton } from "@/components/client-bits";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [tenant, units] = await Promise.all([
    prisma.tenant.findFirst({ where: { id, ownerId: user.id } }),
    getUnitOptions(user.id),
  ]);
  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={`${t("edit", lang)} — ${tenant.name}`} icon={<Users className="size-4" />} />
      <TenantForm action={updateTenantAction} tenant={tenant} units={units} lang={lang} />

      <div className="card card-pad border-[color-mix(in_oklab,var(--destructive)_35%,transparent)]">
        <p className="text-xs font-bold text-[color:var(--destructive)]">{t("dangerZone", lang)}</p>
        <p className="mt-1 text-xs muted">
          {pick(
            lang,
            "ভাড়াটিয়া মুছলে তার সব বিল, রসিদ ও মিটার রিডিং মুছে যাবে। ছেড়ে দিলে 'চলে গেছে' অবস্থা ব্যবহার করুন।",
            "Deleting removes every bill, receipt and meter reading. Prefer marking them as moved out.",
          )}
        </p>
        <form action={deleteTenantAction} className="mt-2">
          <input type="hidden" name="id" value={tenant.id} />
          <ConfirmButton message={t("confirmDelete", lang)} className="btn btn-destructive btn-sm">
            {t("delete", lang)}
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
