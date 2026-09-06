import Link from "next/link";
import { ShieldCheck, Users, Building2, Wallet, ReceiptText, ArrowRight } from "lucide-react";
import { requireSuperAdmin, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHead, TableWrap, StatCard, Badge, Money, EmptyState } from "@/components/ui";
import { money, num, formatDate, currentMonth, monthRange, initials } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, USER_STATUS, PLANS, type Lang } from "@/lib/constants";
import { Avatar } from "@/components/ui";

export default async function AdminOverviewPage() {
  const admin = await requireSuperAdmin();
  const lang = userLang(admin);
  const { start, end } = monthRange(currentMonth());

  const [owners, properties, units, tenants, bills, allTime, thisMonth, recent, topOwners] = await Promise.all([
    prisma.user.findMany({ where: { role: "OWNER" }, select: { id: true, status: true, plan: true } }),
    prisma.property.count(),
    prisma.unit.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.bill.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: { paidAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.user.findMany({
      where: { role: "OWNER" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        plan: true,
        createdAt: true,
        businessName: true,
        _count: { select: { properties: true, tenants: true } },
      },
    }),
    prisma.payment.groupBy({ by: ["ownerId"], _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 6 }),
  ]);

  const topOwnerUsers = topOwners.length
    ? await prisma.user.findMany({
        where: { id: { in: topOwners.map((o) => o.ownerId) } },
        select: { id: true, name: true, businessName: true, phone: true },
      })
    : [];
  const userById = new Map(topOwnerUsers.map((u) => [u.id, u]));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("adminTitle", lang)}
        subtitle={t("adminSubtitle", lang)}
        icon={<ShieldCheck className="size-4" />}
        actions={
          <Link href="/admin/users" className="btn btn-primary btn-sm">
            <Users className="size-4" />
            {t("navUsers", lang)}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("totalOwners", lang)}
          value={num(owners.length, lang)}
          hint={`${num(owners.filter((o) => o.status === "ACTIVE").length, lang)} ${pick(lang, "সক্রিয়", "active")} · ${num(
            owners.filter((o) => o.plan === "PRO").length,
            lang,
          )} PRO`}
          icon={<Users className="size-4" />}
          href="/admin/users"
        />
        <StatCard
          label={t("totalProperties", lang)}
          value={num(properties, lang)}
          hint={`${num(units, lang)} ${pick(lang, "ইউনিট", "units")} · ${num(tenants, lang)} ${pick(lang, "ভাড়াটিয়া", "tenants")}`}
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label={t("platformCollection", lang)}
          value={money(allTime._sum.amount ?? 0, lang)}
          hint={`${num(allTime._count, lang)} ${pick(lang, "টি রসিদ", "receipts")}`}
          icon={<Wallet className="size-4" />}
          tone="success"
        />
        <StatCard
          label={pick(lang, "এ মাসের আদায়", "This month")}
          value={money(thisMonth._sum.amount ?? 0, lang)}
          hint={`${num(bills, lang)} ${pick(lang, "টি বিল তৈরি হয়েছে", "bills issued")}`}
          icon={<ReceiptText className="size-4" />}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={pick(lang, "নতুন বাড়িওয়ালা", "Newest owners")}
              action={
                <Link href="/admin/users" className="btn btn-ghost btn-sm">
                  {t("viewAll", lang)}
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>
          {recent.length === 0 ? (
            <EmptyState title={t("noData", lang)} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("name", lang)}</th>
                  <th>{pick(lang, "সম্পত্তি / ভাড়াটিয়া", "Properties / tenants")}</th>
                  <th>{t("date", lang)}</th>
                  <th>{t("status", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar text={initials(u.name)} />
                        <span>
                          <span className="block font-bold">{u.businessName || u.name}</span>
                          <span className="num block text-2xs muted">{u.phone}</span>
                        </span>
                      </div>
                    </td>
                    <td className="num muted">
                      {num(u._count.properties, lang)} / {num(u._count.tenants, lang)}
                    </td>
                    <td className="muted">{formatDate(u.createdAt, lang)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={tone(USER_STATUS, u.status)}>{label(USER_STATUS, u.status, lang)}</Badge>
                        <Badge tone={u.plan === "PRO" ? "primary" : "muted"}>{label(PLANS, u.plan, lang)}</Badge>
                      </div>
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
              title={pick(lang, "সবচেয়ে বেশি আদায় করেছেন", "Highest collections")}
              description={pick(lang, "সর্বকালের হিসাব", "All-time, per owner")}
            />
          </div>
          {topOwners.length === 0 ? (
            <EmptyState title={t("noData", lang)} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("name", lang)}</th>
                  <th className="text-right">{t("collected", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {topOwners.map((row) => {
                  const owner = userById.get(row.ownerId);
                  return (
                    <tr key={row.ownerId}>
                      <td>
                        <span className="block font-bold">{owner?.businessName || owner?.name || row.ownerId}</span>
                        <span className="num block text-2xs muted">{owner?.phone}</span>
                      </td>
                      <td className="text-right">
                        <Money value={money(row._sum.amount ?? 0, lang)} tone="paid" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
