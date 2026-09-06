/**
 * Domain constants. Stored as plain strings in the database (SQLite has no
 * enums) so the same values move to Postgres enums or Firestore fields later.
 * Every constant carries a Bangla + English label — the UI is bilingual.
 */

export type Lang = "bn" | "en";

export type Option = { value: string; bn: string; en: string; tone?: Tone };
export type Tone = "primary" | "success" | "destructive" | "warning" | "muted";

const opt = (list: Option[]) => list;

export const ROLES = opt([
  { value: "SUPER_ADMIN", bn: "সুপার অ্যাডমিন", en: "Super Admin", tone: "destructive" },
  { value: "OWNER", bn: "বাড়িওয়ালা", en: "House Owner", tone: "primary" },
]);

export const USER_STATUS = opt([
  { value: "ACTIVE", bn: "সক্রিয়", en: "Active", tone: "success" },
  { value: "SUSPENDED", bn: "স্থগিত", en: "Suspended", tone: "destructive" },
]);

export const PLANS = opt([
  { value: "FREE", bn: "ফ্রি", en: "Free", tone: "muted" },
  { value: "PRO", bn: "প্রো", en: "Pro", tone: "primary" },
]);

export const PROPERTY_TYPES = opt([
  { value: "BUILDING", bn: "বাড়ি / ভবন", en: "Building" },
  { value: "HOUSE", bn: "একক বাড়ি", en: "House" },
  { value: "SHOP", bn: "দোকান", en: "Shop" },
  { value: "MARKET", bn: "মার্কেট", en: "Market" },
  { value: "GARAGE", bn: "গ্যারেজ", en: "Garage" },
  { value: "LAND", bn: "জমি", en: "Land" },
  { value: "OTHER", bn: "অন্যান্য", en: "Other" },
]);

export const UNIT_TYPES = opt([
  { value: "FLAT", bn: "ফ্ল্যাট", en: "Flat" },
  { value: "ROOM", bn: "রুম", en: "Room" },
  { value: "SHOP", bn: "দোকান", en: "Shop" },
  { value: "OFFICE", bn: "অফিস", en: "Office" },
  { value: "GARAGE", bn: "গ্যারেজ", en: "Garage" },
  { value: "SEAT", bn: "সিট / মেস", en: "Mess seat" },
  { value: "OTHER", bn: "অন্যান্য", en: "Other" },
]);

export const UNIT_STATUS = opt([
  { value: "VACANT", bn: "খালি", en: "Vacant", tone: "warning" },
  { value: "OCCUPIED", bn: "ভাড়া দেওয়া", en: "Occupied", tone: "success" },
  { value: "MAINTENANCE", bn: "মেরামতে", en: "Maintenance", tone: "muted" },
]);

export const TENANT_STATUS = opt([
  { value: "ACTIVE", bn: "চলমান", en: "Active", tone: "success" },
  { value: "NOTICE", bn: "নোটিশে", en: "On notice", tone: "warning" },
  { value: "LEFT", bn: "চলে গেছে", en: "Left", tone: "muted" },
]);

export const ELECTRICITY_MODES = opt([
  { value: "SUBMETER", bn: "সাব-মিটার (ইউনিট অনুযায়ী)", en: "Sub-meter (per unit)" },
  { value: "FIXED", bn: "নির্দিষ্ট টাকা", en: "Fixed amount" },
  { value: "NONE", bn: "নেই / ভাড়ার সাথে", en: "None / included in rent" },
]);

export const BILL_STATUS = opt([
  { value: "UNPAID", bn: "বকেয়া", en: "Unpaid", tone: "destructive" },
  { value: "PARTIAL", bn: "আংশিক", en: "Partial", tone: "warning" },
  { value: "PAID", bn: "পরিশোধিত", en: "Paid", tone: "success" },
  { value: "VOID", bn: "বাতিল", en: "Void", tone: "muted" },
]);

