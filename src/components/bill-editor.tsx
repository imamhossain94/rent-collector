"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Zap, RotateCcw } from "lucide-react";
import { Field, FormGrid, Input, Select, Textarea, Card, CardHead } from "./ui";
import { SubmitButton } from "./client-bits";
import { pick, t } from "@/lib/i18n";
import { money, toDateInput } from "@/lib/format";
import { BILL_ITEM_TYPES, type Lang } from "@/lib/constants";

export type BillTenantOption = {
  id: string;
  name: string;
  phone: string;
  unitLabel: string;
  meterNumber: string | null;
  rentAmount: number;
  serviceCharge: number;
  gasCharge: number;
  waterCharge: number;
  otherCharge: number;
  otherChargeLabel: string | null;
  electricityMode: string;
  electricityRate: number;
  fixedElectricity: number;
  lastReading: number;
  balance: number;
  advanceAmount: number;
  dueDay: number;
};

type Row = { key: string; type: string; label: string; amount: number; locked?: boolean };

let seq = 0;
const newKey = () => `r${++seq}`;

function rowsForTenant(tenant: BillTenantOption | undefined, lang: Lang): Row[] {
  if (!tenant) return [];
  const rows: Row[] = [];
  const labelOf = (type: string) => {
    const o = BILL_ITEM_TYPES.find((x) => x.value === type);
    return lang === "bn" ? (o?.bn ?? type) : (o?.en ?? type);
  };
  rows.push({ key: newKey(), type: "RENT", label: labelOf("RENT"), amount: tenant.rentAmount });
  if (tenant.serviceCharge)
    rows.push({ key: newKey(), type: "SERVICE", label: labelOf("SERVICE"), amount: tenant.serviceCharge });
  if (tenant.gasCharge) rows.push({ key: newKey(), type: "GAS", label: labelOf("GAS"), amount: tenant.gasCharge });
  if (tenant.waterCharge)
    rows.push({ key: newKey(), type: "WATER", label: labelOf("WATER"), amount: tenant.waterCharge });
  if (tenant.otherCharge)
    rows.push({
      key: newKey(),
      type: "OTHER",
      label: tenant.otherChargeLabel || labelOf("OTHER"),
      amount: tenant.otherCharge,
    });
  return rows;
}

