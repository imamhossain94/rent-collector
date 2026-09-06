import Link from "next/link";
import { BarChart3, TrendingUp } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalances } from "@/lib/billing";
import { PageHeader, Card, CardHead, TableWrap, StatCard, Money, EmptyState } from "@/components/ui";
import { PrintButton } from "@/components/client-bits";
import { money, num, lastMonths, monthLabel, monthShort, monthRange, currentMonth } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { percent, sum } from "@/lib/utils";
import type { Lang } from "@/lib/constants";

export default async function ReportsPage() {
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const months = lastMonths(12);
  const windowStart = monthRange(months[0]).start;

  const [payments, expenses, bills, properties, tenants] = await Promise.all([
    prisma.payment.findMany({
      where: { ownerId: user.id, paidAt: { gte: windowStart } },
      select: { amount: true, paidAt: true, bill: { select: { propertyId: true } } },
    }),
    prisma.expense.findMany({
      where: { ownerId: user.id, spentAt: { gte: windowStart } },
      select: { amount: true, spentAt: true, propertyId: true },
    }),
    prisma.bill.findMany({
      where: { ownerId: user.id, status: { not: "VOID" }, billingMonth: { in: months } },
      select: { total: true, paidAmount: true, billingMonth: true, propertyId: true },
    }),
    prisma.property.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } }),
    prisma.tenant.findMany({
      where: { ownerId: user.id, status: "ACTIVE" },
      select: { id: true, name: true, unit: { select: { name: true, property: { select: { name: true } } } } },
    }),
  ]);

  const rows = months.map((m) => {
    const { start, end } = monthRange(m);
    const collected = sum(
      payments.filter((p) => p.paidAt >= start && p.paidAt <= end),
      (p) => p.amount,
    );
    const spent = sum(
      expenses.filter((e) => e.spentAt >= start && e.spentAt <= end),
      (e) => e.amount,
    );
    const billed = sum(
      bills.filter((b) => b.billingMonth === m),
      (b) => b.total,
    );
    return { month: m, collected, spent, billed, net: collected - spent };
  });

  const maxBar = Math.max(...rows.map((r) => Math.max(r.collected, r.spent)), 1);
  const totalCollected = sum(rows, (r) => r.collected);
  const totalSpent = sum(rows, (r) => r.spent);
  const totalBilled = sum(rows, (r) => r.billed);

  const balances = await tenantBalances(tenants.map((x) => x.id));
  const dues = tenants
    .map((tn) => ({ ...tn, balance: balances.get(tn.id) ?? 0 }))
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const byProperty = properties.map((p) => {
    const collected = sum(
      payments.filter((x) => x.bill?.propertyId === p.id),
      (x) => x.amount,
    );
    const spent = sum(
      expenses.filter((x) => x.propertyId === p.id),
      (x) => x.amount,
    );
    const billed = sum(
      bills.filter((x) => x.propertyId === p.id),
      (x) => x.total,
    );
    return { ...p, collected, spent, billed, net: collected - spent };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("reportTitle", lang)}
        subtitle={t("reportSubtitle", lang)}
        icon={<BarChart3 className="size-4" />}
        actions={<PrintButton label={t("print", lang)} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={pick(lang, "১২ মাসে আদায়", "Collected (12 mo)")} value={money(totalCollected, lang)} tone="success" />
        <StatCard label={pick(lang, "১২ মাসে খরচ", "Spent (12 mo)")} value={money(totalSpent, lang)} tone="warning" />
        <StatCard
          label={t("netIncome", lang)}
          value={money(totalCollected - totalSpent, lang)}
          tone={totalCollected - totalSpent >= 0 ? "primary" : "destructive"}
        />
        <StatCard
          label={t("collectionRate", lang)}
          value={`${num(percent(totalCollected, totalBilled || totalCollected || 1), lang)}%`}
          hint={`${pick(lang, "বিল", "billed")} ${money(totalBilled, lang)}`}
        />
      </div>

      <Card>
        <CardHead
          title={t("incomeVsExpense", lang)}
          description={pick(lang, "গত ১২ মাস — সবুজ আদায়, কমলা খরচ", "Last 12 months — green in, amber out")}
        />
        {/* pixel heights — percentage heights inside flex items are unreliable */}
        <div className="flex items-end gap-1.5 sm:gap-3">
          {rows.map((r) => (
            <div key={r.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t"
                  style={{
                    height: `${Math.max(Math.round((r.collected / maxBar) * 160), 2)}px`,
                    background: "var(--success)",
                  }}
                  title={`${monthShort(r.month)} · ${money(r.collected, "en")}`}
                />
                <div
                  className="w-1/2 rounded-t"
                  style={{
                    height: `${Math.max(Math.round((r.spent / maxBar) * 160), 2)}px`,
                    background: "color-mix(in oklab, var(--warning) 80%, transparent)",
                  }}
                  title={`${monthShort(r.month)} · ${money(r.spent, "en")}`}
                />
              </div>
              <span className="text-[9px] font-semibold muted">{monthShort(r.month)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead title={pick(lang, "মাসভিত্তিক হিসাব", "Month by month")} />
          </div>
          <TableWrap>
            <thead>
              <tr>
                <th>{t("month", lang)}</th>
                <th className="text-right">{t("billed", lang)}</th>
                <th className="text-right">{t("collected", lang)}</th>
                <th className="text-right">{t("expenses", lang)}</th>
                <th className="text-right">{t("netIncome", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.month}>
                  <td className="font-semibold">{monthLabel(r.month, lang)}</td>
                  <td className="num text-right muted">{money(r.billed, lang)}</td>
                  <td className="text-right">
                    <Money value={money(r.collected, lang)} tone="paid" />
                  </td>
                  <td className="num text-right text-[color:var(--warning)]">{money(r.spent, lang)}</td>
                  <td className="text-right">
                    <Money value={money(r.net, lang)} tone={r.net >= 0 ? "plain" : "due"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>

        <Card pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={t("propertyPerformance", lang)}
              description={pick(lang, "গত ১২ মাসের সারসংক্ষেপ", "Last 12 months per property")}
            />
          </div>
          {byProperty.length === 0 ? (
            <EmptyState title={t("noData", lang)} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("navProperties", lang)}</th>
                  <th className="text-right">{t("billed", lang)}</th>
                  <th className="text-right">{t("collected", lang)}</th>
                  <th className="text-right">{t("expenses", lang)}</th>
                  <th className="text-right">{t("netIncome", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {byProperty.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/properties/${p.id}`} className="font-semibold">
                        {p.name}
                      </Link>
                    </td>
                    <td className="num text-right muted">{money(p.billed, lang)}</td>
                    <td className="text-right">
                      <Money value={money(p.collected, lang)} tone="paid" />
                    </td>
                    <td className="num text-right text-[color:var(--warning)]">{money(p.spent, lang)}</td>
                    <td className="text-right">
                      <Money value={money(p.net, lang)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>

      <Card pad={false}>
        <div className="card-pad pb-2">
          <CardHead
            title={t("duesByTenant", lang)}
            description={pick(lang, "আজকের তারিখ পর্যন্ত", "As of today")}
            action={
              <Link href="/sms" className="btn btn-ghost btn-sm">
                <TrendingUp className="size-4" />
                {t("sendReminders", lang)}
              </Link>
            }
          />
        </div>
        {dues.length === 0 ? (
          <EmptyState title={pick(lang, "কারও বকেয়া নেই 🎉", "No outstanding dues 🎉")} />
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
              {dues.map((tn) => (
                <tr key={tn.id}>
                  <td>
                    <Link href={`/tenants/${tn.id}`} className="font-semibold">
                      {tn.name}
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
              <tr>
                <td colSpan={2} className="text-right font-bold">
                  {t("total", lang)}
                </td>
                <td className="text-right">
                  <Money value={money(sum(dues, (d) => d.balance), lang)} tone="due" />
                </td>
              </tr>
            </tbody>
          </TableWrap>
        )}
      </Card>

      <p className="text-xs muted no-print">
        {pick(
          lang,
          `রিপোর্টটি ${monthLabel(currentMonth(), lang)} পর্যন্ত হালনাগাদ। প্রিন্ট করলে হিসাবরক্ষক বা ব্যাংকে জমা দেওয়ার উপযোগী কাগজ পাবেন।`,
          `Up to date through ${monthLabel(currentMonth(), lang)}. Printing gives you a sheet fit for an accountant or a bank.`,
        )}
      </p>
    </div>
  );
}
