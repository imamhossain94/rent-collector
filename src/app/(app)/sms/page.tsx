import Link from "next/link";
import { MessageSquare, Bell, Info, Send } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalances } from "@/lib/billing";
import { isSimulationMode, rentReminderText } from "@/lib/sms";
import {
  PageHeader,
  Card,
  CardHead,
  TableWrap,
  EmptyState,
  StatCard,
  Badge,
  Field,
  Select,
  Textarea,
  Money,
} from "@/components/ui";
import { SubmitButton } from "@/components/client-bits";
import { remindAllDueAction, sendCustomSmsAction } from "@/app/actions/misc";
import { money, num, formatDateTime, currentMonth } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, SMS_STATUS, SMS_TYPES, type Lang } from "@/lib/constants";

export default async function SmsPage() {
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");
  const month = currentMonth();

  const tenants = await prisma.tenant.findMany({
    where: { ownerId: user.id, status: "ACTIVE" },
    include: { unit: { include: { property: true } } },
  });
  const balances = await tenantBalances(tenants.map((x) => x.id));

  const due = tenants
    .map((tn) => ({ ...tn, balance: balances.get(tn.id) ?? 0 }))
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const logs = await prisma.smsLog.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tenant: { select: { id: true, name: true } } },
  });

  const simulation = isSimulationMode();
  const [y, m] = month.split("-").map(Number);
  const sample = due[0]
    ? rentReminderText({
        tenantName: due[0].name,
        amount: due[0].balance,
        billingMonth: month,
        dueDate: new Date(y, m - 1, due[0].unit?.property.dueDay ?? 10),
        ownerName: user.businessName || user.name,
        lang,
      })
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("smsTitle", lang)}
        subtitle={t("smsSubtitle", lang)}
        icon={<MessageSquare className="size-4" />}
        actions={
          <form action={remindAllDueAction}>
            <input type="hidden" name="billingMonth" value={month} />
            <SubmitButton className="btn btn-primary btn-sm" disabled={due.length === 0}>
              <Bell className="size-4" />
              {t("sendReminders", lang)} ({num(due.length, lang)})
            </SubmitButton>
          </form>
        }
      />

      {simulation ? (
        <Card className="border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]">
          <p className="flex items-center gap-2 text-xs font-bold text-[color:var(--warning)]">
            <Info className="size-4" />
            {pick(lang, "ডেমো মোড চালু আছে", "Simulation mode is on")}
          </p>
          <p className="mt-1 text-xs muted">
            {pick(
              lang,
              "এখনো এসএমএস গেটওয়ে যুক্ত করা হয়নি, তাই বার্তাগুলো শুধু সংরক্ষণ হচ্ছে — পাঠানো হচ্ছে না। .env ফাইলে SMS_PROVIDER ও SMS_API_KEY দিলেই সত্যিকারের এসএমএস যাবে।",
              "No SMS gateway is configured yet, so messages are stored but not delivered. Set SMS_PROVIDER and SMS_API_KEY in .env to send for real.",
            )}
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={pick(lang, "বকেয়া ভাড়াটিয়া", "Tenants with dues")} value={num(due.length, lang)} tone="destructive" />
        <StatCard label={t("due", lang)} value={money(due.reduce((a, x) => a + x.balance, 0), lang)} tone="destructive" />
        <StatCard label={pick(lang, "পাঠানো বার্তা", "Messages sent")} value={num(logs.length, lang)} tone="primary" />
        <StatCard
          label={pick(lang, "চলতি মাস", "Current month")}
          value={num(logs.filter((l) => l.createdAt >= new Date(y, m - 1, 1)).length, lang)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" pad={false}>
          <div className="card-pad pb-2">
            <CardHead
              title={pick(lang, "যাদের তাগাদা দেওয়া দরকার", "Who needs a nudge")}
              description={pick(lang, "বকেয়া থাকা প্রতিটি ভাড়াটিয়া", "Every tenant with an outstanding balance")}
            />
          </div>
          {due.length === 0 ? (
            <EmptyState title={pick(lang, "কারও বকেয়া নেই 🎉", "Nobody is behind 🎉")} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t("tenantName", lang)}</th>
                  <th>{t("phone", lang)}</th>
                  <th>{t("unitAssign", lang)}</th>
                  <th className="text-right">{t("due", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {due.map((tn) => (
                  <tr key={tn.id}>
                    <td>
                      <Link href={`/tenants/${tn.id}`} className="font-semibold">
                        {tn.name}
                      </Link>
                    </td>
                    <td className="num muted">{tn.phone}</td>
                    <td className="muted">{tn.unit ? `${tn.unit.property.name} · ${tn.unit.name}` : "—"}</td>
                    <td className="text-right">
                      <Money value={money(tn.balance, lang)} tone="due" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <div className="space-y-4">
          {sample ? (
            <Card>
              <CardHead title={pick(lang, "যে বার্তাটি যাবে", "What they will receive")} />
              <div className="rounded border border-border bg-[color-mix(in_oklab,var(--muted)_45%,transparent)] p-3 text-xs leading-relaxed">
                {sample}
              </div>
              <p className="mt-2 text-2xs muted">
                {pick(
                  lang,
                  "প্রতিটি ভাড়াটিয়ার নাম ও বকেয়া অনুযায়ী বার্তা আলাদা হবে।",
                  "Each message is personalised with the tenant's name and balance.",
                )}
              </p>
            </Card>
          ) : null}

          <Card>
            <CardHead title={pick(lang, "নিজের বার্তা পাঠান", "Send your own message")} />
            <form action={sendCustomSmsAction} className="space-y-3">
              <Field label={t("tenantName", lang)}>
                <Select name="tenantId" defaultValue="">
                  <option value="">{pick(lang, "— বাছাই করুন —", "— pick a tenant —")}</option>
                  {tenants.map((tn) => (
                    <option key={tn.id} value={tn.id}>
                      {tn.name} · {tn.phone}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("message", lang)} required>
                <Textarea
                  name="message"
                  rows={4}
                  required
                  placeholder={pick(
                    lang,
                    "যেমন: আগামীকাল সকাল ১০টায় পানির লাইন বন্ধ থাকবে।",
                    "e.g. Water supply will be off tomorrow 10am–1pm.",
                  )}
                />
              </Field>
              <SubmitButton className="btn btn-primary w-full">
                <Send className="size-4" />
                {pick(lang, "পাঠান", "Send")}
              </SubmitButton>
            </form>
          </Card>
        </div>
      </div>

      <Card pad={false}>
        <div className="card-pad pb-2">
          <CardHead title={pick(lang, "বার্তার ইতিহাস", "Message history")} />
        </div>
        {logs.length === 0 ? (
          <EmptyState title={t("noData", lang)} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("date", lang)}</th>
                <th>{pick(lang, "প্রাপক", "To")}</th>
                <th>{pick(lang, "ধরন", "Type")}</th>
                <th>{t("message", lang)}</th>
                <th>{t("status", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="muted whitespace-nowrap">{formatDateTime(log.createdAt, lang)}</td>
                  <td>
                    {log.tenant ? (
                      <Link href={`/tenants/${log.tenant.id}`} className="font-semibold">
                        {log.tenant.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">—</span>
                    )}
                    <span className="num block text-2xs muted">{log.phone}</span>
                  </td>
                  <td className="muted">{label(SMS_TYPES, log.type, lang)}</td>
                  <td className="max-w-md">
                    <span className="line-clamp-2 block text-xs">{log.message}</span>
                  </td>
                  <td>
                    <Badge tone={tone(SMS_STATUS, log.status)}>{label(SMS_STATUS, log.status, lang)}</Badge>
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
