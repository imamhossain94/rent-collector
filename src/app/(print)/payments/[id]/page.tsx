import { notFound } from "next/navigation";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantBalance } from "@/lib/billing";
import { PrintFrame, DocHeader, SignatureRow } from "@/components/print-doc";
import { money, formatDate, monthLabel, amountInWordsBn, amountInWordsEn } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { PAYMENT_METHODS, type Lang } from "@/lib/constants";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const payment = await prisma.payment.findFirst({
    where: { id, ownerId: user.id },
    include: {
      tenant: { include: { unit: { include: { property: true } } } },
      bill: true,
    },
  });
  if (!payment) notFound();

  const balance = await tenantBalance(payment.tenantId);
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === payment.method);

  return (
    <PrintFrame backHref="/payments" lang={lang} title={payment.receiptNo}>
      <DocHeader
        businessName={user.businessName || user.name}
        ownerName={user.name}
        address={
          payment.tenant.unit
            ? // the property name already appears next to the tenant below
              [
                payment.tenant.unit.property.addressLine,
                payment.tenant.unit.property.area,
                payment.tenant.unit.property.city,
              ]
                .filter(Boolean)
                .join(", ")
            : user.address
        }
        phone={user.phone}
        docTitleBn="মানি রিসিট"
        docTitleEn="Money Receipt"
        meta={[
          { label: "Receipt No", value: payment.receiptNo },
          { label: "Date", value: formatDate(payment.paidAt, "en") },
          {
            label: "For month",
            value: payment.bill ? monthLabel(payment.bill.billingMonth, "en") : "—",
          },
          { label: "Method", value: methodLabel?.en ?? payment.method },
        ]}
      />

      <div className="mt-6 space-y-3 text-[13px] leading-7">
        <p>
          <span className="opacity-70">যাহার নিকট হইতে প্রাপ্ত / Received with thanks from: </span>
          <span className="font-extrabold">{payment.tenant.name}</span>
          {payment.tenant.unit ? (
            <span className="opacity-80">
              {" "}
              ({payment.tenant.unit.property.name} — {payment.tenant.unit.name})
            </span>
          ) : null}
        </p>
        <p>
          <span className="opacity-70">মোবাইল / Mobile: </span>
          <span className="font-semibold">{payment.tenant.phone}</span>
          {payment.txnRef ? (
            <>
              <span className="ml-4 opacity-70">TrxID: </span>
              <span className="font-semibold">{payment.txnRef}</span>
            </>
          ) : null}
        </p>

        <div className="my-4 flex items-center justify-between rounded border-2 border-black px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-60">Amount received / প্রাপ্ত টাকা</p>
            <p className="text-2xl font-extrabold">{money(payment.amount, "en")}</p>
          </div>
          <div className="text-right text-[12px]">
            <p className="text-[10px] uppercase tracking-widest opacity-60">Balance after / বর্তমান বকেয়া</p>
            <p className="text-lg font-extrabold">{money(Math.max(0, balance), "en")}</p>
          </div>
        </div>

        <p>
          <span className="font-bold">কথায়:</span> {amountInWordsBn(payment.amount)}
        </p>
        <p className="opacity-80">
          <span className="font-bold">In words:</span> {amountInWordsEn(payment.amount)}
        </p>

        <p>
          <span className="opacity-70">যে বাবদ / On account of: </span>
          <span className="font-semibold">
            {payment.bill
              ? `House rent & utility bill — ${monthLabel(payment.bill.billingMonth, "en")} (${payment.bill.billNo})`
              : "House rent (on account)"}
          </span>
        </p>
        {payment.note ? <p className="opacity-80">Note: {payment.note}</p> : null}
      </div>

      <div className="mt-5 rounded bg-black/[0.04] p-3 text-[11px] leading-relaxed">
        <p>
          বাড়ি ভাড়া নিয়ন্ত্রণ আইন, ১৯৯১ অনুযায়ী প্রতিটি ভাড়া গ্রহণের বিপরীতে ভাড়াটিয়াকে রসিদ প্রদান করা
          বাড়িওয়ালার আইনগত দায়িত্ব। এই রসিদটি সংরক্ষণ করুন।
        </p>
        <p className="opacity-80">
          Under the Premises Rent Control Act 1991 the landlord must give a written receipt for rent received. Please
          keep this copy.
        </p>
      </div>

      <SignatureRow
        leftBn="ভাড়াটিয়ার স্বাক্ষর"
        leftEn="Tenant signature"
        rightBn="টাকা গ্রহণকারী"
        rightEn="Received by"
      />

      <p className="mt-6 text-center text-[10px] opacity-60">
        {pick(lang, "ভাড়া খাতা দিয়ে তৈরি", "Generated with Bhara Khata")} · {formatDate(new Date(), "en")}
      </p>
    </PrintFrame>
  );
}
