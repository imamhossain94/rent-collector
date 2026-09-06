"use client";

import { useState } from "react";
import Link from "next/link";
import { Wand2 } from "lucide-react";
import { Field, FormGrid, Input, Select, Textarea, Card, CardHead } from "./ui";
import { SubmitButton } from "./client-bits";
import { ELECTRICITY_MODES, TENANT_STATUS, type Lang } from "@/lib/constants";
import { pick, t } from "@/lib/i18n";
import { toDateInput, money } from "@/lib/format";

export type UnitOption = {
  id: string;
  name: string;
  propertyName: string;
  rentAmount: number;
  serviceCharge: number;
  gasCharge: number;
  waterCharge: number;
  electricityRate: number;
  occupiedBy: string | null;
};

type TenantLike = {
  id: string;
  unitId: string | null;
  name: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  nid: string | null;
  occupation: string | null;
  permanentAddress: string | null;
  familyMembers: number;
  emergencyName: string | null;
  emergencyPhone: string | null;
  moveInDate: Date;
  agreementStart: Date | null;
  agreementEnd: Date | null;
  rentAmount: number;
  serviceCharge: number;
  advanceAmount: number;
  openingDue: number;
  electricityMode: string;
  electricityRate: number;
  fixedElectricity: number;
  gasCharge: number;
  waterCharge: number;
  otherCharge: number;
  otherChargeLabel: string | null;
  status: string;
  notes: string | null;
};

