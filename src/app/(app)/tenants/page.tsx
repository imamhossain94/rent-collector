import Link from "next/link";
import { Users, Plus, Phone, Bell, UserPlus } from "lucide-react";
import { requireUser, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalances } from "@/lib/billing";
import {
  PageHeader,
  Card,
  CardHead,
  TableWrap,
  EmptyState,
  Badge,
  Avatar,
  Money,
  StatCard,
  Field,
  FormGrid,
  Input,
  Select,
} from "@/components/ui";
import { SearchBox, FilterSelect, Modal, SubmitButton } from "@/components/client-bits";
import { money, num, formatDate, initials } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, TENANT_STATUS, type Lang } from "@/lib/constants";
import { remindOneAction } from "@/app/actions/misc";
import { quickAddTenantAction } from "@/app/actions/tenants";
import { getUnitOptions } from "@/lib/queries";
import { toDateInput } from "@/lib/format";
import { recordPaymentAction } from "@/app/actions/payments";
import { CollectForm } from "@/components/collect-form";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; property?: string }>;
}) {
  const { q = "", status = "ACTIVE", property = "" } = await searchParams;
  const user = await requireUser();
  const lang = userLang(user);

  const [tenants, properties] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        ownerId: user.id,
        ...(status ? { status } : {}),
        ...(property ? { unit: { propertyId: property } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { nid: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { unit: { include: { property: { select: { id: true, name: true } } } } },
    }),
    prisma.property.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } }),
  ]);
  const units = await getUnitOptions(user.id);
  const vacantUnits = units.filter((u) => !u.occupiedBy);

  const balances = await tenantBalances(tenants.map((x) => x.id));
  const totalDue = tenants.reduce((acc, x) => acc + Math.max(0, balances.get(x.id) ?? 0), 0);
  const totalRent = tenants.filter((x) => x.status === "ACTIVE").reduce((acc, x) => acc + x.rentAmount, 0);
  const totalAdvance = tenants.filter((x) => x.status === "ACTIVE").reduce((acc, x) => acc + x.advanceAmount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("tenantTitle", lang)}
        subtitle={t("tenantSubtitle", lang)}
        icon={<Users className="size-4" />}
        actions={
          <>
            <Modal
              title={pick(lang, "দ্রুত ভাড়াটিয়া যোগ", "Quick add tenant")}
              description={pick(
                lang,
                "নাম, মোবাইল ও সদস্য সংখ্যা দিলেই হবে — বাকিটা পরে পূরণ করা যাবে",
                "Name, mobile and how many people — the rest can wait",
              )}
              trigger={
                <button className="btn btn-outline btn-sm">
                  <UserPlus className="size-4" />
                  {pick(lang, "দ্রুত যোগ", "Quick add")}
                </button>
              }
            >
              <form action={quickAddTenantAction} className="space-y-4">
                <FormGrid>
                  <Field label={t("tenantName", lang)} required>
                    <Input name="name" required autoFocus placeholder={pick(lang, "ভাড়াটিয়ার নাম", "Tenant name")} />
                  </Field>
                  <Field label={t("phone", lang)} required>
                    <Input name="phone" required inputMode="numeric" placeholder="01712345678" />
                  </Field>
                  <Field label={t("familyMembers", lang)} hint={pick(lang, "কতজন থাকবে", "How many people live here")}>
                    <Input name="familyMembers" type="number" min={1} defaultValue={1} />
                  </Field>
                  <Field label={t("unitAssign", lang)}>
                    <Select name="unitId" defaultValue="">
                      <option value="">{pick(lang, "— পরে ঠিক করব —", "— decide later —")}</option>
                      {vacantUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.propertyName} · {u.name} — {u.rentAmount}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("rent", lang)} hint={pick(lang, "খালি রাখলে ইউনিটের ভাড়া", "Blank uses the unit's rent")}>
                    <Input name="rentAmount" type="number" step="1" />
                  </Field>
                  <Field label={t("advance", lang)}>
                    <Input name="advanceAmount" type="number" step="1" />
                  </Field>
                  <Field label={t("moveIn", lang)}>
                    <Input name="moveInDate" type="date" defaultValue={toDateInput(new Date())} />
                  </Field>
                  <Field label={t("openingDue", lang)} hint={pick(lang, "পুরোনো খাতার বকেয়া", "Due from the paper khata")}>
                    <Input name="openingDue" type="number" step="1" />
                  </Field>
                </FormGrid>
                <SubmitButton className="btn btn-primary w-full">{t("add", lang)}</SubmitButton>
              </form>
            </Modal>
            <Link href="/tenants/new" className="btn btn-primary btn-sm">
              <Plus className="size-4" />
              {t("addTenant", lang)}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("tenants", lang)} value={num(tenants.filter((x) => x.status === "ACTIVE").length, lang)} />
        <StatCard label={pick(lang, "মাসিক ভাড়া", "Monthly rent roll")} value={money(totalRent, lang)} tone="primary" />
        <StatCard label={t("due", lang)} value={money(totalDue, lang)} tone="destructive" />
        <StatCard label={t("advance", lang)} value={money(totalAdvance, lang)} tone="warning" hint={pick(lang, "হাতে থাকা জামানত", "Deposits you hold")} />
      </div>

      <Card pad={false}>
        <div className="card-pad flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHead title={pick(lang, "তালিকা", "All tenants")} className="mb-0" />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox placeholder={pick(lang, "নাম, মোবাইল বা এনআইডি", "Name, phone or NID")} defaultValue={q} />
            <FilterSelect
              paramName="status"
              value={status}
              options={[
                { value: "ACTIVE", label: pick(lang, "চলমান", "Active") },
                { value: "NOTICE", label: pick(lang, "নোটিশে", "On notice") },
                { value: "LEFT", label: pick(lang, "চলে গেছে", "Left") },
                { value: "", label: t("all", lang) },
              ]}
            />
            <FilterSelect
              paramName="property"
              value={property}
              options={[
                { value: "", label: pick(lang, "সব সম্পত্তি", "All properties") },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        {tenants.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={pick(lang, "কোনো ভাড়াটিয়া পাওয়া যায়নি", "No tenants found")}
            description={pick(lang, "নতুন ভাড়াটিয়া যোগ করুন বা ফিল্টার বদলান।", "Add a tenant or change the filter.")}
            action={
              <Link href="/tenants/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" />
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
                <th className="text-right">{t("balance", lang)}</th>
                <th>{t("moveIn", lang)}</th>
                <th>{t("status", lang)}</th>
                <th className="text-right">{t("actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tn) => {
                const balance = balances.get(tn.id) ?? 0;
                return (
                  <tr key={tn.id}>
                    <td>
                      <Link href={`/tenants/${tn.id}`} className="flex items-center gap-2">
                        <Avatar text={initials(tn.name)} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{tn.name}</span>
                          <span className="num flex items-center gap-1 text-2xs muted">
                            <Phone className="size-3" />
                            {tn.phone}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="muted">
                      {tn.unit ? (
                        <Link href={`/properties/${tn.unit.property.id}`}>
                          {tn.unit.property.name} · {tn.unit.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-right">
                      <Money value={money(tn.rentAmount, lang)} />
                    </td>
                    <td className="text-right">
                      <Money
                        value={money(Math.abs(balance), lang)}
                        tone={balance > 0 ? "due" : balance < 0 ? "paid" : "plain"}
                      />
                      {balance < 0 ? (
                        <span className="block text-2xs muted">{pick(lang, "অগ্রিম জমা", "advance")}</span>
                      ) : null}
                    </td>
                    <td className="muted">{formatDate(tn.moveInDate, lang)}</td>
                    <td>
                      <Badge tone={tone(TENANT_STATUS, tn.status)}>{label(TENANT_STATUS, tn.status, lang)}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {balance > 0 ? (
                          <form action={remindOneAction}>
                            <input type="hidden" name="tenantId" value={tn.id} />
                            <SubmitButton className="btn btn-ghost btn-icon-sm" title={t("dueReminder", lang)}>
                              <Bell className="size-4" />
                            </SubmitButton>
                          </form>
                        ) : null}
                        <Modal
                          title={t("collectPayment", lang)}
                          description={`${tn.name} — ${money(Math.max(0, balance), lang)} ${t("due", lang)}`}
                          trigger={<button className="btn btn-outline btn-sm">{t("collect", lang)}</button>}
                        >
                          <CollectForm
                            action={recordPaymentAction}
                            lang={lang}
                            tenantId={tn.id}
                            defaultAmount={Math.max(0, balance)}
                          />
                        </Modal>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
