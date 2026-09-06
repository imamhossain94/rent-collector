import Link from "next/link";
import { HandCoins, Plus, Printer } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenants } from "@/lib/queries";
import { tenantBalances } from "@/lib/billing";
import { PageHeader, Card, CardHead, TableWrap, EmptyState, StatCard, Money } from "@/components/ui";
import { FilterSelect, Modal, ConfirmButton } from "@/components/client-bits";
import { CollectForm } from "@/components/collect-form";
import { recordPaymentAction, deletePaymentAction } from "@/app/actions/payments";
import { money, num, formatDate, currentMonth, lastMonths, monthLabel, monthRange } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, PAYMENT_METHODS, PAYMENT_METHOD_COLOR, type Lang } from "@/lib/constants";
import { sum } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; method?: string; collect?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.month ?? currentMonth();
  const method = sp.method ?? "";
  const { start, end } = monthRange(month);

  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [payments, tenants] = await Promise.all([
    prisma.payment.findMany({
      where: {
        ownerId: user.id,
        paidAt: { gte: start, lte: end },
        ...(method ? { method } : {}),
      },
      orderBy: { paidAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true, unit: { select: { name: true, property: { select: { name: true } } } } } },
        bill: { select: { id: true, billNo: true, billingMonth: true } },
      },
    }),
    getActiveTenants(user.id),
  ]);

  const balances = await tenantBalances(tenants.map((x) => x.id));
  const tenantOptions = tenants.map((tn) => ({
    id: tn.id,
    name: tn.name,
    unitName: tn.unit ? `${tn.unit.property.name} · ${tn.unit.name}` : null,
    balance: balances.get(tn.id) ?? 0,
  }));

  const total = sum(payments, (p) => p.amount);
  const byMethod = PAYMENT_METHODS.map((m) => ({
    ...m,
    total: sum(payments.filter((p) => p.method === m.value), (p) => p.amount),
  })).filter((m) => m.total > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("payTitle", lang)}
        subtitle={t("paySubtitle", lang)}
        icon={<HandCoins className="size-4" />}
        actions={
          <Modal
            title={t("collectPayment", lang)}
            description={pick(lang, "টাকা নিয়ে সাথে সাথে রসিদ দিন", "Take the money and hand over a receipt")}
            trigger={
              <button className="btn btn-primary btn-sm">
                <Plus className="size-4" />
                {t("collectPayment", lang)}
              </button>
            }
          >
            <CollectForm action={recordPaymentAction} lang={lang} tenants={tenantOptions} />
          </Modal>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("collected", lang)}
          value={money(total, lang)}
          tone="success"
          hint={`${num(payments.length, lang)} ${pick(lang, "টি রসিদ", "receipts")}`}
        />
        {byMethod.slice(0, 3).map((m) => (
          <div key={m.value} className="card card-pad">
            <span className="text-2xs font-bold uppercase tracking-wider muted">
              {lang === "bn" ? m.bn : m.en}
            </span>
            <p className="num mt-2 text-xl font-extrabold" style={{ color: PAYMENT_METHOD_COLOR[m.value] }}>
              {money(m.total, lang)}
            </p>
          </div>
        ))}
      </div>

      <Card pad={false}>
        <div className="card-pad flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHead title={monthLabel(month, lang)} className="mb-0" />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              paramName="month"
              value={month}
              options={lastMonths(12).reverse().map((m) => ({ value: m, label: monthLabel(m, lang) }))}
            />
            <FilterSelect
              paramName="method"
              value={method}
              options={[
                { value: "", label: t("all", lang) },
                ...PAYMENT_METHODS.map((m) => ({ value: m.value, label: lang === "bn" ? m.bn : m.en })),
              ]}
            />
          </div>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="size-5" />}
            title={pick(lang, "এই মাসে কোনো আদায় নেই", "Nothing collected this month")}
            description={pick(lang, "ভাড়া নিলে এখানে রসিদসহ জমা হবে।", "Every taka you take shows up here with a receipt.")}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("receiptNo", lang)}</th>
                <th>{t("receivedFrom", lang)}</th>
                <th>{t("billNo", lang)}</th>
                <th>{t("method", lang)}</th>
                <th>{t("date", lang)}</th>
                <th className="text-right">{t("amount", lang)}</th>
                <th className="text-right">{t("actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="code">
                    <Link href={`/payments/${p.id}`} className="font-bold">
                      {p.receiptNo}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/tenants/${p.tenant.id}`} className="font-semibold">
                      {p.tenant.name}
                    </Link>
                    <span className="block text-2xs muted">
                      {p.tenant.unit ? `${p.tenant.unit.property.name} · ${p.tenant.unit.name}` : "—"}
                    </span>
                  </td>
                  <td className="code muted">
                    {p.bill ? (
                      <Link href={`/bills/${p.bill.id}`}>{p.bill.billNo}</Link>
                    ) : (
                      pick(lang, "সাধারণ জমা", "on account")
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: PAYMENT_METHOD_COLOR[p.method],
                        borderColor: `color-mix(in oklab, ${PAYMENT_METHOD_COLOR[p.method]} 40%, transparent)`,
                        background: `color-mix(in oklab, ${PAYMENT_METHOD_COLOR[p.method]} 12%, transparent)`,
                      }}
                    >
                      {label(PAYMENT_METHODS, p.method, lang)}
                    </span>
                    {p.txnRef ? <span className="num block text-2xs muted">{p.txnRef}</span> : null}
                  </td>
                  <td className="muted whitespace-nowrap">{formatDate(p.paidAt, lang)}</td>
                  <td className="text-right">
                    <Money value={money(p.amount, lang)} tone="paid" />
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/payments/${p.id}`} className="btn btn-ghost btn-icon-sm" title={t("moneyReceipt", lang)}>
                        <Printer className="size-4" />
                      </Link>
                      <form action={deletePaymentAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton message={t("confirmDelete", lang)}>✕</ConfirmButton>
                      </form>
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
