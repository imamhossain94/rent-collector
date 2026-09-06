import { ScrollText } from "lucide-react";
import { requireSuperAdmin, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHead, TableWrap, EmptyState, Badge } from "@/components/ui";
import { FilterSelect } from "@/components/client-bits";
import { formatDateTime } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

const ACTION_TONE: Record<string, "primary" | "success" | "destructive" | "warning" | "muted"> = {
  CREATE: "success",
  REGISTER: "success",
  UPDATE: "primary",
  DELETE: "destructive",
  VOID: "destructive",
  STATUS: "warning",
  PLAN: "warning",
  PAYMENT: "success",
  GENERATE: "primary",
  SMS: "muted",
  LOGIN: "muted",
  LOGOUT: "muted",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const sp = await searchParams;
  const entity = sp.entity ?? "";

  const admin = await requireSuperAdmin();
  const lang = userLang(admin);

  const logs = await prisma.auditLog.findMany({
    where: entity ? { entity } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, phone: true, role: true } } },
  });

  const entities = ["User", "Property", "Unit", "Tenant", "Bill", "Payment", "Expense", "MeterReading", "SmsLog"];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("navAudit", lang)}
        subtitle={pick(lang, "সিস্টেমে কে কী করেছে তার সর্বশেষ ২০০টি ঘটনা", "The last 200 things that happened in the system")}
        icon={<ScrollText className="size-4" />}
        actions={
          <FilterSelect
            paramName="entity"
            value={entity}
            options={[{ value: "", label: t("all", lang) }, ...entities.map((e) => ({ value: e, label: e }))]}
          />
        }
      />

      <Card pad={false}>
        <div className="card-pad pb-2">
          <CardHead title={pick(lang, "ঘটনাপঞ্জি", "Activity log")} />
        </div>
        {logs.length === 0 ? (
          <EmptyState title={t("noData", lang)} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("date", lang)}</th>
                <th>{pick(lang, "কে", "Who")}</th>
                <th>{pick(lang, "কাজ", "Action")}</th>
                <th>{pick(lang, "কিসে", "Entity")}</th>
                <th>{pick(lang, "বিবরণ", "Summary")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="muted whitespace-nowrap">{formatDateTime(log.createdAt, lang)}</td>
                  <td>
                    <span className="block font-semibold">{log.user?.name ?? "—"}</span>
                    <span className="num block text-2xs muted">{log.user?.phone}</span>
                  </td>
                  <td>
                    <Badge tone={ACTION_TONE[log.action] ?? "muted"}>{log.action}</Badge>
                  </td>
                  <td className="muted">{log.entity}</td>
                  <td className="muted">{log.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
