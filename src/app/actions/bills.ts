"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit, str, optStr, nbr, int, dateOrNull } from "@/lib/utils";
import {
  buildBillItems,
  dueDateFor,
  nextBillNo,
  round2,
  syncBillStatus,
  recomputeTenantBills,
  tenantBalances,
  billStatusFor,
  type DraftItem,
  type TenantForBilling,
} from "@/lib/billing";

const tenantInclude = {
  unit: { include: { property: true } },
} as const;

/**
 * The headline feature: one click turns every active tenancy into a bill for
 * the chosen month. Tenants that already have a bill for that month are
 * skipped, so the button is safe to press twice.
 */
export async function generateMonthlyBillsAction(fd: FormData) {
  const user = await requireUser();
  const billingMonth = str(fd, "billingMonth");
  const propertyId = optStr(fd, "propertyId");
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) throw new Error("Invalid month");

  const tenants = await prisma.tenant.findMany({
    where: {
      ownerId: user.id,
      status: "ACTIVE",
      ...(propertyId ? { unit: { propertyId } } : {}),
    },
    include: tenantInclude,
    orderBy: { name: "asc" },
  });

  const existing = await prisma.bill.findMany({
    where: { ownerId: user.id, billingMonth, tenantId: { in: tenants.map((t) => t.id) } },
    select: { tenantId: true },
  });
  const already = new Set(existing.map((b) => b.tenantId));

  const readings = await prisma.meterReading.findMany({
    where: { billingMonth, type: "ELECTRICITY", tenantId: { in: tenants.map((t) => t.id) } },
  });
  const readingByTenant = new Map(readings.map((r) => [r.tenantId, r]));

  const balances = await tenantBalances(tenants.map((t) => t.id));

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    if (already.has(tenant.id)) {
      skipped++;
      continue;
    }
    if (!tenant.unit) {
      skipped++;
      continue;
    }

    const reading = readingByTenant.get(tenant.id);
    const { items, subtotal } = buildBillItems(tenant as unknown as TenantForBilling, {
      electricity: reading ? { previous: reading.previous, current: reading.current, rate: reading.rate } : null,
    });
    if (items.length === 0) {
      skipped++;
      continue;
    }

    const property = tenant.unit.property;
    const lateFee = 0;
    const discount = 0;
    const total = round2(subtotal + lateFee - discount);

    const bill = await prisma.bill.create({
      data: {
        ownerId: user.id,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        propertyId: property.id,
        billNo: await nextBillNo(user.id, billingMonth),
        billingMonth,
        dueDate: dueDateFor(billingMonth, property.dueDay),
        previousDue: round2(balances.get(tenant.id) ?? 0),
        subtotal,
        discount,
        lateFee,
        total,
        status: "UNPAID",
        items: { create: items },
      },
    });

    if (reading) {
      await prisma.meterReading.update({ where: { id: reading.id }, data: { billId: bill.id } });
    }
    await recomputeTenantBills(tenant.id);
    created++;
  }

  await audit(user.id, "GENERATE", "Bill", null, `${billingMonth}: ${created} created, ${skipped} skipped`);
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  redirect(`/bills?month=${billingMonth}&created=${created}&skipped=${skipped}`);
}

/* ------------------------- editable single bill ------------------------- */

/**
 * The bill editor posts each line as itemType_N / itemLabel_N / itemAmount_N,
 * so the owner can rename a charge, re-price it, drop it, or add new ones
 * (garbage, lift, repair share…) before the bill is issued.
 */
function readItems(fd: FormData): DraftItem[] {
  const count = int(fd, "itemCount");
  const items: DraftItem[] = [];
  for (let i = 0; i < count; i++) {
    const amount = round2(nbr(fd, `itemAmount_${i}`));
    if (!amount) continue;
    const type = str(fd, `itemType_${i}`, "OTHER");
    const label = str(fd, `itemLabel_${i}`) || type;
    items.push({ type, label, qty: 1, rate: amount, amount });
  }
  return items;
}

type ElectricityLine = {
  item: DraftItem | null;
  reading: { previous: number; current: number; units: number; rate: number; amount: number } | null;
};

/** Sub-meter reading, a hand-typed amount, or nothing this month. */
function readElectricity(fd: FormData, lang: string): ElectricityLine {
  const mode = str(fd, "electricityMode", "NONE");

  if (mode === "METER") {
    const previous = nbr(fd, "previousReading");
    const current = nbr(fd, "currentReading");
    const rate = nbr(fd, "electricityRate", 9);
    if (current <= 0 && previous <= 0) return { item: null, reading: null };
    const units = Math.max(0, round2(current - previous));
    const amount = round2(units * rate);
    return {
      item:
        amount > 0
          ? {
              type: "ELECTRICITY",
              label: lang === "bn" ? "বিদ্যুৎ বিল (সাব-মিটার)" : "Electricity (sub-meter)",
              qty: units,
              rate,
              amount,
              meta: `${previous} → ${current} = ${units} unit × ${rate}`,
            }
          : null,
      reading: { previous, current, units, rate, amount },
    };
  }

  if (mode === "MANUAL") {
    const amount = round2(nbr(fd, "manualElectricity"));
    return {
      item:
        amount > 0
          ? {
              type: "ELECTRICITY",
              label: lang === "bn" ? "বিদ্যুৎ বিল" : "Electricity",
              qty: 1,
              rate: amount,
              amount,
            }
          : null,
      reading: null,
    };
  }

  return { item: null, reading: null };
}

