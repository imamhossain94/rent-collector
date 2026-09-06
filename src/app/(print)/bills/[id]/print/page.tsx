import { notFound } from "next/navigation";
import { requireUser, userLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payableOf } from "@/lib/billing";
import { PrintFrame, DocHeader, SignatureRow } from "@/components/print-doc";
import { money, formatDate, monthLabel, num, amountInWordsBn, amountInWordsEn } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { BILL_ITEM_TYPES, type Lang } from "@/lib/constants";

export default async function BillPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = userLang(user);

  const bill = await prisma.bill.findFirst({
    where: { id, ownerId: user.id },
    include: { tenant: true, unit: true, property: true, items: true },
  });
  if (!bill) notFound();

  const payable = payableOf(bill);
  const remaining = Math.max(0, payable - bill.paidAmount);

  return (
    <PrintFrame backHref={`/bills/${bill.id}`} lang={lang} title={bill.billNo}>
      <DocHeader
        businessName={user.businessName || user.name}
        ownerName={user.name}
        address={[bill.property.name, bill.property.addressLine, bill.property.area, bill.property.city]
          .filter(Boolean)
          .join(", ")}
        phone={user.phone}
        docTitleBn="ভাড়ার বিল"
        docTitleEn="Rent Bill"
        meta={[
          { label: "Bill No", value: bill.billNo },
          { label: "Month / মাস", value: monthLabel(bill.billingMonth, "en") },
          { label: "Issue date", value: formatDate(bill.issueDate, "en") },
          { label: "Due date", value: formatDate(bill.dueDate, "en") },
        ]}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-black/20 p-3 text-[12px]">
          <p className="text-[10px] uppercase tracking-wider opacity-60">Tenant / ভাড়াটিয়া</p>
          <p className="text-sm font-extrabold">{bill.tenant.name}</p>
          <p>Mobile: {bill.tenant.phone}</p>
          {bill.tenant.nid ? <p>NID: {bill.tenant.nid}</p> : null}
        </div>
        <div className="rounded border border-black/20 p-3 text-[12px]">
          <p className="text-[10px] uppercase tracking-wider opacity-60">Unit / ইউনিট</p>
          <p className="text-sm font-extrabold">
            {bill.property.name}
            {bill.unit ? ` — ${bill.unit.name}` : ""}
          </p>
          {bill.unit?.floor ? <p>Floor: {bill.unit.floor}</p> : null}
          {bill.unit?.meterNumber ? <p>Meter: {bill.unit.meterNumber}</p> : null}
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-y border-black bg-black/[0.04]">
            <th className="py-2 pr-2 text-left font-bold">খাত / Particulars</th>
            <th className="py-2 px-2 text-right font-bold">পরিমাণ / Qty</th>
            <th className="py-2 px-2 text-right font-bold">দর / Rate</th>
            <th className="py-2 pl-2 text-right font-bold">টাকা / Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item) => {
            const type = BILL_ITEM_TYPES.find((x) => x.value === item.type);
            return (
              <tr key={item.id} className="border-b border-black/10">
                <td className="py-2 pr-2">
                  <span className="font-semibold">
                    {type?.bn ?? item.label} / {type?.en ?? item.label}
                  </span>
                  {item.meta ? <span className="block text-[11px] opacity-70">{item.meta}</span> : null}
                </td>
                <td className="py-2 px-2 text-right">{num(item.qty, "en")}</td>
                <td className="py-2 px-2 text-right">{money(item.rate, "en", false)}</td>
                <td className="py-2 pl-2 text-right font-semibold">{money(item.amount, "en", false)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-[12px]">
          <Row label="উপমোট / Subtotal" value={money(bill.subtotal, "en")} />
          {bill.lateFee ? <Row label="বিলম্ব ফি / Late fee" value={money(bill.lateFee, "en")} /> : null}
          {bill.discount ? <Row label="ছাড় (লেস) / Less" value={`- ${money(bill.discount, "en")}`} /> : null}
          {bill.advanceAdjust ? (
            <Row label="অগ্রিম সমন্বয় / Advance adj." value={`- ${money(bill.advanceAdjust, "en")}`} />
          ) : null}
          <Row label="এ মাসের মোট / Month total" value={money(bill.total, "en")} bold />
          {bill.previousDue ? <Row label="পূর্বের বকেয়া / Previous due" value={money(bill.previousDue, "en")} /> : null}
          <div className="border-t border-black pt-1">
            <Row label="সর্বমোট প্রদেয় / Total payable" value={money(payable, "en")} bold big />
          </div>
          {bill.paidAmount ? <Row label="জমা / Paid" value={money(bill.paidAmount, "en")} /> : null}
          {remaining !== payable ? <Row label="বাকি / Balance" value={money(remaining, "en")} bold /> : null}
        </div>
      </div>

      <div className="mt-4 rounded border border-black/20 p-3 text-[12px]">
        <p>
          <span className="font-bold">কথায়:</span> {amountInWordsBn(payable)}
        </p>
        <p className="opacity-80">
          <span className="font-bold">In words:</span> {amountInWordsEn(payable)}
        </p>
      </div>

      {bill.note ? <p className="mt-3 text-[12px]">Note: {bill.note}</p> : null}

      <div className="mt-4 rounded bg-black/[0.04] p-3 text-[11px] leading-relaxed">
        <p className="font-bold">পরিশোধের নিয়ম / How to pay</p>
        <p>
          নগদ, বিকাশ, নগদ বা ব্যাংকে ভাড়া পরিশোধ করে রসিদ বুঝে নিন। প্রতি মাসের{" "}
          {num(bill.property.dueDay, "bn")} তারিখের মধ্যে ভাড়া পরিশোধ করার অনুরোধ করা হলো।
        </p>
        <p className="opacity-80">
          Pay by cash, bKash, Nagad or bank transfer and always collect a money receipt — issuing one is the
          landlord&apos;s duty under the Premises Rent Control Act, 1991.
        </p>
      </div>

      <SignatureRow
        leftBn="ভাড়াটিয়ার স্বাক্ষর"
        leftEn="Tenant signature"
        rightBn="বাড়িওয়ালার স্বাক্ষর"
        rightEn="Owner signature"
      />

      <p className="mt-6 text-center text-[10px] opacity-60">
        {pick(lang, "ভাড়া খাতা দিয়ে তৈরি", "Generated with Bhara Khata")} · {formatDate(new Date(), "en")}
      </p>
    </PrintFrame>
  );
}

function Row({ label, value, bold, big }: { label: string; value: string; bold?: boolean; big?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${big ? "text-sm" : ""}`}>
      <span className={bold ? "font-bold" : "opacity-80"}>{label}</span>
      <span className={bold ? "font-extrabold" : "font-semibold"}>{value}</span>
    </div>
  );
}
