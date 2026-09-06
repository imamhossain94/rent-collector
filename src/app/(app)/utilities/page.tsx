import Link from "next/link";
import { Gauge, CheckCircle2, Zap, Plus, BatteryCharging, Info } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenants, getPropertyOptions } from "@/lib/queries";
import { PageHeader, Card, CardHead, EmptyState, StatCard, TableWrap, Money, Badge } from "@/components/ui";
import { FilterSelect, Modal, ConfirmButton } from "@/components/client-bits";
import { ReadingSheet, type ReadingRow } from "@/components/reading-sheet";
import { RechargeForm } from "@/components/recharge-form";
import { saveReadingsAction, addRechargeAction, deleteRechargeAction } from "@/app/actions/bills";
import { currentMonth, lastMonths, monthLabel, money, num, shiftMonth, formatDate, monthRange } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, PAYMENT_METHODS, type Lang } from "@/lib/constants";
import { sum } from "@/lib/utils";

export default async function UtilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.month ?? currentMonth();
  const propertyId = sp.property ?? "";

  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [tenants, properties, propertyRows] = await Promise.all([
    getActiveTenants(user.id, propertyId || null),
    getPropertyOptions(user.id),
    prisma.property.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, mainMeterNumber: true, meterType: true, electricityRate: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const submeter = tenants.filter((tn) => tn.electricityMode === "SUBMETER");

  const { start, end } = monthRange(month);
  const [thisMonth, previousMonth, recharges] = await Promise.all([
    prisma.meterReading.findMany({
      where: { billingMonth: month, type: "ELECTRICITY", tenantId: { in: submeter.map((x) => x.id) } },
    }),
    prisma.meterReading.findMany({
      where: {
        billingMonth: shiftMonth(month, -1),
        type: "ELECTRICITY",
        tenantId: { in: submeter.map((x) => x.id) },
      },
    }),
    prisma.meterRecharge.findMany({
      where: {
        ownerId: user.id,
        ...(propertyId ? { propertyId } : {}),
        OR: [{ billingMonth: month }, { rechargedAt: { gte: start, lte: end } }],
      },
      orderBy: { rechargedAt: "desc" },
      include: { property: { select: { name: true } } },
    }),
  ]);

  const currentByTenant = new Map(thisMonth.map((r) => [r.tenantId, r]));
  const prevByTenant = new Map(previousMonth.map((r) => [r.tenantId, r]));

  const rows: ReadingRow[] = submeter.map((tn) => {
    const existing = currentByTenant.get(tn.id);
    const prev = prevByTenant.get(tn.id);
    return {
      tenantId: tn.id,
      tenantName: tn.name,
      unitLabel: tn.unit ? `${tn.unit.property.name} · ${tn.unit.name}` : "—",
      meterNumber: tn.unit?.meterNumber ?? null,
      previous: existing?.previous ?? prev?.current ?? 0,
      current: existing?.current ?? null,
      rate: existing?.rate ?? tn.electricityRate ?? tn.unit?.property.electricityRate ?? 9,
      billed: !!existing?.billId,
    };
  });

  const billedAmount = sum(thisMonth, (r) => r.amount);
  const billedUnits = sum(thisMonth, (r) => r.units);
  const rechargedAmount = sum(recharges, (r) => r.amount);
  const gap = rechargedAmount - billedAmount;

  return (
    <div className="space-y-5">
      <PageHeader
        title={pick(lang, "বিদ্যুৎ ও মিটার", "Electricity & meters")}
        subtitle={pick(
          lang,
          "মূল প্রিপেইড মিটারে কত টাকা রিচার্জ হলো, আর সাব-মিটার থেকে কত উঠল — দুটোই এক পাতায়",
          "What you topped up on the prepaid main meter versus what the sub-meters recovered",
        )}
        icon={<Gauge className="size-4" />}
        actions={
          <>
            <FilterSelect
              paramName="month"
              value={month}
              options={lastMonths(12).reverse().map((m) => ({ value: m, label: monthLabel(m, lang) }))}
            />
            <FilterSelect
              paramName="property"
              value={propertyId}
              options={[
                { value: "", label: pick(lang, "সব সম্পত্তি", "All properties") },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <Modal
              title={pick(lang, "মিটার রিচার্জ", "Meter recharge")}
              description={pick(
                lang,
                "প্রিপেইড মিটারে যত টাকা ঢুকিয়েছেন",
                "Money you loaded onto the prepaid meter",
              )}
              trigger={
                <button className="btn btn-outline btn-sm" disabled={propertyRows.length === 0}>
                  <BatteryCharging className="size-4" />
                  {pick(lang, "রিচার্জ যোগ", "Add recharge")}
                </button>
              }
            >
              <RechargeForm
                action={addRechargeAction}
                lang={lang}
                properties={propertyRows}
                billingMonth={month}
                defaultPropertyId={propertyId || undefined}
              />
            </Modal>
            <Link href={`/bills/generate?month=${month}`} className="btn btn-primary btn-sm">
              <Zap className="size-4" />
              {t("generateBills", lang)}
            </Link>
          </>
        }
      />

      {sp.saved ? (
        <div className="flex items-center gap-2 rounded border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-4 py-3 text-xs font-semibold text-[color:var(--success)]">
          <CheckCircle2 className="size-4" />
          {num(Number(sp.saved), lang)} {pick(lang, "টি রিডিং সংরক্ষণ হয়েছে", "readings saved")}
        </div>
      ) : null}

      {/* ---------------- main prepaid meter ---------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={pick(lang, "মূল মিটারে রিচার্জ", "Main meter top-ups")}
          value={money(rechargedAmount, lang)}
          hint={`${num(recharges.length, lang)} ${pick(lang, "বার রিচার্জ", "recharges")} · ${monthLabel(month, lang)}`}
          icon={<BatteryCharging className="size-4" />}
          tone="warning"
        />
        <StatCard
          label={pick(lang, "সাব-মিটারে বিল", "Billed to sub-meters")}
          value={money(billedAmount, lang)}
          hint={`${num(billedUnits, lang)} ${pick(lang, "ইউনিট", "units")}`}
          icon={<Zap className="size-4" />}
          tone="success"
        />
        <StatCard
          label={pick(lang, "পার্থক্য (আপনার খরচ)", "Difference (your share)")}
          value={money(gap, lang)}
          hint={
            gap > 0
              ? pick(lang, "সিঁড়ি, পানির পাম্প, খালি ঘর ইত্যাদি", "stairs, water pump, empty units…")
              : pick(lang, "রিচার্জের চেয়ে বেশি উঠেছে", "recovered more than you topped up")
          }
          icon={<Info className="size-4" />}
          tone={gap > 0 ? "destructive" : "primary"}
        />
        <StatCard
          label={pick(lang, "রিডিং দেওয়া হয়েছে", "Readings entered")}
          value={`${num(thisMonth.length, lang)}/${num(rows.length, lang)}`}
          tone={rows.length > 0 && thisMonth.length === rows.length ? "success" : "warning"}
          hint={pick(lang, "সাব-মিটার ভাড়াটিয়া", "sub-meter tenants")}
          icon={<Gauge className="size-4" />}
        />
      </div>

      <Card pad={false}>
        <div className="card-pad pb-3">
          <CardHead
            title={pick(lang, "মূল মিটার রিচার্জ (প্রিপেইড)", "Main meter recharges (prepaid)")}
            description={pick(
              lang,
              "ডেসকো প্রিপেইড মিটারে মাসে যতবার টাকা ঢোকান, প্রতিবার এখানে লিখুন।",
              "Every time you load the DESCO prepaid meter, record it here.",
            )}
          />
        </div>

        {recharges.length === 0 ? (
          <EmptyState
            icon={<BatteryCharging className="size-5" />}
            title={pick(lang, "এই মাসে কোনো রিচার্জ লেখা হয়নি", "No recharges recorded this month")}
            description={pick(
              lang,
              "রিচার্জ লিখে রাখলে বোঝা যাবে সাব-মিটার থেকে টাকা উঠছে কি না।",
              "Recording top-ups is what tells you whether the sub-meters are covering the bill.",
            )}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("date", lang)}</th>
                <th>{pick(lang, "সম্পত্তি / মিটার", "Property / meter")}</th>
                <th>{t("method", lang)}</th>
                <th>{pick(lang, "টোকেন", "Token")}</th>
                <th className="text-right">{t("amount", lang)}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recharges.map((r) => (
                <tr key={r.id}>
                  <td className="muted whitespace-nowrap">{formatDate(r.rechargedAt, lang)}</td>
                  <td>
                    <span className="font-semibold">{r.property.name}</span>
                    {r.meterNumber ? <span className="code block text-2xs muted">{r.meterNumber}</span> : null}
                  </td>
                  <td className="muted">{label(PAYMENT_METHODS, r.method, lang)}</td>
                  <td className="code muted">{r.tokenRef ?? "—"}</td>
                  <td className="text-right">
                    <Money value={money(r.amount, lang)} />
                  </td>
                  <td className="text-right">
                    <form action={deleteRechargeAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={t("confirmDelete", lang)}>✕</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="text-right font-bold">
                  {t("total", lang)}
                </td>
                <td className="text-right">
                  <Money value={money(rechargedAmount, lang)} />
                </td>
                <td />
              </tr>
            </tbody>
          </TableWrap>
        )}
      </Card>

      {/* ---------------- sub-meter readings ---------------- */}
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Gauge className="size-5" />}
            title={pick(lang, "সাব-মিটারে কোনো ভাড়াটিয়া নেই", "No sub-meter tenants")}
            description={pick(
              lang,
              "ভাড়াটিয়ার প্রোফাইলে 'বিদ্যুৎ বিলের ধরন' সাব-মিটার করলে এখানে দেখা যাবে।",
              "Set a tenant's electricity billing to sub-meter and they appear here.",
            )}
            action={
              <Link href="/tenants" className="btn btn-outline btn-sm">
                {t("navTenants", lang)}
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm muted">
              {pick(
                lang,
                `${monthLabel(month, lang)} মাসের সাব-মিটার রিডিং — আগের মাসের রিডিং বসানো আছে, শুধু নতুন রিডিং লিখুন।`,
                `Sub-meter readings for ${monthLabel(month, lang)} — last month is pre-filled, just type the new one.`,
              )}
            </p>
            <Badge tone="primary">
              {pick(lang, "রেট", "Rate")} ৳{num(rows[0]?.rate ?? 9, lang)}/{pick(lang, "ইউনিট", "unit")}
            </Badge>
          </div>
          <ReadingSheet action={saveReadingsAction} rows={rows} billingMonth={month} lang={lang} />
        </>
      )}

      {propertyRows.some((p) => !p.mainMeterNumber) ? (
        <Card className="border-[color-mix(in_oklab,var(--primary)_30%,transparent)]">
          <p className="flex items-center gap-2 text-sm font-bold text-[color:var(--primary)]">
            <Plus className="size-4" />
            {pick(lang, "মূল মিটারের নম্বর যোগ করুন", "Add your main meter number")}
          </p>
          <p className="mt-1 text-xs muted">
            {pick(
              lang,
              "সম্পত্তি সম্পাদনা করে ডেসকো মিটার নম্বর দিলে রিচার্জ ও বিলে সেটি বসে যাবে।",
              "Edit the property to store the DESCO meter number — recharges and bills then carry it.",
            )}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
