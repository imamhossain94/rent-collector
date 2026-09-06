import { prisma } from "./prisma";
import type { UnitOption } from "@/components/tenant-form";
import type { BillTenantOption } from "@/components/bill-editor";
import { tenantBalances } from "./billing";

/** Every unit the owner has, flagged with who currently lives there. */
export async function getUnitOptions(ownerId: string): Promise<UnitOption[]> {
  const units = await prisma.unit.findMany({
    where: { property: { ownerId } },
    orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      rentAmount: true,
      serviceCharge: true,
      property: {
        select: {
          name: true,
          serviceCharge: true,
          gasCharge: true,
          waterCharge: true,
          electricityRate: true,
        },
      },
      tenants: { where: { status: "ACTIVE" }, select: { name: true }, take: 1 },
    },
  });

  // The property's defaults ride along so the tenant form can pre-fill them —
  // billing itself only ever reads the tenant's own figures.
  return units.map((u) => ({
    id: u.id,
    name: u.name,
    propertyName: u.property.name,
    rentAmount: u.rentAmount,
    serviceCharge: u.serviceCharge || u.property.serviceCharge,
    gasCharge: u.property.gasCharge,
    waterCharge: u.property.waterCharge,
    electricityRate: u.property.electricityRate,
    occupiedBy: u.tenants[0]?.name ?? null,
  }));
}

export async function getPropertyOptions(ownerId: string) {
  return prisma.property.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, dueDay: true, electricityRate: true },
  });
}

/** Active tenants with their unit + property, ready for billing screens. */
export async function getActiveTenants(ownerId: string, propertyId?: string | null) {
  return prisma.tenant.findMany({
    where: {
      ownerId,
      status: "ACTIVE",
      ...(propertyId ? { unit: { propertyId } } : {}),
    },
    orderBy: [{ unit: { property: { name: "asc" } } }, { unit: { name: "asc" } }],
    include: { unit: { include: { property: true } } },
  });
}

/** Everything the bill editor needs to pre-fill a tenant's charges. */
export async function getBillTenantOptions(ownerId: string): Promise<BillTenantOption[]> {
  const tenants = await getActiveTenants(ownerId);
  const [balances, readings] = await Promise.all([
    tenantBalances(tenants.map((x) => x.id)),
    prisma.meterReading.findMany({
      where: { tenantId: { in: tenants.map((x) => x.id) }, type: "ELECTRICITY" },
      orderBy: { billingMonth: "desc" },
    }),
  ]);

  const lastReading = new Map<string, number>();
  for (const r of readings) if (!lastReading.has(r.tenantId)) lastReading.set(r.tenantId, r.current);

  return tenants.map((tn) => ({
    id: tn.id,
    name: tn.name,
    phone: tn.phone,
    unitLabel: tn.unit ? `${tn.unit.property.name} · ${tn.unit.name}` : "—",
    meterNumber: tn.unit?.meterNumber ?? null,
    rentAmount: tn.rentAmount || tn.unit?.rentAmount || 0,
    serviceCharge: tn.serviceCharge || tn.unit?.serviceCharge || 0,
    gasCharge: tn.gasCharge,
    waterCharge: tn.waterCharge,
    otherCharge: tn.otherCharge,
    otherChargeLabel: tn.otherChargeLabel,
    electricityMode: tn.electricityMode,
    electricityRate: tn.electricityRate || tn.unit?.property.electricityRate || 9,
    fixedElectricity: tn.fixedElectricity,
    lastReading: lastReading.get(tn.id) ?? 0,
    balance: balances.get(tn.id) ?? 0,
    advanceAmount: tn.advanceAmount,
    dueDay: tn.unit?.property.dueDay ?? 10,
  }));
}
