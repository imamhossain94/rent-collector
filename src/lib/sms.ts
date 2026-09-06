import { prisma } from "./prisma";
import { money, monthLabel } from "./format";
import type { Lang } from "./constants";

/**
 * SMS is the way Bangladeshi landlords actually chase rent, so the app treats
 * it as a first-class feature. Without SMS_PROVIDER configured every message is
 * stored with status SIMULATED — the owner still sees the exact text that would
 * go out, and can copy it into WhatsApp/IMO. Wiring a real gateway later means
 * implementing one function below (BulkSMSBD, SSLWireless, Alpha Net, etc.).
 */

export type SmsPayload = {
  ownerId: string;
  tenantId?: string | null;
  phone: string;
  message: string;
  type?: string;
};

async function deliver(phone: string, message: string): Promise<{ ok: boolean; provider: string }> {
  const provider = process.env.SMS_PROVIDER?.trim();
  const apiKey = process.env.SMS_API_KEY?.trim();
  if (!provider || !apiKey) return { ok: false, provider: "simulation" };

  try {
    if (provider === "bulksmsbd") {
      const url = new URL("http://bulksmsbd.net/api/smsapi");
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("type", "text");
      url.searchParams.set("number", phone);
      url.searchParams.set("senderid", process.env.SMS_SENDER_ID ?? "");
      url.searchParams.set("message", message);
      const res = await fetch(url, { method: "GET" });
      return { ok: res.ok, provider };
    }
    // Unknown provider name: fall back to simulation rather than guessing an API.
    return { ok: false, provider: "simulation" };
  } catch {
    return { ok: false, provider };
  }
}

export async function sendSms(payload: SmsPayload) {
  const { ok, provider } = await deliver(payload.phone, payload.message);
  return prisma.smsLog.create({
    data: {
      ownerId: payload.ownerId,
      tenantId: payload.tenantId ?? null,
      phone: payload.phone,
      message: payload.message,
      type: payload.type ?? "CUSTOM",
      provider,
      status: ok ? "SENT" : provider === "simulation" ? "SIMULATED" : "FAILED",
      sentAt: ok ? new Date() : null,
    },
  });
}

/* ----------------------------- templates ----------------------------- */

export function rentReminderText(args: {
  tenantName: string;
  amount: number;
  billingMonth: string;
  dueDate: Date;
  ownerName: string;
  lang: Lang;
}): string {
  const { tenantName, amount, billingMonth, dueDate, ownerName, lang } = args;
  const day = dueDate.getDate();
  if (lang === "bn") {
    return `প্রিয় ${tenantName}, ${monthLabel(billingMonth, "bn")} মাসের ভাড়া বাবদ ${money(
      amount,
      "bn",
    )} টাকা বকেয়া আছে। অনুগ্রহ করে ${day} তারিখের মধ্যে পরিশোধ করুন। ধন্যবাদ — ${ownerName}`;
  }
  return `Dear ${tenantName}, ${money(amount, "en")} is due for ${monthLabel(
    billingMonth,
    "en",
  )}. Please pay by day ${day}. Thank you — ${ownerName}`;
}

export function receiptText(args: {
  tenantName: string;
  amount: number;
  receiptNo: string;
  balance: number;
  ownerName: string;
  lang: Lang;
}): string {
  const { tenantName, amount, receiptNo, balance, ownerName, lang } = args;
  if (lang === "bn") {
    return `${tenantName}, আপনার ${money(amount, "bn")} টাকা পাওয়া গেছে। রসিদ নং ${receiptNo}। বর্তমান বকেয়া ${money(
      balance,
      "bn",
    )}। — ${ownerName}`;
  }
  return `${tenantName}, we received ${money(amount, "en")}. Receipt ${receiptNo}. Current balance ${money(
    balance,
    "en",
  )}. — ${ownerName}`;
}

export function billNoticeText(args: {
  tenantName: string;
  payable: number;
  billingMonth: string;
  billNo: string;
  ownerName: string;
  lang: Lang;
}): string {
  const { tenantName, payable, billingMonth, billNo, ownerName, lang } = args;
  if (lang === "bn") {
    return `${tenantName}, ${monthLabel(billingMonth, "bn")} মাসের বিল (${billNo}) তৈরি হয়েছে। মোট প্রদেয় ${money(
      payable,
      "bn",
    )}। — ${ownerName}`;
  }
  return `${tenantName}, your bill ${billNo} for ${monthLabel(billingMonth, "en")} is ready. Payable ${money(
    payable,
    "en",
  )}. — ${ownerName}`;
}

export function isSimulationMode(): boolean {
  return !process.env.SMS_PROVIDER?.trim() || !process.env.SMS_API_KEY?.trim();
}
