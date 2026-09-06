import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Pencil,
  Phone,
  IdCard,
  CalendarDays,
  Bell,
  ReceiptText,
  DoorClosed,
  Zap,
  Printer,
} from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalance } from "@/lib/billing";
import {
  PageHeader,
  Card,
  CardHead,
  StatCard,
  TableWrap,
  EmptyState,
  Badge,
  Money,
  Field,
  Input,
} from "@/components/ui";
import { Modal, SubmitButton, ConfirmButton } from "@/components/client-bits";
import { CollectForm } from "@/components/collect-form";
import { recordPaymentAction } from "@/app/actions/payments";
import { remindOneAction } from "@/app/actions/misc";
import { moveOutTenantAction } from "@/app/actions/tenants";
import { money, num, formatDate, monthLabel, initials, toDateInput } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import {
  label,
  tone,
  TENANT_STATUS,
  BILL_STATUS,
  PAYMENT_METHODS,
  ELECTRICITY_MODES,
  type Lang,
} from "@/lib/constants";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const tenant = await prisma.tenant.findFirst({
    where: { id, ownerId: user.id },
    include: {
      unit: { include: { property: true } },
      bills: { orderBy: { billingMonth: "desc" }, include: { items: true } },
      payments: { orderBy: { paidAt: "desc" } },
      readings: { orderBy: { billingMonth: "desc" }, take: 12 },
    },
  });
  if (!tenant) notFound();

  const balance = await tenantBalance(tenant.id);

  type Entry = {
    date: Date;
    kind: "BILL" | "PAYMENT" | "OPENING";
    label: string;
    href?: string;
    debit: number;
    credit: number;
  };

  const entries: Entry[] = [
    ...(tenant.openingDue
      ? [
          {
            date: tenant.moveInDate,
            kind: "OPENING" as const,
            label: pick(lang, "পুরোনো খাতার বকেয়া", "Opening due (from paper khata)"),
            debit: tenant.openingDue,
            credit: 0,
          },
        ]
      : []),
    ...tenant.bills
      .filter((b) => b.status !== "VOID")
      .map((b) => ({
        date: b.issueDate,
        kind: "BILL" as const,
        label: `${monthLabel(b.billingMonth, lang)} · ${b.billNo}`,
        href: `/bills/${b.id}`,
        debit: b.total,
        credit: 0,
      })),
    ...tenant.payments.map((p) => ({
      date: p.paidAt,
      kind: "PAYMENT" as const,
      label: `${label(PAYMENT_METHODS, p.method, lang)} · ${p.receiptNo}`,
      href: `/payments/${p.id}`,
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const ledger = entries.map((e) => {
    running = running + e.debit - e.credit;
    return { ...e, running };
  });
  ledger.reverse();

  const paidTotal = tenant.payments.reduce((acc, p) => acc + p.amount, 0);
  const billedTotal = tenant.bills.filter((b) => b.status !== "VOID").reduce((acc, b) => acc + b.total, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={tenant.name}
        subtitle={
          tenant.unit
            ? `${tenant.unit.property.name} · ${tenant.unit.name}`
            : pick(lang, "কোনো ইউনিটে নেই", "Not assigned to a unit")
        }
        icon={<Users className="size-4" />}
        actions={
          <>
            <Badge tone={tone(TENANT_STATUS, tenant.status)}>{label(TENANT_STATUS, tenant.status, lang)}</Badge>
            {balance > 0 ? (
              <form action={remindOneAction}>
                <input type="hidden" name="tenantId" value={tenant.id} />
                <SubmitButton className="btn btn-outline btn-sm">
                  <Bell className="size-4" />
                  {t("dueReminder", lang)}
                </SubmitButton>
              </form>
            ) : null}
            <Link href={`/bills/new?tenantId=${tenant.id}`} className="btn btn-outline btn-sm">
              <ReceiptText className="size-4" />
              {t("newBill", lang)}
            </Link>
            <Link href={`/tenants/${tenant.id}/edit`} className="btn btn-outline btn-sm">
              <Pencil className="size-4" />
              {t("edit", lang)}
            </Link>
            <Modal
              title={t("collectPayment", lang)}
              description={`${tenant.name} — ${money(Math.max(0, balance), lang)} ${t("due", lang)}`}
              trigger={<button className="btn btn-primary btn-sm">{t("collect", lang)}</button>}
            >
              <CollectForm
                action={recordPaymentAction}
                lang={lang}
                tenantId={tenant.id}
                defaultAmount={Math.max(0, balance)}
              />
            </Modal>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("rent", lang)} value={money(tenant.rentAmount, lang)} hint={t("perMonth", lang)} />
        <StatCard
          label={t("balance", lang)}
          value={money(Math.abs(balance), lang)}
          tone={balance > 0 ? "destructive" : "success"}
          hint={balance > 0 ? t("due", lang) : pick(lang, "অগ্রিম জমা আছে", "in advance")}
        />
        <StatCard label={t("advance", lang)} value={money(tenant.advanceAmount, lang)} tone="warning" hint={pick(lang, "ফেরতযোগ্য", "refundable")} />
        <StatCard
          label={t("paid", lang)}
          value={money(paidTotal, lang)}
          tone="success"
          hint={`${t("billed", lang)} ${money(billedTotal, lang)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHead title={pick(lang, "পরিচয়", "Profile")} />
          <div className="space-y-2.5 text-xs">
            <Row icon={<Phone className="size-4" />} label={t("phone", lang)} value={tenant.phone} mono />
            {tenant.altPhone ? (
              <Row icon={<Phone className="size-4" />} label={pick(lang, "বিকল্প", "Alt")} value={tenant.altPhone} mono />
            ) : null}
            <Row icon={<IdCard className="size-4" />} label={t("nid", lang)} value={tenant.nid ?? "—"} mono />
            <Row
              icon={<CalendarDays className="size-4" />}
              label={t("moveIn", lang)}
              value={formatDate(tenant.moveInDate, lang)}
            />
            {tenant.agreementEnd ? (
              <Row
                icon={<CalendarDays className="size-4" />}
                label={t("agreement", lang)}
                value={`${formatDate(tenant.agreementStart, lang)} — ${formatDate(tenant.agreementEnd, lang)}`}
              />
            ) : null}
            <Row
              icon={<Users className="size-4" />}
              label={t("familyMembers", lang)}
              value={num(tenant.familyMembers, lang)}
            />
            {tenant.occupation ? (
              <Row icon={<IdCard className="size-4" />} label={t("occupation", lang)} value={tenant.occupation} />
            ) : null}
            {tenant.permanentAddress ? (
              <div className="rounded border border-border p-2.5">
                <p className="text-2xs muted">{t("permanentAddress", lang)}</p>
                <p className="mt-0.5">{tenant.permanentAddress}</p>
              </div>
            ) : null}
          </div>

          {tenant.status === "ACTIVE" ? (
            <div className="mt-4">
              <Modal
                title={t("moveOutTenant", lang)}
                description={pick(
                  lang,
                  "ইউনিট খালি হিসেবে চিহ্নিত হবে; হিসাব-নিকাশ থেকে যাবে।",
                  "The unit becomes vacant. The ledger stays intact.",
                )}
                trigger={
                  <button className="btn btn-outline btn-sm w-full">
                    <DoorClosed className="size-4" />
                    {t("moveOutTenant", lang)}
                  </button>
                }
              >
                <form action={moveOutTenantAction} className="space-y-3">
                  <input type="hidden" name="id" value={tenant.id} />
                  <Field label={t("moveOut", lang)}>
                    <Input name="moveOutDate" type="date" defaultValue={toDateInput(new Date())} />
                  </Field>
                  {balance > 0 ? (
                    <p className="rounded border border-[color-mix(in_oklab,var(--destructive)_35%,transparent)] bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] p-2.5 text-xs font-semibold text-[color:var(--destructive)]">
                      {pick(lang, "এখনো বকেয়া", "Still owes")} {money(balance, lang)} —{" "}
                      {pick(lang, "জামানত থেকে সমন্বয় করুন", "adjust against the deposit")}
                    </p>
                  ) : null}
                  <ConfirmButton message={pick(lang, "নিশ্চিত?", "Are you sure?")} className="btn btn-destructive w-full">
                    {t("moveOutTenant", lang)}
                  </ConfirmButton>
                </form>
              </Modal>
            </div>
          ) : null}
        </Card>

        <Card className="lg:col-span-2" pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={t("ledger", lang)}
              description={pick(
                lang,
                "বিল যোগ হয়, টাকা জমা দিলে বাদ যায় — নিচের সারি সবচেয়ে নতুন",
                "Bills add, payments subtract — newest first",
              )}
            />
          </div>
          {ledger.length === 0 ? (
            <EmptyState title={t("noData", lang)} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("date", lang)}</th>
                  <th>{pick(lang, "বিবরণ", "Description")}</th>
                  <th className="text-right">{pick(lang, "বিল", "Charge")}</th>
                  <th className="text-right">{pick(lang, "জমা", "Paid")}</th>
                  <th className="text-right">{t("balance", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, i) => (
                  <tr key={i}>
                    <td className="muted whitespace-nowrap">{formatDate(e.date, lang)}</td>
                    <td>
                      {e.href ? (
                        <Link href={e.href} className="font-semibold">
                          {e.label}
                        </Link>
                      ) : (
                        <span className="font-semibold">{e.label}</span>
                      )}
                    </td>
                    <td className="text-right">{e.debit ? money(e.debit, lang) : "—"}</td>
                    <td className="text-right text-[color:var(--success)]">
                      {e.credit ? money(e.credit, lang) : "—"}
                    </td>
                    <td className="text-right">
                      <Money
                        value={money(Math.abs(e.running), lang)}
                        tone={e.running > 0 ? "due" : e.running < 0 ? "paid" : "plain"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead title={t("billTitle", lang)} />
          </div>
          {tenant.bills.length === 0 ? (
            <EmptyState title={t("noData", lang)} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("month", lang)}</th>
                  <th>{t("billNo", lang)}</th>
                  <th className="text-right">{t("total", lang)}</th>
                  <th>{t("status", lang)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tenant.bills.slice(0, 12).map((b) => (
                  <tr key={b.id}>
                    <td className="font-semibold">{monthLabel(b.billingMonth, lang)}</td>
                    <td className="num muted">{b.billNo}</td>
                    <td className="text-right">
                      <Money value={money(b.total, lang)} />
                    </td>
                    <td>
                      <Badge tone={tone(BILL_STATUS, b.status)}>{label(BILL_STATUS, b.status, lang)}</Badge>
                    </td>
                    <td className="text-right">
                      <Link href={`/bills/${b.id}/print`} className="btn btn-ghost btn-icon-sm" title={t("print", lang)}>
                        <Printer className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={t("meterTitle", lang)}
              description={`${label(ELECTRICITY_MODES, tenant.electricityMode, lang)} · ${money(
                tenant.electricityRate,
                lang,
              )}/${pick(lang, "ইউনিট", "unit")}`}
            />
          </div>
          {tenant.readings.length === 0 ? (
            <EmptyState
              icon={<Zap className="size-5" />}
              title={pick(lang, "কোনো রিডিং নেই", "No readings yet")}
              description={pick(lang, "মিটার রিডিং পাতায় গিয়ে লিখুন।", "Add them from the meter readings page.")}
              action={
                <Link href="/utilities" className="btn btn-outline btn-sm">
                  {t("meterTitle", lang)}
                </Link>
              }
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("month", lang)}</th>
                  <th className="text-right">{t("previousReading", lang)}</th>
                  <th className="text-right">{t("currentReading", lang)}</th>
                  <th className="text-right">{t("unitsUsed", lang)}</th>
                  <th className="text-right">{t("amount", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {tenant.readings.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{monthLabel(r.billingMonth, lang)}</td>
                    <td className="num text-right muted">{num(r.previous, lang)}</td>
                    <td className="num text-right">{num(r.current, lang)}</td>
                    <td className="num text-right font-bold">{num(r.units, lang)}</td>
                    <td className="text-right">
                      <Money value={money(r.amount, lang)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon,
  label: rowLabel,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 muted">
        {icon}
        {rowLabel}
      </span>
      <span className={mono ? "num font-semibold" : "font-semibold"}>{value}</span>
    </div>
  );
}