export const BILL_ITEM_TYPES = opt([
  { value: "RENT", bn: "ঘর ভাড়া", en: "House rent" },
  { value: "ELECTRICITY", bn: "বিদ্যুৎ বিল", en: "Electricity" },
  { value: "GAS", bn: "গ্যাস বিল", en: "Gas" },
  { value: "WATER", bn: "পানির বিল", en: "Water" },
  { value: "SERVICE", bn: "সার্ভিস চার্জ", en: "Service charge" },
  { value: "GARBAGE", bn: "ময়লা বিল", en: "Garbage" },
  { value: "SECURITY", bn: "দারোয়ান / নিরাপত্তা", en: "Security" },
  { value: "LIFT", bn: "লিফট বিল", en: "Lift" },
  { value: "INTERNET", bn: "ইন্টারনেট", en: "Internet" },
  { value: "PARKING", bn: "পার্কিং", en: "Parking" },
  { value: "FINE", bn: "বিলম্ব ফি", en: "Late fee" },
  { value: "OTHER", bn: "অন্যান্য", en: "Other" },
]);

export const PAYMENT_METHODS = opt([
  { value: "CASH", bn: "নগদ টাকা", en: "Cash" },
  { value: "BKASH", bn: "বিকাশ", en: "bKash" },
  { value: "NAGAD", bn: "নগদ", en: "Nagad" },
  { value: "ROCKET", bn: "রকেট", en: "Rocket" },
  { value: "BANK", bn: "ব্যাংক ট্রান্সফার", en: "Bank transfer" },
  { value: "CHEQUE", bn: "চেক", en: "Cheque" },
  { value: "OTHER", bn: "অন্যান্য", en: "Other" },
]);

export const PAYMENT_METHOD_COLOR: Record<string, string> = {
  BKASH: "var(--bkash)",
  NAGAD: "var(--nagad)",
  ROCKET: "var(--rocket)",
  CASH: "var(--success)",
  BANK: "var(--primary)",
  CHEQUE: "var(--warning)",
  OTHER: "var(--muted-foreground)",
};

export const EXPENSE_CATEGORIES = opt([
  { value: "REPAIR", bn: "মেরামত", en: "Repair" },
  { value: "MAINTENANCE", bn: "রক্ষণাবেক্ষণ", en: "Maintenance" },
  { value: "SALARY", bn: "কর্মচারীর বেতন", en: "Staff salary" },
  { value: "UTILITY", bn: "ইউটিলিটি বিল", en: "Utility bill" },
  { value: "TAX", bn: "কর / হোল্ডিং ট্যাক্স", en: "Tax / holding" },
  { value: "CLEANING", bn: "পরিচ্ছন্নতা", en: "Cleaning" },
  { value: "SECURITY", bn: "নিরাপত্তা", en: "Security" },
  { value: "OTHER", bn: "অন্যান্য", en: "Other" },
]);

export const SMS_TYPES = opt([
  { value: "RENT_REMINDER", bn: "ভাড়ার তাগাদা", en: "Rent reminder" },
  { value: "BILL", bn: "বিল পাঠানো", en: "Bill notice" },
  { value: "RECEIPT", bn: "রসিদ", en: "Receipt" },
  { value: "CUSTOM", bn: "নিজস্ব বার্তা", en: "Custom" },
]);

export const SMS_STATUS = opt([
  { value: "QUEUED", bn: "অপেক্ষমাণ", en: "Queued", tone: "warning" },
  { value: "SENT", bn: "পাঠানো হয়েছে", en: "Sent", tone: "success" },
  { value: "SIMULATED", bn: "ডেমো মোড", en: "Simulated", tone: "muted" },
  { value: "FAILED", bn: "ব্যর্থ", en: "Failed", tone: "destructive" },
]);

export const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export function label(list: Option[], value: string | null | undefined, lang: Lang): string {
  const found = list.find((o) => o.value === value);
  if (!found) return value ?? "—";
  return lang === "bn" ? found.bn : found.en;
}

export function tone(list: Option[], value: string | null | undefined): Tone {
  return list.find((o) => o.value === value)?.tone ?? "muted";
}

export function badgeClass(t: Tone): string {
  return `badge badge-${t}`;
}
