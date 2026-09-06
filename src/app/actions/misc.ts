"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, getLang } from "@/lib/auth";
import { audit, str, optStr, nbr, dateOr } from "@/lib/utils";
import { tenantBalances } from "@/lib/billing";
import { sendSms, rentReminderText, billNoticeText } from "@/lib/sms";
import { currentMonth } from "@/lib/format";

/* ------------------------------ expenses ------------------------------ */

export async function addExpenseAction(fd: FormData) {
  const user = await requireUser();
  const title = str(fd, "title");
  const amount = nbr(fd, "amount");
  if (!title || amount <= 0) throw new Error("Title and amount are required");

  const propertyId = optStr(fd, "propertyId");
  if (propertyId) {
    const owned = await prisma.property.findFirst({ where: { id: propertyId, ownerId: user.id } });
    if (!owned) throw new Error("Property not found");
  }

  const expense = await prisma.expense.create({
    data: {
      ownerId: user.id,
      propertyId,
      category: str(fd, "category", "REPAIR"),
      title,
      amount,
      spentAt: dateOr(fd, "spentAt"),
      vendor: optStr(fd, "vendor"),
      note: optStr(fd, "note"),
    },
  });

  await audit(user.id, "CREATE", "Expense", expense.id, `${title} ${amount}`);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpenseAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const expense = await prisma.expense.findFirst({ where: { id, ownerId: user.id } });
  if (!expense) throw new Error("Expense not found");

  await prisma.expense.delete({ where: { id } });
  await audit(user.id, "DELETE", "Expense", id, expense.title);
  revalidatePath("/expenses");
}

/* -------------------------------- SMS -------------------------------- */

/** Send a reminder to every tenant whose balance is above zero. */
export async function remindAllDueAction(fd: FormData) {
  const user = await requireUser();
  const lang = await getLang();
  const billingMonth = str(fd, "billingMonth", currentMonth());

  const tenants = await prisma.tenant.findMany({
    where: { ownerId: user.id, status: "ACTIVE" },
    include: { unit: { include: { property: true } } },
  });
  const balances = await tenantBalances(tenants.map((t) => t.id));

  let sent = 0;
  for (const tenant of tenants) {
    const balance = balances.get(tenant.id) ?? 0;
    if (balance <= 0 || !tenant.phone) continue;
    const dueDay = tenant.unit?.property.dueDay ?? 10;
    const [y, m] = billingMonth.split("-").map(Number);

    await sendSms({
      ownerId: user.id,
      tenantId: tenant.id,
      phone: tenant.phone,
      type: "RENT_REMINDER",
      message: rentReminderText({
        tenantName: tenant.name,
        amount: balance,
        billingMonth,
        dueDate: new Date(y, m - 1, dueDay),
        ownerName: user.businessName || user.name,
        lang,
      }),
    });
    sent++;
  }

  await audit(user.id, "SMS", "SmsLog", null, `${sent} reminders for ${billingMonth}`);
  revalidatePath("/sms");
}

export async function sendCustomSmsAction(fd: FormData) {
  const user = await requireUser();
  const tenantId = optStr(fd, "tenantId");
  const message = str(fd, "message");
  let phone = str(fd, "phone");

  if (tenantId) {
    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, ownerId: user.id } });
    if (!tenant) throw new Error("Tenant not found");
    phone = tenant.phone;
  }
  if (!phone || !message) throw new Error("Phone and message are required");

  await sendSms({ ownerId: user.id, tenantId, phone, message, type: "CUSTOM" });
  await audit(user.id, "SMS", "SmsLog", null, `custom sms to ${phone}`);
  revalidatePath("/sms");
}

export async function remindOneAction(fd: FormData) {
  const user = await requireUser();
  const lang = await getLang();
  const tenantId = str(fd, "tenantId");
  const billingMonth = str(fd, "billingMonth", currentMonth());

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, ownerId: user.id },
    include: { unit: { include: { property: true } } },
  });
  if (!tenant) throw new Error("Tenant not found");

  const balances = await tenantBalances([tenantId]);
  const [y, m] = billingMonth.split("-").map(Number);

  await sendSms({
    ownerId: user.id,
    tenantId,
    phone: tenant.phone,
    type: "RENT_REMINDER",
    message: rentReminderText({
      tenantName: tenant.name,
      amount: balances.get(tenantId) ?? 0,
      billingMonth,
      dueDate: new Date(y, m - 1, tenant.unit?.property.dueDay ?? 10),
      ownerName: user.businessName || user.name,
      lang,
    }),
  });

  await audit(user.id, "SMS", "SmsLog", tenantId, `reminder to ${tenant.name}`);
  revalidatePath("/sms");
  revalidatePath(`/tenants/${tenantId}`);
}

/** Text the tenant the bill you just issued. */
export async function sendBillNoticeAction(fd: FormData) {
  const user = await requireUser();
  const lang = await getLang();
  const billId = str(fd, "billId");

  const bill = await prisma.bill.findFirst({
    where: { id: billId, ownerId: user.id },
    include: { tenant: true },
  });
  if (!bill) throw new Error("Bill not found");

  await sendSms({
    ownerId: user.id,
    tenantId: bill.tenantId,
    phone: bill.tenant.phone,
    type: "BILL",
    message: billNoticeText({
      tenantName: bill.tenant.name,
      payable: bill.total + bill.previousDue,
      billingMonth: bill.billingMonth,
      billNo: bill.billNo,
      ownerName: user.businessName || user.name,
      lang,
    }),
  });

  await audit(user.id, "SMS", "SmsLog", billId, `bill notice ${bill.billNo}`);
  revalidatePath(`/bills/${billId}`);
  revalidatePath("/sms");
}
