import Link from "next/link";
import { Building2, Plus, MapPin, DoorOpen, Users, Wallet } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge, Progress } from "@/components/ui";
import { money, num, currentMonth, monthRange } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, PROPERTY_TYPES, type Lang } from "@/lib/constants";
import { percent, sum } from "@/lib/utils";

export default async function PropertiesPage() {
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");
  const { start, end } = monthRange(currentMonth());

  const properties = await prisma.property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      units: { select: { id: true, status: true, rentAmount: true } },
      _count: { select: { units: true } },
    },
  });

  const collections = await prisma.payment.groupBy({
    by: ["billId"],
    where: { ownerId: user.id, paidAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const billIds = collections.map((c) => c.billId).filter(Boolean) as string[];
  const bills = billIds.length
    ? await prisma.bill.findMany({ where: { id: { in: billIds } }, select: { id: true, propertyId: true } })
    : [];
  const propertyOfBill = new Map(bills.map((b) => [b.id, b.propertyId]));
  const collectedByProperty = new Map<string, number>();
  for (const c of collections) {
    const pid = c.billId ? propertyOfBill.get(c.billId) : undefined;
    if (!pid) continue;
    collectedByProperty.set(pid, (collectedByProperty.get(pid) ?? 0) + (c._sum.amount ?? 0));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("propTitle", lang)}
        subtitle={t("propSubtitle", lang)}
        icon={<Building2 className="size-4" />}
        actions={
          <Link href="/properties/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" />
            {t("addProperty", lang)}
          </Link>
        }
      />

      {properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={pick(lang, "এখনো কোনো সম্পত্তি যোগ করা হয়নি", "No properties yet")}
            description={pick(
              lang,
              "একটি বাড়ি, দোকান বা গ্যারেজ যোগ করে শুরু করুন।",
              "Add a house, shop or garage to get started.",
            )}
            action={
              <Link href="/properties/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" />
                {t("addProperty", lang)}
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => {
            const occupied = p.units.filter((u) => u.status === "OCCUPIED").length;
            const potential = sum(p.units, (u) => u.rentAmount);
            const collected = collectedByProperty.get(p.id) ?? 0;
            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="card card-pad transition-colors hover:border-[color-mix(in_oklab,var(--primary)_50%,transparent)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="icon-box size-9 shrink-0">
                      <Building2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{p.name}</p>
                      <p className="flex items-center gap-1 truncate text-xs muted">
                        <MapPin className="size-3 shrink-0" />
                        {[p.area, p.city].filter(Boolean).join(", ") || pick(lang, "ঠিকানা নেই", "No address")}
                      </p>
                    </div>
                  </div>
                  <Badge tone="primary">{label(PROPERTY_TYPES, p.type, lang)}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded border border-border p-2">
                    <p className="num text-sm font-extrabold">{num(p._count.units, lang)}</p>
                    <p className="text-2xs muted">{t("units", lang)}</p>
                  </div>
                  <div className="rounded border border-border p-2">
                    <p className="num text-sm font-extrabold text-[color:var(--success)]">{num(occupied, lang)}</p>
                    <p className="text-2xs muted">{pick(lang, "ভাড়া", "Rented")}</p>
                  </div>
                  <div className="rounded border border-border p-2">
                    <p className="num text-sm font-extrabold text-[color:var(--warning)]">
                      {num(p._count.units - occupied, lang)}
                    </p>
                    <p className="text-2xs muted">{pick(lang, "খালি", "Vacant")}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={percent(occupied, p._count.units || 1)} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 muted">
                    <Wallet className="size-3.5" />
                    {pick(lang, "মাসিক সম্ভাব্য", "Monthly potential")}
                  </span>
                  <span className="num font-bold">{money(potential, lang)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 muted">
                    <Users className="size-3.5" />
                    {pick(lang, "এ মাসে আদায়", "Collected this month")}
                  </span>
                  <span className="num font-bold text-[color:var(--success)]">{money(collected, lang)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {properties.some((p) => p._count.units === 0) ? (
        <Card className="border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]">
          <p className="flex items-center gap-2 text-xs font-bold text-[color:var(--warning)]">
            <DoorOpen className="size-4" />
            {pick(lang, "কিছু সম্পত্তিতে এখনো ইউনিট যোগ করা হয়নি", "Some properties have no units yet")}
          </p>
          <p className="mt-1 text-xs muted">
            {pick(
              lang,
              "ইউনিট (ফ্ল্যাট/দোকান) যোগ না করলে ভাড়াটিয়া তোলা যাবে না।",
              "You need units (flats/shops) before a tenant can be moved in.",
            )}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