export async function createSingleBillAction(fd: FormData) {
  const user = await requireUser();
  const tenantId = str(fd, "tenantId");
  const billingMonth = str(fd, "billingMonth");
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) throw new Error("Invalid month");

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, ownerId: user.id },
    include: tenantInclude,
  });
  if (!tenant || !tenant.unit) throw new Error("Tenant or unit not found");

  const duplicate = await prisma.bill.findFirst({ where: { tenantId, billingMonth } });
  if (duplicate) redirect(`/bills/${duplicate.id}`);

  const { item: elecItem, reading } = readElectricity(fd, user.language);
  const items = [...readItems(fd), ...(elecItem ? [elecItem] : [])];
  if (items.length === 0) throw new Error("A bill needs at least one charge");

  const subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
  const discount = nbr(fd, "discount");
  const advanceAdjust = nbr(fd, "advanceAdjust");
  const lateFee = nbr(fd, "lateFee");
  const total = round2(subtotal + lateFee - discount - advanceAdjust);

  const balances = await tenantBalances([tenantId]);
  const property = tenant.unit.property;

  const bill = await prisma.bill.create({
    data: {
      ownerId: user.id,
      tenantId,
      unitId: tenant.unitId,
      propertyId: property.id,
      billNo: await nextBillNo(user.id, billingMonth),
      billingMonth,
      dueDate: dateOrNull(fd, "dueDate") ?? dueDateFor(billingMonth, property.dueDay),
      previousDue: round2(balances.get(tenantId) ?? 0),
      subtotal,
      discount,
      advanceAdjust,
      lateFee,
      total,
      note: optStr(fd, "note"),
      items: { create: items },
    },
  });

  if (reading) {
    await prisma.meterReading.upsert({
      where: { tenantId_billingMonth_type: { tenantId, billingMonth, type: "ELECTRICITY" } },
      create: { tenantId, billId: bill.id, billingMonth, type: "ELECTRICITY", ...reading },
      update: { billId: bill.id, ...reading },
    });
  }

  await recomputeTenantBills(tenantId);
  await audit(user.id, "CREATE", "Bill", bill.id, `${bill.billNo} for ${tenant.name}`);
  revalidatePath("/bills");
  redirect(`/bills/${bill.id}`);
}

/** Re-write an issued bill's lines, electricity and adjustments. */
export async function updateBillItemsAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const bill = await prisma.bill.findFirst({ where: { id, ownerId: user.id } });
  if (!bill) throw new Error("Bill not found");

  const { item: elecItem, reading } = readElectricity(fd, user.language);
  const items = [...readItems(fd), ...(elecItem ? [elecItem] : [])];
  if (items.length === 0) throw new Error("A bill needs at least one charge");

  const subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
  const discount = nbr(fd, "discount");
  const advanceAdjust = nbr(fd, "advanceAdjust");
  const lateFee = nbr(fd, "lateFee");
  const total = round2(subtotal + lateFee - discount - advanceAdjust);

  await prisma.billItem.deleteMany({ where: { billId: id } });
  await prisma.bill.update({
    where: { id },
    data: {
      subtotal,
      discount,
      advanceAdjust,
      lateFee,
      total,
      dueDate: dateOrNull(fd, "dueDate") ?? bill.dueDate,
      note: optStr(fd, "note"),
      items: { create: items },
    },
  });

  if (reading) {
    await prisma.meterReading.upsert({
      where: {
        tenantId_billingMonth_type: {
          tenantId: bill.tenantId,
          billingMonth: bill.billingMonth,
          type: "ELECTRICITY",
        },
      },
      create: {
        tenantId: bill.tenantId,
        billId: bill.id,
        billingMonth: bill.billingMonth,
        type: "ELECTRICITY",
        ...reading,
      },
      update: { billId: bill.id, ...reading },
    });
  } else {
    await prisma.meterReading.deleteMany({ where: { billId: bill.id, type: "ELECTRICITY" } });
  }

  await recomputeTenantBills(bill.tenantId);
  await audit(user.id, "UPDATE", "Bill", id, `${bill.billNo} items edited`);
  revalidatePath(`/bills/${id}`);
  revalidatePath("/bills");
  redirect(`/bills/${id}`);
}