export function BillEditor({
  action,
  tenants,
  lang,
  defaultTenantId,
  defaultMonth,
  bill,
}: {
  action: (fd: FormData) => Promise<void>;
  tenants: BillTenantOption[];
  lang: Lang;
  defaultTenantId?: string;
  defaultMonth: string;
  /** present when editing an already-issued bill */
  bill?: {
    id: string;
    billNo: string;
    billingMonth: string;
    dueDate: Date;
    previousDue: number;
    discount: number;
    advanceAdjust: number;
    lateFee: number;
    note: string | null;
    items: { type: string; label: string; amount: number }[];
    reading: { previous: number; current: number; rate: number } | null;
  };
}) {
  const [tenantId, setTenantId] = useState(bill ? (defaultTenantId ?? "") : (defaultTenantId ?? tenants[0]?.id ?? ""));
  const tenant = useMemo(() => tenants.find((x) => x.id === tenantId), [tenants, tenantId]);

  const [rows, setRows] = useState<Row[]>(() =>
    bill
      ? bill.items
          .filter((i) => i.type !== "ELECTRICITY")
          .map((i) => ({ key: newKey(), type: i.type, label: i.label, amount: i.amount }))
      : rowsForTenant(tenants.find((x) => x.id === (defaultTenantId ?? tenants[0]?.id)), lang),
  );

  // electricity is its own block: sub-meter reading, or a typed-in amount
  const initialElecMode = bill
    ? bill.reading
      ? "METER"
      : bill.items.some((i) => i.type === "ELECTRICITY")
        ? "MANUAL"
        : "NONE"
    : tenant?.electricityMode === "SUBMETER"
      ? "METER"
      : tenant?.electricityMode === "FIXED"
        ? "MANUAL"
        : "NONE";

  const [elecMode, setElecMode] = useState<string>(initialElecMode);
  const [previous, setPrevious] = useState<number>(bill?.reading?.previous ?? tenant?.lastReading ?? 0);
  const [current, setCurrent] = useState<string>(bill?.reading?.current ? String(bill.reading.current) : "");
  const [rate, setRate] = useState<number>(bill?.reading?.rate ?? tenant?.electricityRate ?? 9);
  const [manualElec, setManualElec] = useState<number>(
    bill?.items.find((i) => i.type === "ELECTRICITY" && !bill.reading)?.amount ?? tenant?.fixedElectricity ?? 0,
  );

  const [discount, setDiscount] = useState(bill?.discount ?? 0);
  const [advanceAdjust, setAdvanceAdjust] = useState(bill?.advanceAdjust ?? 0);
  const [lateFee, setLateFee] = useState(bill?.lateFee ?? 0);

  const units = Math.max(0, (Number(current) || 0) - (Number(previous) || 0));
  const electricity =
    elecMode === "METER" ? Math.round(units * rate * 100) / 100 : elecMode === "MANUAL" ? Number(manualElec) || 0 : 0;

  const subtotal = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) + electricity;
  const total = subtotal + (Number(lateFee) || 0) - (Number(discount) || 0) - (Number(advanceAdjust) || 0);
  const previousDue = bill ? bill.previousDue : (tenant?.balance ?? 0);
  const payable = total + previousDue;

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { key: newKey(), type: "OTHER", label: pick(lang, "নতুন খাত", "New charge"), amount: 0 },
    ]);

  const resetToTenant = () => {
    setRows(rowsForTenant(tenant, lang));
    setPrevious(tenant?.lastReading ?? 0);
    setCurrent("");
    setRate(tenant?.electricityRate ?? 9);
    setElecMode(tenant?.electricityMode === "FIXED" ? "MANUAL" : tenant?.electricityMode === "NONE" ? "NONE" : "METER");
    setManualElec(tenant?.fixedElectricity ?? 0);
  };

  return (
    <form action={action} className="space-y-4">
      {bill ? <input type="hidden" name="id" value={bill.id} /> : null}
      <input type="hidden" name="itemCount" value={rows.length} />
      <input type="hidden" name="electricityAmount" value={electricity} />
      <input type="hidden" name="electricityMode" value={elecMode} />

      <Card>
        <CardHead
          title={pick(lang, "কার বিল", "Who is this bill for")}
          description={
            bill
              ? `${bill.billNo} — ${pick(lang, "খাত ও টাকা বদলানো যাবে", "line items and amounts can be edited")}`
              : pick(lang, "ভাড়াটিয়া বাছাই করলে তার খাতগুলো নিচে বসে যাবে", "Pick a tenant and their charges drop in below")
          }
        />
        <FormGrid>
          <Field label={t("tenantName", lang)} required>
            <Select
              name="tenantId"
              required
              value={tenantId}
              disabled={!!bill}
              onChange={(e) => {
                const next = tenants.find((x) => x.id === e.target.value);
                setTenantId(e.target.value);
                setRows(rowsForTenant(next, lang));
                setPrevious(next?.lastReading ?? 0);
                setCurrent("");
                setRate(next?.electricityRate ?? 9);
                setManualElec(next?.fixedElectricity ?? 0);
                setElecMode(
                  next?.electricityMode === "FIXED" ? "MANUAL" : next?.electricityMode === "NONE" ? "NONE" : "METER",
                );
              }}
            >
              <option value="">{pick(lang, "— বাছাই করুন —", "— pick a tenant —")}</option>
              {tenants.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name} · {tn.unitLabel} · {tn.phone}
                </option>
              ))}
            </Select>
          </Field>
          {bill ? <input type="hidden" name="tenantId" value={tenantId} /> : null}
          <Field label={t("billingMonth", lang)} required>
            <Input name="billingMonth" type="month" defaultValue={bill?.billingMonth ?? defaultMonth} required />
          </Field>
          <Field label={t("dueDate", lang)}>
            <Input name="dueDate" type="date" defaultValue={bill ? toDateInput(bill.dueDate) : ""} />
          </Field>
          {tenant ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border p-3">
                <p className="text-2xs muted">{t("previousDue", lang)}</p>
                <p
                  className="num mt-1 text-base font-bold"
                  style={{ color: previousDue > 0 ? "var(--destructive)" : "var(--success)" }}
                >
                  {money(Math.abs(previousDue), lang)}
                </p>
              </div>
              <div className="rounded border border-border p-3">
                <p className="text-2xs muted">{t("advance", lang)}</p>
                <p className="num mt-1 text-base font-bold">{money(tenant.advanceAmount, lang)}</p>
              </div>
            </div>
          ) : null}
        </FormGrid>
      </Card>

      {/* ------------------------------ line items ------------------------------ */}
      <Card pad={false}>
        <div className="card-pad pb-3">
          <CardHead
            title={t("billItems", lang)}
            description={pick(
              lang,
              "প্রতিটি খাতের নাম ও টাকা বদলাতে পারেন, নতুন খাত যোগ করতে পারেন।",
              "Rename or re-price any line, and add as many as you need.",
            )}
            action={
              tenant ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetToTenant}>
                  <RotateCcw className="size-4" />
                  {pick(lang, "ভাড়াটিয়ার হিসাব ফিরিয়ে আনুন", "Reset from tenant")}
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="space-y-2 px-5 pb-4">
          {rows.map((row, i) => (
            <div key={row.key} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-12 sm:col-span-3">
                <span className="label">{pick(lang, "ধরন", "Type")}</span>
                <Select
                  name={`itemType_${i}`}
                  value={row.type}
                  onChange={(e) => {
                    const o = BILL_ITEM_TYPES.find((x) => x.value === e.target.value);
                    setRow(row.key, {
                      type: e.target.value,
                      label: o ? (lang === "bn" ? o.bn : o.en) : row.label,
                    });
                  }}
                >
                  {BILL_ITEM_TYPES.filter((o) => o.value !== "ELECTRICITY").map((o) => (
                    <option key={o.value} value={o.value}>
                      {lang === "bn" ? o.bn : o.en}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-8 sm:col-span-6">
                <span className="label">{pick(lang, "বিবরণ", "Description")}</span>
                <Input
                  name={`itemLabel_${i}`}
                  value={row.label}
                  onChange={(e) => setRow(row.key, { label: e.target.value })}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <span className="label">{t("amount", lang)}</span>
                <Input
                  name={`itemAmount_${i}`}
                  type="number"
                  step="1"
                  className="text-right"
                  value={row.amount || ""}
                  onChange={(e) => setRow(row.key, { amount: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  className="btn btn-ghost btn-icon-sm text-[color:var(--destructive)]"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  title={t("delete", lang)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-outline btn-sm mt-1" onClick={addRow}>
            <Plus className="size-4" />
            {pick(lang, "নতুন খাত যোগ করুন", "Add a charge")}
          </button>
        </div>
      </Card>

      {/* ------------------------------ electricity ------------------------------ */}
      <Card>
        <CardHead
          title={pick(lang, "বিদ্যুৎ বিল", "Electricity")}
          description={
            tenant?.meterNumber
              ? `${pick(lang, "সাব-মিটার", "Sub-meter")} ${tenant.meterNumber}`
              : pick(lang, "সাব-মিটারের রিডিং, নাকি হাতে লেখা টাকা", "From a sub-meter reading, or typed in by hand")
          }
        />
        <FormGrid cols={4}>
          <Field label={pick(lang, "কীভাবে হিসাব", "How to charge")}>
            <Select value={elecMode} onChange={(e) => setElecMode(e.target.value)}>
              <option value="METER">{pick(lang, "সাব-মিটার (ইউনিট × রেট)", "Sub-meter (unit × rate)")}</option>
              <option value="MANUAL">{pick(lang, "নির্দিষ্ট টাকা", "Fixed amount")}</option>
              <option value="NONE">{pick(lang, "এই মাসে নেই", "Not this month")}</option>
            </Select>
          </Field>

          {elecMode === "METER" ? (
            <>
              <Field label={t("previousReading", lang)}>
                <Input
                  name="previousReading"
                  type="number"
                  step="0.01"
                  value={previous}
                  onChange={(e) => setPrevious(Number(e.target.value))}
                />
              </Field>
              <Field label={t("currentReading", lang)}>
                <Input
                  name="currentReading"
                  type="number"
                  step="0.01"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </Field>
              <Field label={`${t("rate", lang)} (৳/${pick(lang, "ইউনিট", "unit")})`}>
                <Input
                  name="electricityRate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </Field>
            </>
          ) : elecMode === "MANUAL" ? (
            <Field label={pick(lang, "বিদ্যুৎ বিল (টাকা)", "Electricity amount")}>
              <Input
                name="manualElectricity"
                type="number"
                step="1"
                value={manualElec || ""}
                onChange={(e) => setManualElec(Number(e.target.value))}
              />
            </Field>
          ) : null}
        </FormGrid>

        {elecMode !== "NONE" ? (
          <div className="mt-3 flex flex-wrap items-center gap-5 rounded border border-border bg-[color-mix(in_oklab,var(--muted)_35%,transparent)] px-4 py-3 text-xs">
            <span className="flex items-center gap-2">
              <Zap className="size-4 text-[color:var(--warning)]" />
              {elecMode === "METER" ? (
                <>
                  <span className="muted">{t("unitsUsed", lang)}</span>
                  <span className="num font-bold">{units}</span>
                </>
              ) : (
                <span className="muted">{pick(lang, "হাতে লেখা", "Entered by hand")}</span>
              )}
            </span>
            <span>
              <span className="muted">{pick(lang, "বিদ্যুৎ বিল", "Electricity")} </span>
              <span className="num font-bold text-[color:var(--primary)]">{money(electricity, lang)}</span>
            </span>
          </div>
        ) : null}
      </Card>

      {/* ------------------------------ adjustments ------------------------------ */}
      <Card>
        <CardHead
          title={pick(lang, "সমন্বয় ও ছাড়", "Adjustments")}
          description={pick(
            lang,
            "বিলম্ব ফি যোগ হয়; ছাড় ও অগ্রিম সমন্বয় বিল থেকে বাদ যায়।",
            "Late fee adds on; discount and advance adjustment come off.",
          )}
        />
        <FormGrid cols={3}>
          <Field label={t("lateFee", lang)}>
            <Input
              name="lateFee"
              type="number"
              step="1"
              value={lateFee || ""}
              onChange={(e) => setLateFee(Number(e.target.value))}
            />
          </Field>
          <Field label={`${t("discount", lang)} (${pick(lang, "লেস", "less")})`}>
            <Input
              name="discount"
              type="number"
              step="1"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </Field>
          <Field
            label={pick(lang, "অগ্রিম/জামানত সমন্বয়", "Advance adjustment")}
            hint={pick(lang, "জামানত থেকে কেটে নিলে", "Settled from the deposit")}
          >
            <Input
              name="advanceAdjust"
              type="number"
              step="1"
              value={advanceAdjust || ""}
              onChange={(e) => setAdvanceAdjust(Number(e.target.value))}
            />
          </Field>
          <Field label={t("note", lang)} className="sm:col-span-3">
            <Textarea name="note" rows={2} defaultValue={bill?.note ?? ""} />
          </Field>
        </FormGrid>
      </Card>

      {/* ------------------------------ live total ------------------------------ */}
      <Card>
        <CardHead title={pick(lang, "বিলের হিসাব", "Bill summary")} />
        <div className="space-y-2 text-sm">
          {rows.map((r) => (
            <Line key={r.key} label={r.label} value={money(Number(r.amount) || 0, lang)} />
          ))}
          {electricity ? <Line label={pick(lang, "বিদ্যুৎ বিল", "Electricity")} value={money(electricity, lang)} /> : null}
          <div className="divider my-2" />
          <Line label={pick(lang, "উপমোট", "Subtotal")} value={money(subtotal, lang)} />
          {lateFee ? <Line label={t("lateFee", lang)} value={`+ ${money(Number(lateFee), lang)}`} /> : null}
          {discount ? <Line label={t("discount", lang)} value={`- ${money(Number(discount), lang)}`} /> : null}
          {advanceAdjust ? (
            <Line label={pick(lang, "অগ্রিম সমন্বয়", "Advance adjustment")} value={`- ${money(Number(advanceAdjust), lang)}`} />
          ) : null}
          <Line label={pick(lang, "এ মাসের মোট", "Month total")} value={money(total, lang)} strong />
          {previousDue !== 0 ? (
            <Line label={t("previousDue", lang)} value={money(previousDue, lang)} />
          ) : null}
          <div className="divider my-2" />
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">{pick(lang, "সর্বমোট প্রদেয়", "Total payable")}</span>
            <span className="num text-xl font-extrabold text-[color:var(--primary)]">{money(payable, lang)}</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="btn btn-primary" disabled={!tenantId || rows.length + (electricity ? 1 : 0) === 0}>
          {bill ? t("saveChanges", lang) : t("create", lang)}
        </SubmitButton>
        <Link href={bill ? `/bills/${bill.id}` : "/bills"} className="btn btn-outline">
          {t("cancel", lang)}
        </Link>
      </div>
    </form>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-bold" : "muted"}>{label}</span>
      <span className={`num ${strong ? "font-extrabold" : "font-semibold"}`}>{value}</span>
    </div>
  );
}
