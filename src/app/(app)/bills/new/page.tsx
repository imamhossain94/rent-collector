import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { requireUser, userLang } from "@/lib/auth";
import { getBillTenantOptions } from "@/lib/queries";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { BillEditor } from "@/components/bill-editor";
import { createSingleBillAction } from "@/app/actions/bills";
import { currentMonth } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export default async function NewBillPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const lang = userLang(user);
  const options = await getBillTenantOptions(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={t("newBill", lang)}
        subtitle={pick(
          lang,
          "ভাড়া, বিদ্যুৎ, গ্যাস, পানি — প্রতিটি খাত এখানে বদলাতে ও নতুন খাত যোগ করতে পারবেন",
          "Rent, electricity, gas, water — edit every line or add new ones before issuing",
        )}
        icon={<ReceiptText className="size-4" />}
      />

      {options.length === 0 ? (
        <Card>
          <EmptyState
            title={pick(lang, "কোনো চলমান ভাড়াটিয়া নেই", "No active tenants")}
            action={
              <Link href="/tenants/new" className="btn btn-primary btn-sm">
                {t("addTenant", lang)}
              </Link>
            }
          />
        </Card>
      ) : (
        <BillEditor
          action={createSingleBillAction}
          tenants={options}
          lang={lang}
          defaultTenantId={sp.tenantId}
          defaultMonth={sp.month ?? currentMonth()}
        />
      )}
    </div>
  );
}
