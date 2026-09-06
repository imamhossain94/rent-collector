import { prisma } from "./prisma";

/**
 * Ledger rules (kept deliberately simple so an owner can verify by hand):
 *
 *   tenant balance = openingDue
 *                  + Σ bill.total  (current-month charges, discount & late fee applied)
 *                  − Σ payment.amount
 *
 * `bill.previousDue` is a snapshot taken when the bill was generated. It is
 * printed on the bill so the tenant sees "this month + old due = payable",
 * but it is NOT part of bill.total — otherwise old dues would be counted
 * twice as soon as a second bill was issued.
 */

export type DraftItem = {
  type: string;
  label: string;
  qty: number;
  rate: number;
  amount: number;
  meta?: string | null;
};

export type TenantForBilling = {
  id: string;
  name: string;
  rentAmount: number;
  serviceCharge: number;
  electricityMode: string;
  electricityRate: number;
  fixedElectricity: number;
  gasCharge: number;
  waterCharge: number;
  otherCharge: number;
  otherChargeLabel: string | null;
  unitId: string | null;
  unit?: {
    id: string;
    name: string;
    rentAmount: number;
    serviceCharge: number;
    propertyId: string;
    property?: {
      id: string;
      name: string;
      serviceCharge: number;
      gasCharge: number;
      waterCharge: number;
      electricityRate: number;
      dueDay: number;
      lateFee: number;
    } | null;
  } | null;
};

export type ElectricityInput = {
  previous: number;
  current: number;
  rate?: number;
};

/** Build the line items for one tenant's monthly bill. */
export function buildBillItems(
  tenant: TenantForBilling,
  opts: { electricity?: ElectricityInput | null; extraItems?: DraftItem[] } = {},
): { items: DraftItem[]; subtotal: number; reading: null | (ElectricityInput & { units: number; amount: number; rate: number }) } {
  const property = tenant.unit?.property ?? null;
  const items: DraftItem[] = [];
  let reading: null | (ElectricityInput & { units: number; amount: number; rate: number }) = null;

  const rent = tenant.rentAmount || tenant.unit?.rentAmount || 0;
  if (rent > 0) {
    items.push({ type: "RENT", label: "House rent", qty: 1, rate: rent, amount: rent });
  }

  // Charges come from the tenant record, never silently from the property:
  // property values only pre-fill the tenant form. Otherwise a garage tenant
  // would be billed for the building's gas line.
  const service = tenant.serviceCharge || tenant.unit?.serviceCharge || 0;
  if (service > 0) {
    items.push({ type: "SERVICE", label: "Service charge", qty: 1, rate: service, amount: service });
  }

  if (tenant.electricityMode === "SUBMETER" && opts.electricity) {
    const rate = opts.electricity.rate ?? tenant.electricityRate ?? property?.electricityRate ?? 0;
    const units = Math.max(0, round2(opts.electricity.current - opts.electricity.previous));
    const amount = round2(units * rate);
    reading = { ...opts.electricity, rate, units, amount };
    if (amount > 0 || units > 0) {
      items.push({
        type: "ELECTRICITY",
        label: "Electricity (sub-meter)",
        qty: units,
        rate,
        amount,
        meta: `${opts.electricity.previous} → ${opts.electricity.current} = ${units} unit × ${rate}`,
      });
    }
  } else if (tenant.electricityMode === "FIXED" && tenant.fixedElectricity > 0) {
    items.push({
      type: "ELECTRICITY",
      label: "Electricity (fixed)",
      qty: 1,
      rate: tenant.fixedElectricity,
      amount: tenant.fixedElectricity,
    });
  }

  const gas = tenant.gasCharge;
  if (gas > 0) items.push({ type: "GAS", label: "Gas bill", qty: 1, rate: gas, amount: gas });

  const water = tenant.waterCharge;
  if (water > 0) items.push({ type: "WATER", label: "Water bill", qty: 1, rate: water, amount: water });

  if (tenant.otherCharge > 0) {
    items.push({
      type: "OTHER",
      label: tenant.otherChargeLabel || "Other charge",
      qty: 1,
      rate: tenant.otherCharge,
      amount: tenant.otherCharge,
    });
  }

  for (const extra of opts.extraItems ?? []) {
    if (extra.amount !== 0) items.push(extra);
  }

  const subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
  return { items, subtotal, reading };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Balance owed by a tenant across their whole history. */
export async function tenantBalance(tenantId: string): Promise<number> {
  const [tenant, billAgg, payAgg] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { openingDue: true } }),
    prisma.bill.aggregate({
      where: { tenantId, status: { not: "VOID" } },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({ where: { tenantId }, _sum: { amount: true } }),
  ]);
  return round2(
    (tenant?.openingDue ?? 0) + (billAgg._sum.total ?? 0) - (payAgg._sum.amount ?? 0),
  );
}

/** Balances for many tenants in three queries instead of 3N. */
export async function tenantBalances(tenantIds: string[]): Promise<Map<string, number>> {
  if (tenantIds.length === 0) return new Map();
  const [tenants, bills, payments] = await Promise.all([
    prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, openingDue: true },
    }),
    prisma.bill.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds }, status: { not: "VOID" } },
      _sum: { total: true },
    }),
    prisma.payment.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _sum: { amount: true },
    }),
  ]);

  const map = new Map<string, number>();
  for (const t of tenants) map.set(t.id, t.openingDue ?? 0);
  for (const b of bills) map.set(b.tenantId, (map.get(b.tenantId) ?? 0) + (b._sum.total ?? 0));
  for (const p of payments) map.set(p.tenantId, (map.get(p.tenantId) ?? 0) - (p._sum.amount ?? 0));
  for (const [k, v] of map) map.set(k, round2(v));
  return map;
}

