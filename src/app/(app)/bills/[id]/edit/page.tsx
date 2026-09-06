import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { requireUser, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillTenantOptions } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { BillEditor } from "@/components/bill-editor";
import { updateBillItemsAction } from "@/app/actions/bills";
import { monthLabel } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = userLang(user);

  const bill = await prisma.bill.findFirst({
    where: { id, ownerId: user.id },
    include: { items: true, tenant: true, readings: { where: { type: "ELECTRICITY" } } },
  });
  if (!bill) notFound();

  const options = await getBillTenantOptions(user.id);
  const reading = bill.readings[0];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={`${t("edit", lang)} — ${bill.billNo}`}
        subtitle={`${bill.tenant.name} · ${monthLabel(bill.billingMonth, lang)} · ${pick(
          lang,
          "খাত, টাকা ও বিদ্যুৎ বদলান",
          "change lines, amounts and electricity",
        )}`}
        icon={<ReceiptText className="size-4" />}
      />
      <BillEditor
        action={updateBillItemsAction}
        tenants={options}
        lang={lang}
        defaultTenantId={bill.tenantId}
        defaultMonth={bill.billingMonth}
        bill={{
          id: bill.id,
          billNo: bill.billNo,
          billingMonth: bill.billingMonth,
          dueDate: bill.dueDate,
          previousDue: bill.previousDue,
          discount: bill.discount,
          advanceAdjust: bill.advanceAdjust,
          lateFee: bill.lateFee,
          note: bill.note,
          items: bill.items.map((i) => ({ type: i.type, label: i.label, amount: i.amount })),
          reading: reading ? { previous: reading.previous, current: reading.current, rate: reading.rate } : null,
        }}
      />
    </div>
  );
}
