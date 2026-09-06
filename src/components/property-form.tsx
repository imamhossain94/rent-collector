import Link from "next/link";
import { Field, FormGrid, Input, Select, Textarea, Card, CardHead } from "./ui";
import { SubmitButton } from "./client-bits";
import { PROPERTY_TYPES, DIVISIONS, type Lang } from "@/lib/constants";
import { pick, t } from "@/lib/i18n";

type PropertyLike = {
  id: string;
  name: string;
  type: string;
  addressLine: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  division: string | null;
  description: string | null;
  mainMeterNumber: string | null;
  meterType: string;
  electricityRate: number;
  gasCharge: number;
  waterCharge: number;
  serviceCharge: number;
  dueDay: number;
  lateFee: number;
};

export function PropertyForm({
  action,
  property,
  lang,
}: {
  action: (fd: FormData) => Promise<void>;
  property?: PropertyLike;
  lang: Lang;
}) {
  return (
    <form action={action} className="space-y-4">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}

      <Card>
        <CardHead
          title={pick(lang, "সম্পত্তির তথ্য", "Property details")}
          description={pick(lang, "যে বাড়ি বা দোকান ভাড়া দিচ্ছেন", "The house or shop you rent out")}
        />
        <FormGrid>
          <Field label={t("propertyName", lang)} required>
            <Input name="name" defaultValue={property?.name} required placeholder={pick(lang, "যেমন: রহমান ভিলা", "e.g. Rahman Villa")} />
          </Field>
          <Field label={t("propertyType", lang)}>
            <Select name="type" defaultValue={property?.type ?? "BUILDING"}>
              {PROPERTY_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {lang === "bn" ? o.bn : o.en}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("address", lang)} className="sm:col-span-2">
            <Input name="addressLine" defaultValue={property?.addressLine ?? ""} placeholder={pick(lang, "হোল্ডিং, রোড, ব্লক", "Holding, road, block")} />
          </Field>
          <Field label={t("area", lang)}>
            <Input name="area" defaultValue={property?.area ?? ""} placeholder={pick(lang, "যেমন: মিরপুর ১০", "e.g. Mirpur 10")} />
          </Field>
          <Field label={t("city", lang)}>
            <Input name="city" defaultValue={property?.city ?? ""} placeholder={pick(lang, "যেমন: ঢাকা", "e.g. Dhaka")} />
          </Field>
          <Field label={t("district", lang)}>
            <Input name="district" defaultValue={property?.district ?? ""} />
          </Field>
          <Field label={t("division", lang)}>
            <Select name="division" defaultValue={property?.division ?? "Dhaka"}>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("note", lang)} className="sm:col-span-2">
            <Textarea name="description" defaultValue={property?.description ?? ""} rows={2} />
          </Field>
        </FormGrid>
      </Card>

      <Card>
        <CardHead
          title={t("billingDefaults", lang)}
          description={pick(
            lang,
            "এই বাড়ির প্রতিটি ইউনিট ও ভাড়াটিয়ার জন্য ডিফল্ট হিসাব — চাইলে প্রতিটি ভাড়াটিয়ার জন্য আলাদা করা যাবে।",
            "Defaults for every unit and tenant here — each tenant can still override them.",
          )}
        />
        <FormGrid cols={3}>
          <Field
            label={pick(lang, "মূল মিটার নম্বর (ডেসকো)", "Main meter number (DESCO)")}
            hint={pick(lang, "বাড়ির নিজের মিটার", "The building's own meter")}
          >
            <Input name="mainMeterNumber" defaultValue={property?.mainMeterNumber ?? ""} placeholder="DESCO-0000000" />
          </Field>
          <Field label={pick(lang, "মিটারের ধরন", "Meter type")}>
            <Select name="meterType" defaultValue={property?.meterType ?? "PREPAID"}>
              <option value="PREPAID">{pick(lang, "প্রিপেইড (রিচার্জ করতে হয়)", "Prepaid (topped up)")}</option>
              <option value="POSTPAID">{pick(lang, "পোস্টপেইড (মাস শেষে বিল)", "Postpaid (billed monthly)")}</option>
            </Select>
          </Field>
          <Field
            label={t("electricityRate", lang)}
            hint={pick(lang, "সাব-মিটারের প্রতি ইউনিট টাকা", "Taka per sub-meter unit")}
          >
            <Input name="electricityRate" type="number" step="0.01" defaultValue={property?.electricityRate ?? 9} />
          </Field>
          <Field label={t("serviceCharge", lang)}>
            <Input name="serviceCharge" type="number" step="1" defaultValue={property?.serviceCharge ?? 0} />
          </Field>
          <Field label={t("gasCharge", lang)}>
            <Input name="gasCharge" type="number" step="1" defaultValue={property?.gasCharge ?? 0} />
          </Field>
          <Field label={t("waterCharge", lang)}>
            <Input name="waterCharge" type="number" step="1" defaultValue={property?.waterCharge ?? 0} />
          </Field>
          <Field label={t("dueDay", lang)} hint={pick(lang, "১–২৮ এর মধ্যে", "Between 1 and 28")}>
            <Input name="dueDay" type="number" min={1} max={28} defaultValue={property?.dueDay ?? 10} />
          </Field>
          <Field label={t("lateFee", lang)} hint={pick(lang, "দেরি হলে জরিমানা", "Charged when rent is late")}>
            <Input name="lateFee" type="number" step="1" defaultValue={property?.lateFee ?? 0} />
          </Field>
        </FormGrid>
      </Card>

      <div className="flex items-center gap-2">
        <SubmitButton className="btn btn-primary">{property ? t("saveChanges", lang) : t("create", lang)}</SubmitButton>
        <Link href={property ? `/properties/${property.id}` : "/properties"} className="btn btn-outline">
          {t("cancel", lang)}
        </Link>
      </div>
    </form>
  );
}
