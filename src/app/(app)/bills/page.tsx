import Link from "next/link";
import { ReceiptText, Plus, Printer, CheckCircle2, Zap } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHead, TableWrap, EmptyState, Badge, StatCard, Money } from "@/components/ui";
import { FilterSelect, Modal } from "@/components/client-bits";
import { CollectForm } from "@/components/collect-form";
import { recordPaymentAction } from "@/app/actions/payments";
import { money, num, currentMonth, monthLabel, lastMonths, formatDate } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, BILL_STATUS, type Lang } from "@/lib/constants";
import { sum } from "@/lib/utils";

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; property?: string; created?: string; skipped?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.month ?? currentMonth();
  const status = sp.status ?? "";
  const propertyId = sp.property ?? "";

  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [bills, properties] = await Promise.all([
    prisma.bill.findMany({
      where: {
        ownerId: user.id,
        billingMonth: month,
        ...(status ? { status } : {}),
        ...(propertyId ? { propertyId } : {}),
      },
      orderBy: [{ status: "asc" }, { billNo: "asc" }],
      include: {
        tenant: { select: { id: true, name: true, phone: true } },
        unit: { select: { name: true } },
        property: { select: { id: true, name: true } },
      },
    }),
    prisma.property.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } }),
  ]);

  const active = bills.filter((b) => b.status !== "VOID");
  const billed = sum(active, (b) => b.total);
  const collected = sum(active, (b) => b.paidAmount);
  const months = lastMonths(12).reverse();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("billTitle", lang)}
        subtitle={t("billSubtitle", lang)}
        icon={<ReceiptText className="size-4" />}
        actions={
          <>
            <Link href="/bills/new" className="btn btn-outline btn-sm">
              <Plus className="size-4" />
              {t("newBill", lang)}
            </Link>
            <Link href={`/bills/generate?month=${month}`} className="btn btn-primary btn-sm">
              <Zap className="size-4" />
              {t("generateBills", lang)}
            </Link>
          </>
        }
      />

      {sp.created ? (
        <div className="flex items-center gap-2 rounded border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[color:var(--success)]">
          <CheckCircle2 className="size-4" />
          {pick(lang, "তৈরি হয়েছে", "Created")} {num(Number(sp.created), lang)} ·{" "}
          {pick(lang, "আগে থেকেই ছিল", "already existed")} {num(Number(sp.skipped ?? 0), lang)}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("billed", lang)} value={money(billed, lang)} hint={`${num(active.length, lang)} ${pick(lang, "টি বিল", "bills")}`} />
        <StatCard label={t("collected", lang)} value={money(collected, lang)} tone="success" />
        <StatCard label={t("due", lang)} value={money(billed - collected, lang)} tone="destructive" />
        <StatCard
          label={pick(lang, "পরিশোধিত বিল", "Bills settled")}
          value={`${num(active.filter((b) => b.status === "PAID").length, lang)}/${num(active.length, lang)}`}
          tone="primary"
        />
      </div>

      <Card pad={false}>
        <div className="card-pad flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHead title={monthLabel(month, lang)} className="mb-0" />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              paramName="month"
              value={month}
              options={months.map((m) => ({ value: m, label: monthLabel(m, lang) }))}
            />
            <FilterSelect
              paramName="status"
              value={status}
              options={[
                { value: "", label: t("all", lang) },
                ...BILL_STATUS.map((s) => ({ value: s.value, label: lang === "bn" ? s.bn : s.en })),
              ]}
            />
            <FilterSelect
              paramName="property"
              value={propertyId}
              options={[
                { value: "", label: pick(lang, "সব সম্পত্তি", "All properties") },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        {bills.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="size-5" />}
            title={pick(lang, "এই মাসের কোনো বিল নেই", "No bills for this month")}
            description={pick(
              lang,
              "এক ক্লিকে সব চলমান ভাড়াটিয়ার বিল তৈরি করুন।",
              "Generate bills for every active tenant in one click.",
            )}
            action={
              <Link href={`/bills/generate?month=${month}`} className="btn btn-primary btn-sm">
                <Zap className="size-4" />
                {t("generateBills", lang)}
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("billNo", lang)}</th>
                <th>{t("tenantName", lang)}</th>
                <th>{t("unitAssign", lang)}</th>
                <th className="text-right">{t("total", lang)}</th>
                <th className="text-right">{t("previousDue", lang)}</th>
                <th className="text-right">{t("paid", lang)}</th>
                <th>{t("dueDate", lang)}</th>
                <th>{t("status", lang)}</th>
                <th className="text-right">{t("actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="code">
                    <Link href={`/bills/${b.id}`} className="font-bold">
                      {b.billNo}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/tenants/${b.tenant.id}`} className="font-semibold">
                      {b.tenant.name}
                    </Link>
                  </td>
                  <td className="muted">
                    {b.property.name}
                    {b.unit ? ` · ${b.unit.name}` : ""}
                  </td>
                  <td className="text-right">
                    <Money value={money(b.total, lang)} />
                  </td>
                  <td className="text-right muted">{b.previousDue ? money(b.previousDue, lang) : "—"}</td>
                  <td className="text-right">
                    <Money value={money(b.paidAmount, lang)} tone={b.paidAmount > 0 ? "paid" : "plain"} />
                  </td>
                  <td className="muted whitespace-nowrap">{formatDate(b.dueDate, lang)}</td>
                  <td>
                    <Badge tone={tone(BILL_STATUS, b.status)}>{label(BILL_STATUS, b.status, lang)}</Badge>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/bills/${b.id}/print`} className="btn btn-ghost btn-icon-sm" title={t("print", lang)}>
                        <Printer className="size-4" />
                      </Link>
                      {b.status !== "PAID" && b.status !== "VOID" ? (
                        <Modal
                          title={t("collectPayment", lang)}
                          description={`${b.tenant.name} · ${b.billNo}`}
                          trigger={<button className="btn btn-outline btn-sm">{t("collect", lang)}</button>}
                        >
                          <CollectForm
                            action={recordPaymentAction}
                            lang={lang}
                            tenantId={b.tenantId}
                            billId={b.id}
                            defaultAmount={b.total - b.paidAmount + b.previousDue}
                          />
                        </Modal>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
