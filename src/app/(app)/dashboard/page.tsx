import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  AlertTriangle,
  Building2,
  Users,
  ReceiptText,
  HandCoins,
  Gauge,
  DoorOpen,
  ArrowRight,
  Bell,
  Plus,
} from "lucide-react";
import { requireUser, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalances } from "@/lib/billing";
import { currentMonth, monthLabel, monthRange, lastMonths, monthShort, money, num, formatDate, initials } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { percent, sum } from "@/lib/utils";
import { PAYMENT_METHOD_COLOR, label as pickLabel, PAYMENT_METHODS } from "@/lib/constants";
import { Card, CardHead, PageHeader, StatCard, TableWrap, EmptyState, Badge, Avatar, Progress, Money } from "@/components/ui";
import type { Lang } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await requireUser();
  const lang = userLang(user);
  const month = currentMonth();
  const { start, end } = monthRange(month);

  const [properties, units, tenants, monthBills, monthPayments, monthExpenses, recentPayments, sixMonthPayments] =
    await Promise.all([
      prisma.property.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } }),
      prisma.unit.findMany({
        where: { property: { ownerId: user.id } },
        select: { id: true, name: true, status: true, rentAmount: true, property: { select: { id: true, name: true } } },
      }),
      prisma.tenant.findMany({
        where: { ownerId: user.id, status: "ACTIVE" },
        select: { id: true, name: true, phone: true, unit: { select: { name: true, property: { select: { name: true } } } } },
      }),
      prisma.bill.findMany({
        where: { ownerId: user.id, billingMonth: month, status: { not: "VOID" } },
        select: { id: true, total: true, paidAmount: true, status: true },
      }),
      prisma.payment.aggregate({
        where: { ownerId: user.id, paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { ownerId: user.id, spentAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: { ownerId: user.id },
        orderBy: { paidAt: "desc" },
        take: 6,
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          receiptNo: true,
          tenant: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.findMany({
        where: { ownerId: user.id, paidAt: { gte: monthRange(lastMonths(6)[0]).start } },
        select: { amount: true, paidAt: true },
      }),
    ]);

  const balances = await tenantBalances(tenants.map((x) => x.id));
  const outstanding = [...balances.values()].reduce((acc, v) => acc + Math.max(0, v), 0);

  const billed = sum(monthBills, (b) => b.total);
  const collectedThisMonth = monthPayments._sum.amount ?? 0;
  const expensesThisMonth = monthExpenses._sum.amount ?? 0;
  const occupied = units.filter((u) => u.status === "OCCUPIED").length;
  const vacant = units.filter((u) => u.status === "VACANT");
  const collectionRate = percent(collectedThisMonth, billed || collectedThisMonth || 1);

  const trend = lastMonths(6).map((m) => {
    const { start: s, end: e } = monthRange(m);
    const total = sixMonthPayments
      .filter((p) => p.paidAt >= s && p.paidAt <= e)
      .reduce((acc, p) => acc + p.amount, 0);
    return { month: m, total };
  });
  const trendMax = Math.max(...trend.map((x) => x.total), 1);

  const topDues = tenants
    .map((tn) => ({ ...tn, balance: balances.get(tn.id) ?? 0 }))
    .filter((tn) => tn.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6);

  const quickActions = [
    { href: "/bills/generate", icon: <ReceiptText className="size-4" />, title: t("generateBills", lang), desc: pick(lang, "সব ভাড়াটিয়ার এক সাথে", "Every tenant at once") },
    { href: "/payments?collect=1", icon: <HandCoins className="size-4" />, title: t("collectPayment", lang), desc: pick(lang, "রসিদসহ টাকা নিন", "Take money, print receipt") },
    { href: "/utilities", icon: <Gauge className="size-4" />, title: t("meterTitle", lang), desc: pick(lang, "বিদ্যুৎ ইউনিট লিখুন", "Enter electricity units") },
    { href: "/tenants/new", icon: <Users className="size-4" />, title: t("addTenant", lang), desc: pick(lang, "নতুন ভাড়াটিয়া তুলুন", "Move a tenant in") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("dashTitle", lang)}
        subtitle={t("dashSubtitle", lang)}
        actions={
          <>
            <span className="chip">{monthLabel(month, lang)}</span>
            <Link href="/sms" className="btn btn-outline btn-sm">
              <Bell className="size-4" />
              {t("dueReminder", lang)}
            </Link>
            <Link href="/bills/generate" className="btn btn-primary btn-sm">
              <Plus className="size-4" />
              {t("generateBills", lang)}
            </Link>
          </>
        }
      />

      {properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={pick(lang, "প্রথমে একটি সম্পত্তি যোগ করুন", "Add your first property")}
            description={pick(
              lang,
              "বাড়ি, দোকান বা গ্যারেজ যোগ করে ইউনিট ও ভাড়াটিয়া তুলুন — তারপর এক ক্লিকে মাসিক বিল।",
              "Add a house, shop or garage, put units and tenants in it, then bill the whole month in one click.",
            )}
            action={
              <Link href="/properties/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" />
                {t("addProperty", lang)}
              </Link>
            }
          />
        </Card>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("collected", lang)}
          value={money(collectedThisMonth, lang)}
          hint={`${num(monthPayments._count, lang)} ${pick(lang, "টি লেনদেন", "collections")}`}
          icon={<Wallet className="size-4" />}
          tone="success"
          href="/payments"
        />
        <StatCard
          label={t("due", lang)}
          value={money(outstanding, lang)}
          hint={`${num(topDues.length, lang)} ${pick(lang, "জন ভাড়াটিয়া বকেয়া", "tenants owe money")}`}
          icon={<AlertTriangle className="size-4" />}
          tone="destructive"
          href="/bills?status=UNPAID"
        />
        <StatCard
          label={t("billed", lang)}
          value={money(billed, lang)}
          hint={`${num(monthBills.length, lang)} ${pick(lang, "টি বিল", "bills")} · ${t("collectionRate", lang)} ${num(collectionRate, lang)}%`}
          icon={<ReceiptText className="size-4" />}
          tone="primary"
          href="/bills"
        />
        <StatCard
          label={t("expenses", lang)}
          value={money(expensesThisMonth, lang)}
          hint={`${t("netIncome", lang)} ${money(collectedThisMonth - expensesThisMonth, lang)}`}
          icon={<TrendingDown className="size-4" />}
          tone="warning"
          href="/expenses"
        />
      </div>

      {/* quick actions */}
      <div>
        <p className="mb-2 text-2xs font-bold uppercase tracking-wider muted">{t("quickActions", lang)}</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className="card card-pad flex items-center gap-3 transition-colors hover:border-[color-mix(in_oklab,var(--primary)_50%,transparent)]">
              <span className="icon-box size-9 shrink-0">{a.icon}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{a.title}</span>
                <span className="block truncate text-xs muted">{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* collection trend */}
        <Card className="lg:col-span-2">
          <CardHead
            title={t("sixMonthTrend", lang)}
            description={pick(lang, "প্রতি মাসে হাতে আসা টাকা", "Money actually received each month")}
            action={
              <Link href="/reports" className="btn btn-ghost btn-sm">
                {t("viewAll", lang)}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
          {/* Bar heights are computed in pixels: a percentage height inside a
              flex item does not resolve reliably across browsers. */}
          <div className="flex min-h-56 items-end gap-2 sm:gap-4">
            {trend.map((point) => {
              const height = Math.max(Math.round((point.total / trendMax) * 196), 4);
              const isCurrent = point.month === month;
              return (
                <div key={point.month} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="num text-2xs font-bold muted">
                    {point.total ? money(point.total, lang, false) : ""}
                  </span>
                  <div
                    className="w-full max-w-20 rounded-t transition-all"
                    style={{
                      height: `${height}px`,
                      background: isCurrent
                        ? "var(--primary)"
                        : "color-mix(in oklab, var(--primary) 35%, transparent)",
                    }}
                  />
                  <span className="text-2xs font-semibold muted">{monthShort(point.month)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* occupancy */}
        <Card>
          <CardHead title={t("occupancy", lang)} description={pick(lang, "ইউনিট ভাড়ার অবস্থা", "How full your properties are")} />
          <div className="flex items-end justify-between">
            <div>
              <p className="num text-2xl font-extrabold">
                {num(occupied, lang)}
                <span className="text-sm muted">/{num(units.length, lang)}</span>
              </p>
              <p className="text-xs muted">{pick(lang, "ইউনিট ভাড়া হয়েছে", "units occupied")}</p>
            </div>
            <span className="badge badge-primary">{num(percent(occupied, units.length || 1), lang)}%</span>
          </div>
          <div className="mt-3">
            <Progress value={percent(occupied, units.length || 1)} />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="muted">{t("navProperties", lang)}</span>
              <span className="num font-bold">{num(properties.length, lang)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="muted">{t("tenants", lang)}</span>
              <span className="num font-bold">{num(tenants.length, lang)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="muted">{t("vacantUnits", lang)}</span>
              <span className="num font-bold text-[color:var(--warning)]">{num(vacant.length, lang)}</span>
            </div>
          </div>

          {vacant.length > 0 ? (
            <div className="mt-3 rounded border border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--warning)]">
                <DoorOpen className="size-4" />
                {pick(lang, "খালি আছে", "Vacant right now")}
              </p>
              <p className="mt-1 text-xs muted">
                {vacant.slice(0, 4).map((u) => `${u.property.name} · ${u.name}`).join(", ")}
                {vacant.length > 4 ? ` +${num(vacant.length - 4, lang)}` : ""}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* top dues */}
        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={t("topDues", lang)}
              description={pick(lang, "সবচেয়ে বেশি বকেয়া যাদের", "Who owes the most right now")}
              action={
                <Link href="/sms" className="btn btn-ghost btn-sm">
                  <Bell className="size-4" />
                  {t("dueReminder", lang)}
                </Link>
              }
            />
          </div>
          {topDues.length === 0 ? (
            <EmptyState title={pick(lang, "কারও বকেয়া নেই 🎉", "Nobody owes you money 🎉")} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("tenantName", lang)}</th>
                  <th>{t("unitAssign", lang)}</th>
                  <th className="text-right">{t("due", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {topDues.map((tn) => (
                  <tr key={tn.id}>
                    <td>
                      <Link href={`/tenants/${tn.id}`} className="flex items-center gap-2 font-semibold">
                        <Avatar text={initials(tn.name)} />
                        <span className="truncate">{tn.name}</span>
                      </Link>
                    </td>
                    <td className="muted">
                      {tn.unit ? `${tn.unit.property.name} · ${tn.unit.name}` : "—"}
                    </td>
                    <td className="text-right">
                      <Money value={money(tn.balance, lang)} tone="due" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        {/* recent payments */}
        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={t("recentPayments", lang)}
              description={pick(lang, "সর্বশেষ হাতে পাওয়া টাকা", "The last money you received")}
              action={
                <Link href="/payments" className="btn btn-ghost btn-sm">
                  {t("viewAll", lang)}
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>
          {recentPayments.length === 0 ? (
            <EmptyState title={t("noData", lang)} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("receivedFrom", lang)}</th>
                  <th>{t("method", lang)}</th>
                  <th className="text-right">{t("amount", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/payments/${p.id}`} className="font-semibold">
                        {p.tenant.name}
                      </Link>
                      <span className="block text-2xs muted">{formatDate(p.paidAt, lang)}</span>
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
                        {pickLabel(PAYMENT_METHODS, p.method, lang)}
                      </span>
                    </td>
                    <td className="text-right">
                      <Money value={money(p.amount, lang)} tone="paid" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>

      {monthBills.length > 0 ? (
        <Card>
          <CardHead
            title={pick(lang, "এই মাসের বিলের অবস্থা", "This month's bill status")}
            description={monthLabel(month, lang)}
          />
          <div className="grid grid-cols-3 gap-3">
            {["PAID", "PARTIAL", "UNPAID"].map((st) => {
              const rows = monthBills.filter((b) => b.status === st);
              const tone = st === "PAID" ? "success" : st === "PARTIAL" ? "warning" : "destructive";
              return (
                <div key={st} className="rounded border border-border p-3">
                  <Badge tone={tone as never}>
                    {st === "PAID"
                      ? pick(lang, "পরিশোধিত", "Paid")
                      : st === "PARTIAL"
                        ? pick(lang, "আংশিক", "Partial")
                        : pick(lang, "বকেয়া", "Unpaid")}
                  </Badge>
                  <p className="num mt-2 text-lg font-extrabold">{num(rows.length, lang)}</p>
                  <p className="num text-xs muted">{money(sum(rows, (r) => r.total - r.paidAmount), lang)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
