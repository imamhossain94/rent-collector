import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Plus,
  Pencil,
  MapPin,
  Users,
  DoorOpen,
  Zap,
  Wallet,
  ReceiptText,
} from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  CardHead,
  TableWrap,
  EmptyState,
  Badge,
  StatCard,
  Field,
  FormGrid,
  Input,
  Select,
  Money,
} from "@/components/ui";
import { Modal, SubmitButton, ConfirmButton } from "@/components/client-bits";
import { createUnitAction, updateUnitAction, deleteUnitAction } from "@/app/actions/properties";
import { money, num, currentMonth, monthRange } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, PROPERTY_TYPES, UNIT_TYPES, UNIT_STATUS, type Lang } from "@/lib/constants";
import { sum } from "@/lib/utils";

function UnitFormFields({ lang, unit }: { lang: Lang; unit?: Record<string, unknown> }) {
  const u = unit as
    | {
        name: string;
        floor: string | null;
        type: string;
        bedrooms: number;
        bathrooms: number;
        sizeSqft: number | null;
        rentAmount: number;
        serviceCharge: number;
        meterNumber: string | null;
        status: string;
      }
    | undefined;

  return (
    <FormGrid>
      <Field label={t("unitName", lang)} required>
        <Input name="name" defaultValue={u?.name} required placeholder={pick(lang, "যেমন: A-1", "e.g. A-1")} />
      </Field>
      <Field label={t("floor", lang)}>
        <Input name="floor" defaultValue={u?.floor ?? ""} placeholder={pick(lang, "যেমন: ৩য়", "e.g. 3rd")} />
      </Field>
      <Field label={pick(lang, "ইউনিটের ধরন", "Unit type")}>
        <Select name="type" defaultValue={u?.type ?? "FLAT"}>
          {UNIT_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {lang === "bn" ? o.bn : o.en}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("rent", lang)} required>
        <Input name="rentAmount" type="number" step="1" defaultValue={u?.rentAmount ?? 0} required />
      </Field>
      <Field label={t("serviceCharge", lang)}>
        <Input name="serviceCharge" type="number" step="1" defaultValue={u?.serviceCharge ?? 0} />
      </Field>
      <Field label={t("meterNo", lang)}>
        <Input name="meterNumber" defaultValue={u?.meterNumber ?? ""} />
      </Field>
      <Field label={t("bedrooms", lang)}>
        <Input name="bedrooms" type="number" defaultValue={u?.bedrooms ?? 0} />
      </Field>
      <Field label={t("bathrooms", lang)}>
        <Input name="bathrooms" type="number" defaultValue={u?.bathrooms ?? 0} />
      </Field>
      <Field label={t("sizeSqft", lang)}>
        <Input name="sizeSqft" type="number" defaultValue={u?.sizeSqft ?? ""} />
      </Field>
      {u ? (
        <Field label={t("status", lang)}>
          <Select name="status" defaultValue={u.status}>
            {UNIT_STATUS.map((o) => (
              <option key={o.value} value={o.value}>
                {lang === "bn" ? o.bn : o.en}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </FormGrid>
  );
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");
  const month = currentMonth();
  const { start, end } = monthRange(month);

  const property = await prisma.property.findFirst({
    where: { id, ownerId: user.id },
    include: {
      units: {
        orderBy: { name: "asc" },
        include: {
          tenants: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, phone: true, rentAmount: true },
          },
        },
      },
    },
  });
  if (!property) notFound();

  const [monthBills, monthExpenses] = await Promise.all([
    prisma.bill.findMany({
      where: { propertyId: id, billingMonth: month, status: { not: "VOID" } },
      select: { total: true, paidAmount: true },
    }),
    prisma.expense.aggregate({
      where: { propertyId: id, spentAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const occupied = property.units.filter((u) => u.status === "OCCUPIED").length;
  const billed = sum(monthBills, (b) => b.total);
  const collected = sum(monthBills, (b) => b.paidAmount);

  return (
    <div className="space-y-5">
      <PageHeader
        title={property.name}
        subtitle={[property.addressLine, property.area, property.city].filter(Boolean).join(", ")}
        icon={<Building2 className="size-4" />}
        actions={
          <>
            <Badge tone="primary">{label(PROPERTY_TYPES, property.type, lang)}</Badge>
            <Link href={`/properties/${property.id}/edit`} className="btn btn-outline btn-sm">
              <Pencil className="size-4" />
              {t("edit", lang)}
            </Link>
            <Modal
              title={t("addUnit", lang)}
              description={pick(lang, "ফ্ল্যাট, রুম, দোকান বা গ্যারেজ", "Flat, room, shop or garage")}
              wide
              trigger={
                <button className="btn btn-primary btn-sm">
                  <Plus className="size-4" />
                  {t("addUnit", lang)}
                </button>
              }
            >
              <form action={createUnitAction} className="space-y-4">
                <input type="hidden" name="propertyId" value={property.id} />
                <UnitFormFields lang={lang} />
                <Field
                  label={pick(lang, "কতটি ইউনিট তৈরি করবেন", "How many units to create")}
                  hint={pick(
                    lang,
                    "১ এর বেশি দিলে নামের শেষে ১, ২, ৩ যোগ হবে (যেমন A-1, A-2)।",
                    "More than 1 appends 1, 2, 3 to the name (A-1, A-2 …).",
                  )}
                >
                  <Input name="count" type="number" min={1} max={50} defaultValue={1} />
                </Field>
                <SubmitButton className="btn btn-primary w-full">{t("add", lang)}</SubmitButton>
              </form>
            </Modal>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("units", lang)}
          value={`${num(occupied, lang)}/${num(property.units.length, lang)}`}
          hint={pick(lang, "ভাড়া / মোট", "occupied / total")}
          icon={<DoorOpen className="size-4" />}
        />
        <StatCard
          label={t("billed", lang)}
          value={money(billed, lang)}
          hint={pick(lang, "চলতি মাসে", "this month")}
          icon={<ReceiptText className="size-4" />}
        />
        <StatCard
          label={t("collected", lang)}
          value={money(collected, lang)}
          tone="success"
          hint={money(billed - collected, lang) + " " + t("due", lang)}
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label={t("expenses", lang)}
          value={money(monthExpenses._sum.amount ?? 0, lang)}
          tone="warning"
          hint={pick(lang, "চলতি মাসে", "this month")}
          icon={<Zap className="size-4" />}
        />
      </div>

      <Card pad={false}>
        <div className="card-pad pb-2">
          <CardHead
            title={pick(lang, "ইউনিট তালিকা", "Units")}
            description={pick(
              lang,
              "প্রতিটি ইউনিটে কে থাকে ও ভাড়া কত",
              "Who lives in each unit and what they pay",
            )}
          />
        </div>

        {property.units.length === 0 ? (
          <EmptyState
            icon={<DoorOpen className="size-5" />}
            title={pick(lang, "কোনো ইউনিট নেই", "No units yet")}
            description={pick(lang, "উপরের 'ইউনিট যোগ করুন' বাটনে চাপ দিন।", "Use the Add unit button above.")}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("unitName", lang)}</th>
                <th>{pick(lang, "ধরন", "Type")}</th>
                <th>{t("tenantName", lang)}</th>
                <th className="text-right">{t("rent", lang)}</th>
                <th>{t("status", lang)}</th>
                <th className="text-right">{t("actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {property.units.map((unit) => {
                const tenant = unit.tenants[0];
                return (
                  <tr key={unit.id}>
                    <td className="font-bold">
                      {unit.name}
                      {unit.floor ? <span className="ml-1 text-2xs muted">({unit.floor})</span> : null}
                    </td>
                    <td className="muted">{label(UNIT_TYPES, unit.type, lang)}</td>
                    <td>
                      {tenant ? (
                        <Link href={`/tenants/${tenant.id}`} className="font-semibold">
                          {tenant.name}
                          <span className="num ml-1 block text-2xs muted">{tenant.phone}</span>
                        </Link>
                      ) : (
                        <Link href={`/tenants/new?unitId=${unit.id}`} className="link inline-flex items-center gap-1">
                          <Users className="size-3.5" />
                          {t("addTenant", lang)}
                        </Link>
                      )}
                    </td>
                    <td className="text-right">
                      <Money value={money(tenant?.rentAmount || unit.rentAmount, lang)} />
                    </td>
                    <td>
                      <Badge tone={tone(UNIT_STATUS, unit.status)}>{label(UNIT_STATUS, unit.status, lang)}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Modal
                          title={`${t("edit", lang)} — ${unit.name}`}
                          wide
                          trigger={
                            <button className="btn btn-ghost btn-icon-sm" title={t("edit", lang)}>
                              <Pencil className="size-4" />
                            </button>
                          }
                        >
                          <form action={updateUnitAction} className="space-y-4">
                            <input type="hidden" name="id" value={unit.id} />
                            <UnitFormFields lang={lang} unit={unit} />
                            <SubmitButton className="btn btn-primary w-full">{t("saveChanges", lang)}</SubmitButton>
                          </form>
                        </Modal>
                        <form action={deleteUnitAction}>
                          <input type="hidden" name="id" value={unit.id} />
                          <ConfirmButton message={t("confirmDelete", lang)} className="btn btn-ghost btn-icon-sm text-[color:var(--destructive)]">
                            ✕
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Card>
        <CardHead title={t("billingDefaults", lang)} />
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
          {[
            [t("electricityRate", lang), money(property.electricityRate, lang)],
            [t("serviceCharge", lang), money(property.serviceCharge, lang)],
            [t("gasCharge", lang), money(property.gasCharge, lang)],
            [t("waterCharge", lang), money(property.waterCharge, lang)],
            [t("dueDay", lang), num(property.dueDay, lang)],
            [t("lateFee", lang), money(property.lateFee, lang)],
          ].map(([k, v]) => (
            <div key={k} className="rounded border border-border p-2.5">
              <p className="text-2xs muted">{k}</p>
              <p className="num mt-0.5 font-bold">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-2 text-xs muted">
        <MapPin className="size-4" />
        {[property.addressLine, property.area, property.city, property.district, property.division]
          .filter(Boolean)
          .join(", ") || pick(lang, "ঠিকানা যোগ করা হয়নি", "No address recorded")}
      </div>
    </div>
  );
}