export function TenantForm({
  action,
  tenant,
  units,
  lang,
  defaultUnitId,
}: {
  action: (fd: FormData) => Promise<void>;
  tenant?: TenantLike;
  units: UnitOption[];
  lang: Lang;
  defaultUnitId?: string;
}) {
  const [unitId, setUnitId] = useState(tenant?.unitId ?? defaultUnitId ?? "");
  const selected = units.find((u) => u.id === unitId);

  // Money fields are controlled so picking a unit can pre-fill the property's
  // defaults. Whatever ends up here is what the tenant is actually billed.
  const [charges, setCharges] = useState({
    rentAmount: tenant?.rentAmount ?? 0,
    serviceCharge: tenant?.serviceCharge ?? 0,
    gasCharge: tenant?.gasCharge ?? 0,
    waterCharge: tenant?.waterCharge ?? 0,
    electricityRate: tenant?.electricityRate ?? 9,
    advanceAmount: tenant?.advanceAmount ?? 0,
  });

  const applyUnitDefaults = (unit: UnitOption | undefined, force = false) => {
    if (!unit) return;
    setCharges((prev) => ({
      rentAmount: force || !prev.rentAmount ? unit.rentAmount : prev.rentAmount,
      serviceCharge: force || !prev.serviceCharge ? unit.serviceCharge : prev.serviceCharge,
      gasCharge: force || !prev.gasCharge ? unit.gasCharge : prev.gasCharge,
      waterCharge: force || !prev.waterCharge ? unit.waterCharge : prev.waterCharge,
      electricityRate: force || !prev.electricityRate ? unit.electricityRate || 9 : prev.electricityRate,
      advanceAmount: force || !prev.advanceAmount ? unit.rentAmount : prev.advanceAmount,
    }));
  };

  const setCharge = (key: keyof typeof charges, value: number) =>
    setCharges((prev) => ({ ...prev, [key]: value }));

  const monthlyTotal =
    charges.rentAmount + charges.serviceCharge + charges.gasCharge + charges.waterCharge;

  return (
    <form action={action} className="space-y-4">
      {tenant ? <input type="hidden" name="id" value={tenant.id} /> : null}

      <Card>
        <CardHead
          title={pick(lang, "ভাড়াটিয়ার পরিচয়", "Tenant identity")}
          description={pick(
            lang,
            "এনআইডি ও যোগাযোগের তথ্য রাখা নিরাপদ — ঝামেলা হলে কাজে লাগে।",
            "Keeping NID and contact details on file protects you if a dispute starts.",
          )}
        />
        <FormGrid>
          <Field label={t("tenantName", lang)} required>
            <Input name="name" defaultValue={tenant?.name} required />
          </Field>
          <Field label={t("phone", lang)} required>
            <Input name="phone" defaultValue={tenant?.phone} required inputMode="numeric" placeholder="01712345678" />
          </Field>
          <Field label={pick(lang, "বিকল্প নম্বর", "Alternate phone")}>
            <Input name="altPhone" defaultValue={tenant?.altPhone ?? ""} inputMode="numeric" />
          </Field>
          <Field label={t("nid", lang)}>
            <Input name="nid" defaultValue={tenant?.nid ?? ""} />
          </Field>
          <Field label={t("occupation", lang)}>
            <Input name="occupation" defaultValue={tenant?.occupation ?? ""} />
          </Field>
          <Field label={t("familyMembers", lang)}>
            <Input name="familyMembers" type="number" min={1} defaultValue={tenant?.familyMembers ?? 1} />
          </Field>
          <Field label={t("email", lang)}>
            <Input name="email" type="email" defaultValue={tenant?.email ?? ""} />
          </Field>
          <Field label={pick(lang, "জরুরি যোগাযোগের নাম", "Emergency contact name")}>
            <Input name="emergencyName" defaultValue={tenant?.emergencyName ?? ""} />
          </Field>
          <Field label={pick(lang, "জরুরি যোগাযোগের নম্বর", "Emergency contact phone")}>
            <Input name="emergencyPhone" defaultValue={tenant?.emergencyPhone ?? ""} inputMode="numeric" />
          </Field>
          <Field label={t("permanentAddress", lang)} className="sm:col-span-2">
            <Textarea name="permanentAddress" rows={2} defaultValue={tenant?.permanentAddress ?? ""} />
          </Field>
        </FormGrid>
      </Card>

      <Card>
        <CardHead
          title={pick(lang, "ভাড়া ও চুক্তি", "Tenancy & agreement")}
          description={pick(
            lang,
            "১৯৯১ সালের বাড়ি ভাড়া নিয়ন্ত্রণ আইন অনুযায়ী অগ্রিম সাধারণত এক মাসের ভাড়ার বেশি নয়।",
            "Under the Premises Rent Control Act 1991 advance is normally capped at one month's rent.",
          )}
          action={
            selected ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => applyUnitDefaults(selected, true)}
                title={pick(lang, "ইউনিটের ডিফল্ট বসান", "Fill from unit defaults")}
              >
                <Wand2 className="size-4" />
                {pick(lang, "ডিফল্ট বসান", "Use defaults")}
              </button>
            ) : undefined
          }
        />
        <FormGrid>
          <Field label={t("unitAssign", lang)} required>
            <Select
              name="unitId"
              required
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                applyUnitDefaults(
                  units.find((u) => u.id === e.target.value),
                  !tenant,
                );
              }}
            >
              <option value="">{pick(lang, "— ইউনিট বাছাই করুন —", "— pick a unit —")}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id} disabled={!!u.occupiedBy && u.id !== tenant?.unitId}>
                  {u.propertyName} · {u.name}
                  {u.occupiedBy && u.id !== tenant?.unitId ? ` (${u.occupiedBy})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("rent", lang)} required>
            <Input
              name="rentAmount"
              type="number"
              step="1"
              required
              value={charges.rentAmount || ""}
              onChange={(e) => setCharge("rentAmount", Number(e.target.value))}
            />
          </Field>
          <Field label={t("serviceCharge", lang)}>
            <Input
              name="serviceCharge"
              type="number"
              step="1"
              value={charges.serviceCharge || ""}
              onChange={(e) => setCharge("serviceCharge", Number(e.target.value))}
            />
          </Field>
          <Field label={t("advance", lang)} hint={pick(lang, "ফেরতযোগ্য জামানত", "Refundable deposit")}>
            <Input
              name="advanceAmount"
              type="number"
              step="1"
              value={charges.advanceAmount || ""}
              onChange={(e) => setCharge("advanceAmount", Number(e.target.value))}
            />
          </Field>
          <Field label={t("moveIn", lang)}>
            <Input name="moveInDate" type="date" defaultValue={toDateInput(tenant?.moveInDate ?? new Date())} />
          </Field>
          <Field label={t("openingDue", lang)} hint={pick(lang, "পুরোনো খাতার বকেয়া", "Due carried in from your paper khata")}>
            <Input name="openingDue" type="number" step="1" defaultValue={tenant?.openingDue ?? 0} />
          </Field>
          <Field label={pick(lang, "চুক্তি শুরু", "Agreement start")}>
            <Input name="agreementStart" type="date" defaultValue={toDateInput(tenant?.agreementStart)} />
          </Field>
          <Field label={pick(lang, "চুক্তি শেষ", "Agreement end")}>
            <Input name="agreementEnd" type="date" defaultValue={toDateInput(tenant?.agreementEnd)} />
          </Field>
          {tenant ? (
            <Field label={t("status", lang)}>
              <Select name="status" defaultValue={tenant.status}>
                {TENANT_STATUS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {lang === "bn" ? o.bn : o.en}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </FormGrid>
      </Card>

      <Card>
        <CardHead
          title={t("utilitySetup", lang)}
          description={pick(
            lang,
            "এখানে যা লিখবেন প্রতি মাসের বিলে ঠিক তাই বসবে — খালি রাখলে ওই খাত বিলে আসবে না।",
            "Whatever you put here is exactly what gets billed each month — leave a field empty and it never appears on the bill.",
          )}
        />
        <FormGrid cols={3}>
          <Field label={t("electricityMode", lang)}>
            <Select name="electricityMode" defaultValue={tenant?.electricityMode ?? "SUBMETER"}>
              {ELECTRICITY_MODES.map((o) => (
                <option key={o.value} value={o.value}>
                  {lang === "bn" ? o.bn : o.en}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("electricityRate", lang)}>
            <Input
              name="electricityRate"
              type="number"
              step="0.01"
              value={charges.electricityRate || ""}
              onChange={(e) => setCharge("electricityRate", Number(e.target.value))}
            />
          </Field>
          <Field label={t("fixedElectricity", lang)}>
            <Input name="fixedElectricity" type="number" step="1" defaultValue={tenant?.fixedElectricity ?? 0} />
          </Field>
          <Field label={t("gasCharge", lang)}>
            <Input
              name="gasCharge"
              type="number"
              step="1"
              value={charges.gasCharge || ""}
              onChange={(e) => setCharge("gasCharge", Number(e.target.value))}
            />
          </Field>
          <Field label={t("waterCharge", lang)}>
            <Input
              name="waterCharge"
              type="number"
              step="1"
              value={charges.waterCharge || ""}
              onChange={(e) => setCharge("waterCharge", Number(e.target.value))}
            />
          </Field>
          <Field label={t("otherCharge", lang)}>
            <Input name="otherCharge" type="number" step="1" defaultValue={tenant?.otherCharge ?? 0} />
          </Field>
          <Field label={pick(lang, "অন্যান্য চার্জের নাম", "Other charge label")} className="sm:col-span-2">
            <Input
              name="otherChargeLabel"
              defaultValue={tenant?.otherChargeLabel ?? ""}
              placeholder={pick(lang, "যেমন: ময়লা বিল", "e.g. Garbage bill")}
            />
          </Field>
          <Field label={t("note", lang)} className="sm:col-span-3">
            <Textarea name="notes" rows={2} defaultValue={tenant?.notes ?? ""} />
          </Field>
        </FormGrid>

        <div className="mt-3 flex items-center justify-between rounded border border-border bg-[color-mix(in_oklab,var(--muted)_35%,transparent)] px-3 py-2 text-xs">
          <span className="muted">
            {pick(lang, "বিদ্যুৎ ছাড়া প্রতি মাসের নির্দিষ্ট বিল", "Fixed monthly bill, before electricity")}
          </span>
          <span className="num font-extrabold text-[color:var(--primary)]">{money(monthlyTotal, lang)}</span>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <SubmitButton className="btn btn-primary">{tenant ? t("saveChanges", lang) : t("create", lang)}</SubmitButton>
        <Link href={tenant ? `/tenants/${tenant.id}` : "/tenants"} className="btn btn-outline">
          {t("cancel", lang)}
        </Link>
      </div>
    </form>
  );
}