/** BK-202609-0007 — sequential per owner, per month. */
export async function nextBillNo(ownerId: string, billingMonth: string): Promise<string> {
  const prefix = `BK-${billingMonth.replace("-", "")}`;
  const count = await prisma.bill.count({ where: { ownerId, billingMonth } });
  let seq = count + 1;
  // guard against gaps/duplicates from deleted bills
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${String(seq).padStart(4, "0")}`;
    const exists = await prisma.bill.findUnique({ where: { billNo: candidate }, select: { id: true } });
    if (!exists) return candidate;
    seq++;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

/** RC-202609-0031 — sequential receipt numbers per owner, per month. */
export async function nextReceiptNo(ownerId: string, when: Date = new Date()): Promise<string> {
  const month = `${when.getFullYear()}${String(when.getMonth() + 1).padStart(2, "0")}`;
  const start = new Date(when.getFullYear(), when.getMonth(), 1);
  const end = new Date(when.getFullYear(), when.getMonth() + 1, 0, 23, 59, 59);
  const count = await prisma.payment.count({
    where: { ownerId, createdAt: { gte: start, lte: end } },
  });
  let seq = count + 1;
  for (let i = 0; i < 50; i++) {
    const candidate = `RC-${month}-${String(seq).padStart(4, "0")}`;
    const exists = await prisma.payment.findUnique({
      where: { receiptNo: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    seq++;
  }
  return `RC-${month}-${Date.now().toString().slice(-6)}`;
}

export function billStatusFor(total: number, paid: number): string {
  if (paid <= 0) return "UNPAID";
  if (paid + 0.009 >= total) return "PAID";
  return "PARTIAL";
}

/** Recompute paidAmount/status for a bill after payments change. */
export async function syncBillStatus(billId: string): Promise<void> {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    select: { id: true, total: true, status: true },
  });
  if (!bill || bill.status === "VOID") return;
  const agg = await prisma.payment.aggregate({ where: { billId }, _sum: { amount: true } });
  const paid = round2(agg._sum.amount ?? 0);
  await prisma.bill.update({
    where: { id: billId },
    data: { paidAmount: paid, status: billStatusFor(bill.total, paid) },
  });
}

/**
 * Apply a payment to a tenant's open bills, oldest first. Used when the owner
 * records money without picking a specific bill — exactly how a paper khata
 * works: the oldest due gets cleared first.
 */
export async function allocatePayment(
  tenantId: string,
  amount: number,
): Promise<{ billId: string | null; applied: { billId: string; amount: number }[] }> {
  const openBills = await prisma.bill.findMany({
    where: { tenantId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { billingMonth: "asc" },
    select: { id: true, total: true, paidAmount: true },
  });
  let left = amount;
  const applied: { billId: string; amount: number }[] = [];
  for (const bill of openBills) {
    if (left <= 0) break;
    const remaining = round2(bill.total - bill.paidAmount);
    if (remaining <= 0) continue;
    const take = Math.min(remaining, left);
    applied.push({ billId: bill.id, amount: round2(take) });
    left = round2(left - take);
  }
  return { billId: applied[0]?.billId ?? null, applied };
}

/** Last recorded meter reading for a tenant (any month, most recent first). */
export async function lastReading(tenantId: string, type = "ELECTRICITY") {
  return prisma.meterReading.findFirst({
    where: { tenantId, type },
    orderBy: { billingMonth: "desc" },
  });
}

export function dueDateFor(billingMonth: string, dueDay: number): Date {
  const [y, m] = billingMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(Math.max(dueDay || 10, 1), lastDay), 23, 59, 59);
}

/** Total payable printed on a bill: this month's charges + carried-in due. */
export function payableOf(bill: { total: number; previousDue: number }): number {
  return round2(bill.total + bill.previousDue);
}

/**
 * Re-apply every payment a tenant has made across their bills, oldest first.
 * This is how a paper khata behaves: money handed over clears the oldest due,
 * and any surplus sits against the next bill. Idempotent — safe to call after
 * any payment or bill change.
 */
export async function recomputeTenantBills(tenantId: string): Promise<void> {
  const [bills, payAgg, tenant] = await Promise.all([
    prisma.bill.findMany({
      where: { tenantId, status: { not: "VOID" } },
      orderBy: [{ billingMonth: "asc" }, { createdAt: "asc" }],
      select: { id: true, total: true, paidAmount: true, status: true },
    }),
    prisma.payment.aggregate({ where: { tenantId }, _sum: { amount: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { openingDue: true } }),
  ]);

  // Money first clears any due carried in from the paper khata.
  let pool = round2((payAgg._sum.amount ?? 0) - (tenant?.openingDue ?? 0));

  for (const bill of bills) {
    const applied = pool <= 0 ? 0 : round2(Math.min(bill.total, pool));
    pool = round2(pool - applied);
    const status = billStatusFor(bill.total, applied);
    if (applied !== bill.paidAmount || status !== bill.status) {
      await prisma.bill.update({ where: { id: bill.id }, data: { paidAmount: applied, status } });
    }
  }
}
