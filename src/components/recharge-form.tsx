import { Field, FormGrid, Input, Select, Textarea } from "./ui";
import { SubmitButton } from "./client-bits";
import { PAYMENT_METHODS, type Lang } from "@/lib/constants";
import { pick, t } from "@/lib/i18n";
import { toDateInput } from "@/lib/format";

/** Money loaded onto the building's prepaid DESCO meter. */
export function RechargeForm({
  action,
  lang,
  properties,
  billingMonth,
  defaultPropertyId,
}: {
  action: (fd: FormData) => Promise<void>;
  lang: Lang;
  properties: { id: string; name: string; mainMeterNumber: string | null }[];
  billingMonth: string;
  defaultPropertyId?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="billingMonth" value={billingMonth} />
      <FormGrid>
        <Field label={pick(lang, "কোন বাড়ির মিটার", "Which property's meter")} required>
          <Select name="propertyId" required defaultValue={defaultPropertyId ?? properties[0]?.id ?? ""}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.mainMeterNumber ? ` · ${p.mainMeterNumber}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={pick(lang, "রিচার্জের টাকা", "Recharge amount")} required>
          <Input name="amount" type="number" step="1" min={1} required autoFocus placeholder="2000" />
        </Field>
        <Field label={pick(lang, "কবে রিচার্জ করেছেন", "Recharged on")}>
          <Input name="rechargedAt" type="date" defaultValue={toDateInput(new Date())} />
        </Field>
        <Field label={t("method", lang)}>
          <Select name="method" defaultValue="BKASH">
            {PAYMENT_METHODS.filter((m) => m.value !== "CHEQUE").map((m) => (
              <option key={m.value} value={m.value}>
                {lang === "bn" ? m.bn : m.en}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={pick(lang, "টোকেন / ট্রানজেকশন নম্বর", "Token / transaction no.")}
          hint={pick(lang, "ডেসকো টোকেন বা বিকাশ TrxID", "DESCO token or bKash TrxID")}
        >
          <Input name="tokenRef" />
        </Field>
        <Field label={pick(lang, "মিটার নম্বর", "Meter number")} hint={pick(lang, "খালি রাখলে বাড়ির মিটার", "Blank uses the property's meter")}>
          <Input name="meterNumber" />
        </Field>
        <Field label={t("note", lang)} className="sm:col-span-2">
          <Textarea name="note" rows={2} />
        </Field>
      </FormGrid>
      <SubmitButton className="btn btn-primary w-full">
        {pick(lang, "রিচার্জ যোগ করুন", "Add recharge")}
      </SubmitButton>
    </form>
  );
}
