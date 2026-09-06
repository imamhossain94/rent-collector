import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser, userLang } from "@/lib/auth";
import { getUnitOptions } from "@/lib/queries";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { TenantForm } from "@/components/tenant-form";
import { createTenantAction } from "@/app/actions/tenants";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
  const { unitId } = await searchParams;
  const user = await requireUser();
  const lang = userLang(user);
  const units = await getUnitOptions(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={t("addTenant", lang)} subtitle={t("tenantSubtitle", lang)} icon={<Users className="size-4" />} />
      {units.length === 0 ? (
        <Card>
          <EmptyState
            title={pick(lang, "আগে একটি ইউনিট তৈরি করুন", "Create a unit first")}
            description={pick(
              lang,
              "ভাড়াটিয়া কোন ফ্ল্যাট বা দোকানে থাকবে সেটি আগে যোগ করতে হবে।",
              "A tenant needs a flat or shop to move into.",
            )}
            action={
              <Link href="/properties" className="btn btn-primary btn-sm">
                {t("navProperties", lang)}
              </Link>
            }
          />
        </Card>
      ) : (
        <TenantForm action={createTenantAction} units={units} lang={lang} defaultUnitId={unitId} />
      )}
    </div>
  );
}