/** Quick edit from the bill page: discount, advance, late fee, due date, note. */
export async function updateBillAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const bill = await prisma.bill.findFirst({ where: { id, ownerId: user.id } });
  if (!bill) throw new Error("Bill not found");

  const discount = nbr(fd, "discount");
  const advanceAdjust = nbr(fd, "advanceAdjust");
  const lateFee = nbr(fd, "lateFee");
  const total = round2(bill.subtotal + lateFee - discount - advanceAdjust);

  await prisma.bill.update({
    where: { id },
    data: {
      discount,
      advanceAdjust,
      lateFee,
      total,
      dueDate: dateOrNull(fd, "dueDate") ?? bill.dueDate,
      note: optStr(fd, "note"),
      status: bill.status === "VOID" ? "VOID" : billStatusFor(total, bill.paidAmount),
    },
  });

  await recomputeTenantBills(bill.tenantId);
  await audit(user.id, "UPDATE", "Bill", id, bill.billNo);
  revalidatePath(`/bills/${id}`);
  revalidatePath("/bills");
}

export async function voidBillAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const bill = await prisma.bill.findFirst({ where: { id, ownerId: user.id } });
  if (!bill) throw new Error("Bill not found");

  await prisma.bill.update({ where: { id }, data: { status: bill.status === "VOID" ? "UNPAID" : "VOID" } });
  if (bill.status === "VOID") await syncBillStatus(id);
  await recomputeTenantBills(bill.tenantId);

  await audit(user.id, "VOID", "Bill", id, bill.billNo);
  revalidatePath(`/bills/${id}`);
  revalidatePath("/bills");
}

export async function deleteBillAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const bill = await prisma.bill.findFirst({ where: { id, ownerId: user.id } });
  if (!bill) throw new Error("Bill not found");

  await prisma.bill.delete({ where: { id } });
  await recomputeTenantBills(bill.tenantId);
  await audit(user.id, "DELETE", "Bill", id, bill.billNo);
  revalidatePath("/bills");
  redirect("/bills");
}

/* --------------------------- meter readings --------------------------- */

/**
 * Bulk reading entry: the /utilities screen posts cur_<tenantId> for every
 * tenant on the sheet. Anything left blank is ignored.
 */
export async function saveReadingsAction(fd: FormData) {
  const user = await requireUser();
  const billingMonth = str(fd, "billingMonth");
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) throw new Error("Invalid month");

  const tenants = await prisma.tenant.findMany({
    where: { ownerId: user.id, status: "ACTIVE", electricityMode: "SUBMETER" },
    select: { id: true, electricityRate: true },
  });

  let saved = 0;
  for (const tenant of tenants) {
    const raw = fd.get(`cur_${tenant.id}`);
    if (typeof raw !== "string" || raw.trim() === "") continue;

    const current = Number(raw);
    const previous = nbr(fd, `prev_${tenant.id}`);
    const rate = nbr(fd, `rate_${tenant.id}`, tenant.electricityRate);
    if (!Number.isFinite(current)) continue;

    const units = Math.max(0, round2(current - previous));
    const amount = round2(units * rate);

    await prisma.meterReading.upsert({
      where: { tenantId_billingMonth_type: { tenantId: tenant.id, billingMonth, type: "ELECTRICITY" } },
      create: { tenantId: tenant.id, billingMonth, type: "ELECTRICITY", previous, current, units, rate, amount },
      update: { previous, current, units, rate, amount },
    });
    saved++;
  }

  await audit(user.id, "SAVE", "MeterReading", null, `${billingMonth}: ${saved} readings`);
  revalidatePath("/utilities");
  redirect(`/utilities?month=${billingMonth}&saved=${saved}`);
}

/* ------------------- main meter (DESCO prepaid) top-ups ------------------- */

export async function addRechargeAction(fd: FormData) {
  const user = await requireUser();
  const propertyId = str(fd, "propertyId");
  const amount = nbr(fd, "amount");
  if (amount <= 0) throw new Error("Recharge amount must be greater than zero");

  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: user.id } });
  if (!property) throw new Error("Property not found");

  const rechargedAt = dateOrNull(fd, "rechargedAt") ?? new Date();
  const billingMonth =
    str(fd, "billingMonth") ||
    `${rechargedAt.getFullYear()}-${String(rechargedAt.getMonth() + 1).padStart(2, "0")}`;

  const recharge = await prisma.meterRecharge.create({
    data: {
      ownerId: user.id,
      propertyId,
      billingMonth,
      amount,
      rechargedAt,
      meterNumber: optStr(fd, "meterNumber") ?? property.mainMeterNumber,
      tokenRef: optStr(fd, "tokenRef"),
      method: str(fd, "method", "BKASH"),
      note: optStr(fd, "note"),
    },
  });

  await audit(user.id, "CREATE", "MeterRecharge", recharge.id, `${property.name} +${amount}`);
  revalidatePath("/utilities");
  revalidatePath("/dashboard");
}

export async function deleteRechargeAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const recharge = await prisma.meterRecharge.findFirst({ where: { id, ownerId: user.id } });
  if (!recharge) throw new Error("Recharge not found");

  await prisma.meterRecharge.delete({ where: { id } });
  await audit(user.id, "DELETE", "MeterRecharge", id, String(recharge.amount));
  revalidatePath("/utilities");
}
