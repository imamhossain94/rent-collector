import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./client-bits";
import { pick } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

/** Chrome around a printable A4 sheet — hidden when the page is printed. */
export function PrintFrame({
  children,
  backHref,
  lang,
  title,
}: {
  children: React.ReactNode;
  backHref: string;
  lang: Lang;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="no-print flex items-center justify-between gap-2">
        <Link href={backHref} className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-4" />
          {pick(lang, "ফিরে যান", "Back")}
        </Link>
        <div className="flex items-center gap-2">
          <span className="chip">{title}</span>
          <PrintButton label={pick(lang, "প্রিন্ট / PDF", "Print / PDF")} />
        </div>
      </div>

      <div className="print-sheet card mx-auto w-full bg-white p-6 text-black shadow-sm sm:p-10">{children}</div>

      <p className="no-print text-center text-xs muted">
        {pick(
          lang,
          "টিপস: প্রিন্ট উইন্ডোতে 'Save as PDF' দিলে ভাড়াটিয়াকে হোয়াটসঅ্যাপে পাঠাতে পারবেন।",
          "Tip: choose 'Save as PDF' in the print dialog to send it over WhatsApp.",
        )}
      </p>
    </div>
  );
}

export function DocHeader({
  businessName,
  ownerName,
  address,
  phone,
  docTitleBn,
  docTitleEn,
  meta,
}: {
  businessName: string;
  ownerName: string;
  address?: string | null;
  phone: string;
  docTitleBn: string;
  docTitleEn: string;
  meta: { label: string; value: string }[];
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-tight">{businessName}</h1>
          <p className="text-xs">{ownerName}</p>
          {address ? <p className="text-xs">{address}</p> : null}
          <p className="text-xs">Mobile: {phone}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-extrabold">{docTitleBn}</p>
          <p className="text-xs font-semibold uppercase tracking-wide">{docTitleEn}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
        {meta.map((m) => (
          <div key={m.label}>
            <span className="block text-[9px] uppercase tracking-wider opacity-60">{m.label}</span>
            <span className="font-bold">{m.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function SignatureRow({ leftBn, leftEn, rightBn, rightEn }: { leftBn: string; leftEn: string; rightBn: string; rightEn: string }) {
  return (
    <div className="mt-10 flex items-end justify-between gap-6 text-xs">
      <div className="w-40 border-t border-black pt-1 text-center">
        <p className="font-bold">{leftBn}</p>
        <p className="opacity-70">{leftEn}</p>
      </div>
      <div className="w-40 border-t border-black pt-1 text-center">
        <p className="font-bold">{rightBn}</p>
        <p className="opacity-70">{rightEn}</p>
      </div>
    </div>
  );
}
