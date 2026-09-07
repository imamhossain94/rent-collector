"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, getLang } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str, optStr, nbr, bool, dateOr } from "@/lib/utils";
import { nextReceiptNo, recomputeTenantBills, tenantBalance, allocatePayment } from "@/lib/billing";
import { sendSms, receiptText } from "@/lib/sms";

export async function recordPaymentAction(fd: FormData) {
  const user = await requireUser();
  const tenantId = str(fd, "tenantId");
  const amount = nbr(fd, "amount");
  if (amount <= 0) throw new Error("Amount must be greater than zero");

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, ownerId: user.id } });
  if (!tenant) throw new Error("Tenant not found");

  let billId = optStr(fd, "billId");
  if (billId) {
    const bill = await prisma.bill.findFirst({ where: { id: billId, tenantId }, select: { id: true } });
    if (!bill) billId = null;
  }
  if (!billId) {
    const { billId: oldest } = await allocatePayment(tenantId, amount);
    billId = oldest;
  }

  const paidAt = dateOr(fd, "paidAt");
  const payment = await prisma.payment.create({
    data: {
      ownerId: user.id,
      tenantId,
      billId,
      receiptNo: await nextReceiptNo(user.id, paidAt),
      amount,
      method: str(fd, "method", "CASH"),
      txnRef: optStr(fd, "txnRef"),
      paidAt,
      note: optStr(fd, "note"),
    },
  });

  await recomputeTenantBills(tenantId);

  if (bool(fd, "sendSms") && tenant.phone) {
    const lang = await getLang();
    const balance = await tenantBalance(tenantId);
    await sendSms({
      ownerId: user.id,
      tenantId,
      phone: tenant.phone,
      type: "RECEIPT",
      message: receiptText({
        tenantName: tenant.name,
        amount,
        receiptNo: payment.receiptNo,
        balance,
        ownerName: user.businessName || user.name,
        lang,
      }),
    });
  }

  await audit(user.id, "PAYMENT", "Payment", payment.id, `${payment.receiptNo} ${amount} from ${tenant.name}`);
  revalidatePath("/payments");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath(`/tenants/${tenantId}`);

  if (bool(fd, "openReceipt")) redirect(`/payments/${payment.id}`);
}

export async function deletePaymentAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const payment = await prisma.payment.findFirst({ where: { id, ownerId: user.id } });
  if (!payment) throw new Error("Payment not found");

  await prisma.payment.delete({ where: { id } });
  await recomputeTenantBills(payment.tenantId);

  await audit(user.id, "DELETE", "Payment", id, payment.receiptNo);
  revalidatePath("/payments");
  revalidatePath("/bills");
  revalidatePath(`/tenants/${payment.tenantId}`);
}
