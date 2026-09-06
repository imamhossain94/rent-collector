import Link from "next/link";
import { Zap, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenants, getPropertyOptions } from "@/lib/queries";
import { buildBillItems, tenantBalances, dueDateFor, type TenantForBilling } from "@/lib/billing";
import { PageHeader, Card, CardHead, TableWrap, EmptyState, Badge, StatCard, Money } from "@/components/ui";
import { FilterSelect, SubmitButton } from "@/components/client-bits";
import { generateMonthlyBillsAction } from "@/app/actions/bills";
import { currentMonth, lastMonths, monthLabel, money, num, formatDate } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";
import { sum } from "@/lib/utils";

export default async function GenerateBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.month ?? currentMonth();
  const propertyId = sp.property ?? "";

  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [tenants, properties] = await Promise.all([
    getActiveTenants(user.id, propertyId || null),
    getPropertyOptions(user.id),
  ]);

  const [existing, readings, balances] = await Promise.all([
    prisma.bill.findMany({
      where: { ownerId: user.id, billingMonth: month },
      select: { tenantId: true, billNo: true, id: true },
    }),
    prisma.meterReading.findMany({
      where: { billingMonth: month, type: "ELECTRICITY", tenantId: { in: tenants.map((x) => x.id) } },
    }),
    tenantBalances(tenants.map((x) => x.id)),
  ]);

  const existingByTenant = new Map(existing.map((b) => [b.tenantId, b]));
  const readingByTenant = new Map(readings.map((r) => [r.tenantId, r]));

  const rows = tenants.map((tenant) => {
    const reading = readingByTenant.get(tenant.id);
    const { items, subtotal } = buildBillItems(tenant as unknown as TenantForBilling, {
      electricity: reading ? { previous: reading.previous, current: reading.current, rate: reading.rate } : null,
    });
    const previousDue = balances.get(tenant.id) ?? 0;
    return {
      tenant,
      items,
      subtotal,
      previousDue,
      reading,
      needsReading: tenant.electricityMode === "SUBMETER" && !reading,
      already: existingByTenant.get(tenant.id) ?? null,
      dueDate: tenant.unit ? dueDateFor(month, tenant.unit.property.dueDay) : null,
    };
  });

  const pending = rows.filter((r) => !r.already);
  const missingReadings = rows.filter((r) => r.needsReading && !r.already);
  const months = lastMonths(6).concat(lastMonths(1, currentMonth(1))).reverse();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("generateBills", lang)}
        subtitle={pick(
          lang,
          "নিচের হিসাব দেখে নিন — বোতাম চাপলে প্রতিটি ভাড়াটিয়ার জন্য একটি করে বিল তৈরি হবে।",
          "Check the maths below — one press creates one bill per tenant.",
        )}
        icon={<Zap className="size-4" />}
        actions={
          <>
            <FilterSelect
              paramName="month"
              value={month}
              options={months.map((m) => ({ value: m, label: monthLabel(m, lang) }))}
            />
            <FilterSelect
              paramName="property"
              value={propertyId}
              options={[
                { value: "", label: pick(lang, "সব সম্পত্তি", "All properties") },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={pick(lang, "যাদের বিল হবে", "Bills to create")} value={num(pending.length, lang)} />
        <StatCard
          label={pick(lang, "মোট বিল হবে", "Total to be billed")}
          value={money(sum(pending, (r) => r.subtotal), lang)}
          tone="primary"
        />
        <StatCard
          label={t("previousDue", lang)}
          value={money(sum(pending, (r) => Math.max(0, r.previousDue)), lang)}
          tone="destructive"
          hint={pick(lang, "বিলে আলাদা করে দেখানো হবে", "shown separately on the bill")}
        />
        <StatCard
          label={pick(lang, "রিডিং বাকি", "Readings missing")}
          value={num(missingReadings.length, lang)}
          tone="warning"
          hint={pick(lang, "সাব-মিটার ভাড়াটিয়া", "sub-meter tenants")}
        />
      </div>

      {missingReadings.length > 0 ? (
        <Card className="border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold text-[color:var(--warning)]">
                <AlertTriangle className="size-4" />
                {pick(lang, "কিছু ভাড়াটিয়ার মিটার রিডিং দেওয়া হয়নি", "Some tenants have no meter reading yet")}
              </p>
              <p className="mt-1 text-xs muted">
                {pick(
                  lang,
                  "রিডিং ছাড়া বিদ্যুৎ বিল ছাড়াই বিল তৈরি হবে। আগে রিডিং দিন, পরে বিল করুন।",
                  "Without a reading the bill goes out with no electricity line. Enter readings first.",
                )}
              </p>
            </div>
            <Link href={`/utilities?month=${month}`} className="btn btn-outline btn-sm shrink-0">
              <Gauge className="size-4" />
              {t("meterTitle", lang)}
            </Link>
          </div>
        </Card>
      ) : null}

      <Card pad={false}>
        <div className="card-pad pb-2">
          <CardHead
            title={`${monthLabel(month, lang)} — ${pick(lang, "খসড়া বিল", "Draft bills")}`}
            description={pick(
              lang,
              "যাদের বিল আগেই তৈরি হয়েছে তারা বাদ পড়বে।",
              "Tenants that already have a bill for this month are skipped.",
            )}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={pick(lang, "কোনো চলমান ভাড়াটিয়া নেই", "No active tenants")}
            action={
              <Link href="/tenants/new" className="btn btn-primary btn-sm">
                {t("addTenant", lang)}
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("tenantName", lang)}</th>
                <th>{t("unitAssign", lang)}</th>
                <th className="text-right">{t("rent", lang)}</th>
                <th className="text-right">{pick(lang, "বিদ্যুৎ", "Electricity")}</th>
                <th className="text-right">{pick(lang, "অন্যান্য", "Other")}</th>
                <th className="text-right">{t("total", lang)}</th>
                <th className="text-right">{t("previousDue", lang)}</th>
                <th>{t("dueDate", lang)}</th>
                <th>{t("status", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rent = r.items.find((i) => i.type === "RENT")?.amount ?? 0;
                const elec = r.items.find((i) => i.type === "ELECTRICITY")?.amount ?? 0;
                const other = r.subtotal - rent - elec;
                return (
                  <tr key={r.tenant.id}>
                    <td className="font-bold">{r.tenant.name}</td>
                    <td className="muted">
                      {r.tenant.unit ? `${r.tenant.unit.property.name} · ${r.tenant.unit.name}` : "—"}
                    </td>
                    <td className="text-right">{money(rent, lang)}</td>
                    <td className="text-right">
                      {r.needsReading ? (
                        <span className="badge badge-warning">{pick(lang, "রিডিং নেই", "no reading")}</span>
                      ) : (
                        <>
                          {money(elec, lang)}
                          {r.reading ? (
                            <span className="num block text-2xs muted">
                              {num(r.reading.units, lang)} {pick(lang, "ইউনিট", "unit")}
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="text-right muted">{money(other, lang)}</td>
                    <td className="text-right">
                      <Money value={money(r.subtotal, lang)} />
                    </td>
                    <td className="text-right">
                      {r.previousDue > 0 ? (
                        <Money value={money(r.previousDue, lang)} tone="due" />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted whitespace-nowrap">{r.dueDate ? formatDate(r.dueDate, lang) : "—"}</td>
                    <td>
                      {r.already ? (
                        <Link href={`/bills/${r.already.id}`}>
                          <Badge tone="muted">{pick(lang, "আগেই আছে", "exists")}</Badge>
                        </Link>
                      ) : (
                        <Badge tone="success">{pick(lang, "তৈরি হবে", "will create")}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <form action={generateMonthlyBillsAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="billingMonth" value={month} />
        {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
        <SubmitButton
          className="btn btn-primary"
          disabled={pending.length === 0}
          pendingText={pick(lang, "তৈরি হচ্ছে…", "Generating…")}
        >
          <CheckCircle2 className="size-4" />
          {pick(lang, `${pending.length} টি বিল তৈরি করুন`, `Create ${pending.length} bills`)}
        </SubmitButton>
        <Link href="/bills" className="btn btn-outline">
          {t("cancel", lang)}
        </Link>
        <span className="text-xs muted">
          {pick(
            lang,
            "দুইবার চাপলেও একই মাসে দুটি বিল হবে না।",
            "Pressing twice never creates a duplicate for the same month.",
          )}
        </span>
      </form>
    </div>
  );
}
