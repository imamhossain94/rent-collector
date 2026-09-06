import type { Lang } from "./constants";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBnDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Bangladeshi grouping: 12,34,567 (lakh/crore), not 1,234,567. */
export function groupBD(n: number): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(2);
  let [int, dec] = fixed.split(".");
  if (dec === "00") dec = "";
  let out = "";
  if (int.length > 3) {
    const last3 = int.slice(-3);
    let rest = int.slice(0, -3);
    const parts: string[] = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) parts.unshift(rest);
    out = parts.join(",") + "," + last3;
  } else {
    out = int;
  }
  return (neg ? "-" : "") + out + (dec ? "." + dec : "");
}

/** ৳ 12,500 — with Bangla numerals when the UI is in Bangla. */
export function money(n: number | null | undefined, lang: Lang = "en", withSymbol = true): string {
  const v = Number(n ?? 0);
  const grouped = groupBD(v);
  const digits = lang === "bn" ? toBnDigits(grouped) : grouped;
  return withSymbol ? `৳ ${digits}` : digits;
}

export function num(n: number | null | undefined, lang: Lang = "en"): string {
  const v = Number(n ?? 0);
  const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  return lang === "bn" ? toBnDigits(s) : s;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

/** "2026-09" -> "September 2026" / "সেপ্টেম্বর ২০২৬" */
export function monthLabel(billingMonth: string, lang: Lang = "en"): string {
  const [y, m] = billingMonth.split("-").map(Number);
  if (!y || !m) return billingMonth;
  const name = lang === "bn" ? MONTHS_BN[m - 1] : MONTHS_EN[m - 1];
  const year = lang === "bn" ? toBnDigits(y) : String(y);
  return `${name} ${year}`;
}

export function monthShort(billingMonth: string): string {
  const [y, m] = billingMonth.split("-").map(Number);
  if (!y || !m) return billingMonth;
  return `${MONTHS_EN[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

export function formatDate(d: Date | string | null | undefined, lang: Lang = "en"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = lang === "bn" ? MONTHS_BN[date.getMonth()] : MONTHS_EN[date.getMonth()].slice(0, 3);
  const year = date.getFullYear();
  const s = `${day} ${month} ${year}`;
  return lang === "bn" ? s.replace(/\d+/g, (x) => toBnDigits(x)) : s;
}

export function formatDateTime(d: Date | string | null | undefined, lang: Lang = "en"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const h24 = date.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ap = h24 < 12 ? "AM" : "PM";
  const t = `${h}:${mm} ${ap}`;
  return `${formatDate(date, lang)}, ${lang === "bn" ? toBnDigits(t).replace("AM", "সকাল").replace("PM", "বিকাল") : t}`;
}

export function relativeDays(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

/** ISO-ish YYYY-MM for the current (or offset) month. */
export function currentMonth(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(billingMonth: string): { start: Date; end: Date } {
  const [y, m] = billingMonth.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
}

export function shiftMonth(billingMonth: string, delta: number): string {
  const [y, m] = billingMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function lastMonths(count: number, from = currentMonth()): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(from, -(count - 1 - i)));
}

export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------
   Amount in words — printed on every receipt, as Bangladeshi rent
   receipts traditionally carry "কথায়: ..." underneath the figure.
   ------------------------------------------------------------------ */

const EN_ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const EN_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function enUnder100(n: number): string {
  if (n < 20) return EN_ONES[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return EN_TENS[t] + (r ? " " + EN_ONES[r] : "");
}

function enUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? EN_ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? enUnder100(r) : "");
}

export function amountInWordsEn(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero Taka Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${enUnder1000(crore)} Crore`);
  if (lakh) parts.push(`${enUnder1000(lakh)} Lakh`);
  if (thousand) parts.push(`${enUnder1000(thousand)} Thousand`);
  if (n) parts.push(enUnder1000(n));
  return `${parts.join(" ")} Taka Only`;
}

const BN_ONES = [
  "", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
  "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ", "বিশ",
  "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "ঊনত্রিশ", "ত্রিশ",
  "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ", "চল্লিশ",
  "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ", "পঞ্চাশ",
  "একান্ন", "বায়ান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট", "ষাট",
  "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর", "সত্তর",
  "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি", "আশি",
  "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "ঊননব্বই", "নব্বই",
  "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই",
];

function bnUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${BN_ONES[h]}শ`);
  if (r) parts.push(BN_ONES[r]);
  return parts.join(" ");
}

export function amountInWordsBn(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return "শূন্য টাকা মাত্র";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${bnUnder1000(crore)} কোটি`);
  if (lakh) parts.push(`${bnUnder1000(lakh)} লক্ষ`);
  if (thousand) parts.push(`${bnUnder1000(thousand)} হাজার`);
  if (n) parts.push(bnUnder1000(n));
  return `${parts.join(" ")} টাকা মাত্র`;
}

export function amountInWords(amount: number, lang: Lang): string {
  return lang === "bn" ? amountInWordsBn(amount) : amountInWordsEn(amount);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Normalise a Bangladeshi mobile number to 01XXXXXXXXX. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return "0" + digits.slice(3);
  if (digits.length === 10 && digits.startsWith("1")) return "0" + digits;
  return digits;
}

export function isValidBdPhone(raw: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizePhone(raw));
}
