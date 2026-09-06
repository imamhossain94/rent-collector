import { Field, FormGrid, Input, Select, Textarea } from "./ui";
import { SubmitButton } from "./client-bits";
import { PAYMENT_METHODS, type Lang } from "@/lib/constants";
import { pick, t } from "@/lib/i18n";
import { toDateInput } from "@/lib/format";

export function CollectForm({
  action,
  lang,
  tenantId,
  tenants,
  billId,
  defaultAmount = 0,
}: {
  action: (fd: FormData) => Promise<void>;
  lang: Lang;
  tenantId?: string;
  tenants?: { id: string; name: string; unitName: string | null; balance: number }[];
  billId?: string;
  defaultAmount?: number;
}) {
  return (
    <form action={action} className="space-y-4">
      {tenantId ? <input type="hidden" name="tenantId" value={tenantId} /> : null}
      {billId ? <input type="hidden" name="billId" value={billId} /> : null}

      {!tenantId && tenants ? (
        <Field label={t("receivedFrom", lang)} required>
          <Select name="tenantId" required defaultValue="">
            <option value="">{pick(lang, "— ভাড়াটিয়া বাছাই করুন —", "— pick a tenant —")}</option>
            {tenants.map((tn) => (
              <option key={tn.id} value={tn.id}>
                {tn.name}
                {tn.unitName ? ` · ${tn.unitName}` : ""}
                {tn.balance > 0 ? ` — ${Math.round(tn.balance)} due` : ""}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <FormGrid>
        <Field label={t("amount", lang)} required>
          <Input
            name="amount"
            type="number"
            step="1"
            min={1}
            required
            defaultValue={defaultAmount > 0 ? Math.round(defaultAmount) : ""}
            autoFocus
          />
        </Field>
        <Field label={t("method", lang)}>
          <Select name="method" defaultValue="CASH">
            {PAYMENT_METHODS.map((o) => (
              <option key={o.value} value={o.value}>
                {lang === "bn" ? o.bn : o.en}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("date", lang)}>
          <Input name="paidAt" type="date" defaultValue={toDateInput(new Date())} />
        </Field>
        <Field label={t("txnRef", lang)} hint={pick(lang, "বিকাশ/নগদের TrxID", "bKash/Nagad TrxID")}>
          <Input name="txnRef" placeholder="8N7A1B2C3D" />
        </Field>
        <Field label={t("note", lang)} className="sm:col-span-2">
          <Textarea name="note" rows={2} />
        </Field>
      </FormGrid>

      <div className="flex flex-wrap items-center gap-4 rounded border border-border p-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <input type="checkbox" name="sendSms" defaultChecked className="size-4 accent-[color:var(--primary)]" />
          {pick(lang, "রসিদের এসএমএস পাঠান", "Send receipt SMS")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <input type="checkbox" name="openReceipt" defaultChecked className="size-4 accent-[color:var(--primary)]" />
          {pick(lang, "রসিদ খুলুন", "Open receipt")}
        </label>
      </div>

      <SubmitButton className="btn btn-success w-full" pendingText={pick(lang, "জমা হচ্ছে…", "Saving…")}>
        {t("collect", lang)}
      </SubmitButton>
    </form>
  );
}
