import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptText, Printer, MessageSquare, Ban, Pencil, ListPlus } from "lucide-react";
import { requireUser, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalance, payableOf } from "@/lib/billing";
import {
  PageHeader,
  Card,
  CardHead,
  TableWrap,
  Badge,
  StatCard,
  Money,
  Field,
  FormGrid,
  Input,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { Modal, SubmitButton, ConfirmButton } from "@/components/client-bits";
import { CollectForm } from "@/components/collect-form";
import { recordPaymentAction } from "@/app/actions/payments";
import { updateBillAction, voidBillAction, deleteBillAction } from "@/app/actions/bills";
import { sendBillNoticeAction } from "@/app/actions/misc";
import { money, num, formatDate, monthLabel, toDateInput, amountInWords } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, BILL_STATUS, BILL_ITEM_TYPES, PAYMENT_METHODS, type Lang } from "@/lib/constants";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = userLang(user);

  const bill = await prisma.bill.findFirst({
    where: { id, ownerId: user.id },
    include: {
      tenant: true,
      unit: true,
      property: true,
      items: true,
      payments: { orderBy: { paidAt: "desc" } },
      readings: true,
    },
  });
  if (!bill) notFound();

  const balance = await tenantBalance(bill.tenantId);
  const payable = payableOf(bill);
  const remaining = Math.max(0, bill.total - bill.paidAmount);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${bill.billNo}`}
        subtitle={`${bill.tenant.name} · ${bill.property.name}${bill.unit ? ` · ${bill.unit.name}` : ""} · ${monthLabel(
          bill.billingMonth,
          lang,
        )}`}
        icon={<ReceiptText className="size-4" />}
        actions={
          <>
            <Badge tone={tone(BILL_STATUS, bill.status)}>{label(BILL_STATUS, bill.status, lang)}</Badge>
            <form action={sendBillNoticeAction}>
              <input type="hidden" name="billId" value={bill.id} />
              <SubmitButton className="btn btn-outline btn-sm">
                <MessageSquare className="size-4" />
                {pick(lang, "এসএমএস", "SMS")}
              </SubmitButton>
            </form>
            <Link href={`/bills/${bill.id}/edit`} className="btn btn-outline btn-sm">
              <ListPlus className="size-4" />
              {pick(lang, "খাত সম্পাদনা", "Edit lines")}
            </Link>
            <Link href={`/bills/${bill.id}/print`} className="btn btn-outline btn-sm">
              <Printer className="size-4" />
              {t("print", lang)}
            </Link>
            {bill.status !== "PAID" && bill.status !== "VOID" ? (
              <Modal
                title={t("collectPayment", lang)}
                description={`${bill.tenant.name} · ${bill.billNo}`}
                trigger={<button className="btn btn-primary btn-sm">{t("collect", lang)}</button>}
              >
                <CollectForm
                  action={recordPaymentAction}
                  lang={lang}
                  tenantId={bill.tenantId}
                  billId={bill.id}
                  defaultAmount={payable - bill.paidAmount}
                />
              </Modal>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={pick(lang, "এ মাসের বিল", "This month's charges")} value={money(bill.total, lang)} />
        <StatCard label={t("previousDue", lang)} value={money(bill.previousDue, lang)} tone="warning" />
        <StatCard
          label={pick(lang, "মোট প্রদেয়", "Total payable")}
          value={money(payable, lang)}
          tone="primary"
          hint={amountInWords(payable, lang)}
        />
        <StatCard
          label={t("balance", lang)}
          value={money(Math.abs(balance), lang)}
          tone={balance > 0 ? "destructive" : "success"}
          hint={pick(lang, "ভাড়াটিয়ার মোট হিসাব", "tenant's overall ledger")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={t("billItems", lang)}
              description={`${t("issueDate", lang)} ${formatDate(bill.issueDate, lang)} · ${t("dueDate", lang)} ${formatDate(
                bill.dueDate,
                lang,
              )}`}
            />
          </div>
          <TableWrap>
            <thead>
              <tr>
                <th>{pick(lang, "খাত", "Item")}</th>
                <th className="text-right">{pick(lang, "পরিমাণ", "Qty")}</th>
                <th className="text-right">{t("rate", lang)}</th>
                <th className="text-right">{t("amount", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="font-semibold">{label(BILL_ITEM_TYPES, item.type, lang)}</span>
                    {item.meta ? <span className="num block text-2xs muted">{item.meta}</span> : null}
                  </td>
                  <td className="num text-right muted">{num(item.qty, lang)}</td>
                  <td className="num text-right muted">{money(item.rate, lang)}</td>
                  <td className="text-right">
                    <Money value={money(item.amount, lang)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <div className="card-pad space-y-1.5 border-t border-border text-xs">
            <Line label={pick(lang, "উপমোট", "Subtotal")} value={money(bill.subtotal, lang)} />
            {bill.lateFee ? <Line label={t("lateFee", lang)} value={money(bill.lateFee, lang)} /> : null}
            {bill.discount ? <Line label={t("discount", lang)} value={`- ${money(bill.discount, lang)}`} /> : null}
            {bill.advanceAdjust ? (
              <Line
                label={pick(lang, "অগ্রিম সমন্বয়", "Advance adjustment")}
                value={`- ${money(bill.advanceAdjust, lang)}`}
              />
            ) : null}
            <Line label={pick(lang, "এ মাসের মোট", "Month total")} value={money(bill.total, lang)} strong />
            {bill.previousDue ? <Line label={t("previousDue", lang)} value={money(bill.previousDue, lang)} /> : null}
            <div className="divider my-1.5" />
            <Line label={t("grandTotal", lang)} value={money(payable, lang)} strong big />
            <Line label={t("paid", lang)} value={money(bill.paidAmount, lang)} />
            <Line label={t("balance", lang)} value={money(remaining, lang)} strong />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHead title={pick(lang, "এই বিলের আদায়", "Payments on this bill")} />
            {bill.payments.length === 0 ? (
              <p className="text-xs muted">{t("noData", lang)}</p>
            ) : (
              <div className="space-y-2">
                {bill.payments.map((p) => (
                  <Link
                    key={p.id}
                    href={`/payments/${p.id}`}
                    className="flex items-center justify-between rounded border border-border p-2.5 text-xs hover:border-[color-mix(in_oklab,var(--primary)_45%,transparent)]"
                  >
                    <span>
                      <span className="num block font-bold">{p.receiptNo}</span>
                      <span className="block text-2xs muted">
                        {formatDate(p.paidAt, lang)} · {label(PAYMENT_METHODS, p.method, lang)}
                      </span>
                    </span>
                    <Money value={money(p.amount, lang)} tone="paid" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHead title={pick(lang, "বিল সমন্বয়", "Adjust bill")} />
            <form action={updateBillAction} className="space-y-3">
              <input type="hidden" name="id" value={bill.id} />
              <FormGrid>
                <Field label={t("discount", lang)}>
                  <Input name="discount" type="number" step="1" defaultValue={bill.discount} />
                </Field>
                <Field label={t("lateFee", lang)}>
                  <Input name="lateFee" type="number" step="1" defaultValue={bill.lateFee} />
                </Field>
                <Field label={pick(lang, "অগ্রিম সমন্বয়", "Advance adjustment")} className="sm:col-span-2">
                  <Input name="advanceAdjust" type="number" step="1" defaultValue={bill.advanceAdjust} />
                </Field>
                <Field label={t("dueDate", lang)} className="sm:col-span-2">
                  <Input name="dueDate" type="date" defaultValue={toDateInput(bill.dueDate)} />
                </Field>
                <Field label={t("note", lang)} className="sm:col-span-2">
                  <Textarea name="note" rows={2} defaultValue={bill.note ?? ""} />
                </Field>
              </FormGrid>
              <SubmitButton className="btn btn-primary btn-sm w-full">
                <Pencil className="size-4" />
                {t("saveChanges", lang)}
              </SubmitButton>
            </form>

            <div className="divider my-3" />
            <div className="flex flex-wrap gap-2">
              <form action={voidBillAction}>
                <input type="hidden" name="id" value={bill.id} />
                <SubmitButton className="btn btn-outline btn-sm">
                  <Ban className="size-4" />
                  {bill.status === "VOID" ? pick(lang, "সচল করুন", "Un-void") : pick(lang, "বাতিল করুন", "Void")}
                </SubmitButton>
              </form>
              <form action={deleteBillAction}>
                <input type="hidden" name="id" value={bill.id} />
                <ConfirmButton message={t("confirmDelete", lang)} className="btn btn-destructive btn-sm">
                  {t("delete", lang)}
                </ConfirmButton>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {bill.readings.length > 0 ? (
        <Card>
          <CardHead title={t("meterTitle", lang)} />
          <div className="grid gap-3 sm:grid-cols-4">
            {bill.readings.map((r) => (
              <div key={r.id} className="rounded border border-border p-3 text-xs">
                <p className="muted">{monthLabel(r.billingMonth, lang)}</p>
                <p className="num mt-1 font-bold">
                  {num(r.previous, lang)} → {num(r.current, lang)}
                </p>
                <p className="num text-xs muted">
                  {num(r.units, lang)} {pick(lang, "ইউনিট", "unit")} × {money(r.rate, lang)} = {money(r.amount, lang)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {bill.note ? (
        <Card>
          <CardHead title={t("note", lang)} />
          <p className="text-xs">{bill.note}</p>
        </Card>
      ) : null}

      {bill.status === "VOID" ? (
        <Card className="border-[color-mix(in_oklab,var(--destructive)_35%,transparent)]">
          <EmptyState
            title={pick(lang, "এই বিলটি বাতিল করা হয়েছে", "This bill is void")}
            description={pick(lang, "হিসাবের কোথাও এটি ধরা হবে না।", "It is excluded from every total.")}
          />
        </Card>
      ) : null}
    </div>
  );
}

function Line({
  label: rowLabel,
  value,
  strong,
  big,
}: {
  label: string;
  value: string;
  strong?: boolean;
  big?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${big ? "text-sm" : ""}`}>
      <span className={strong ? "font-bold" : "muted"}>{rowLabel}</span>
      <span className={`num ${strong ? "font-extrabold" : "font-semibold"} ${big ? "text-[color:var(--primary)]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
