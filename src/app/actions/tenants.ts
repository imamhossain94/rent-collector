"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit, str, optStr, nbr, int, dateOr, dateOrNull } from "@/lib/utils";
import { normalizePhone } from "@/lib/format";

function tenantData(fd: FormData) {
  return {
    name: str(fd, "name"),
    phone: normalizePhone(str(fd, "phone")),
    altPhone: optStr(fd, "altPhone"),
    email: optStr(fd, "email"),
    nid: optStr(fd, "nid"),
    occupation: optStr(fd, "occupation"),
    permanentAddress: optStr(fd, "permanentAddress"),
    familyMembers: int(fd, "familyMembers", 1),
    emergencyName: optStr(fd, "emergencyName"),
    emergencyPhone: optStr(fd, "emergencyPhone"),
    moveInDate: dateOr(fd, "moveInDate"),
    agreementStart: dateOrNull(fd, "agreementStart"),
    agreementEnd: dateOrNull(fd, "agreementEnd"),
    rentAmount: nbr(fd, "rentAmount"),
    serviceCharge: nbr(fd, "serviceCharge"),
    advanceAmount: nbr(fd, "advanceAmount"),
    electricityMode: str(fd, "electricityMode", "SUBMETER"),
    electricityRate: nbr(fd, "electricityRate", 9),
    fixedElectricity: nbr(fd, "fixedElectricity"),
    gasCharge: nbr(fd, "gasCharge"),
    waterCharge: nbr(fd, "waterCharge"),
    otherCharge: nbr(fd, "otherCharge"),
    otherChargeLabel: optStr(fd, "otherChargeLabel"),
    notes: optStr(fd, "notes"),
  };
}

export async function createTenantAction(fd: FormData) {
  const user = await requireUser();
  const unitId = optStr(fd, "unitId");

  if (unitId) {
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, property: { ownerId: user.id } },
      select: { id: true },
    });
    if (!unit) throw new Error("Unit not found");
  }

  const tenant = await prisma.tenant.create({
    data: {
      ...tenantData(fd),
      ownerId: user.id,
      unitId,
      openingDue: nbr(fd, "openingDue"),
      status: "ACTIVE",
    },
  });

  if (unitId) {
    await prisma.unit.update({ where: { id: unitId }, data: { status: "OCCUPIED" } });
  }

  await audit(user.id, "CREATE", "Tenant", tenant.id, tenant.name);
  revalidatePath("/tenants");
  redirect(`/tenants/${tenant.id}`);
}

export async function updateTenantAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const existing = await prisma.tenant.findFirst({ where: { id, ownerId: user.id } });
  if (!existing) throw new Error("Tenant not found");

  const unitId = optStr(fd, "unitId");
  await prisma.tenant.update({
    where: { id },
    data: {
      ...tenantData(fd),
      unitId,
      openingDue: nbr(fd, "openingDue"),
      status: str(fd, "status", existing.status),
    },
  });

  // keep unit occupancy in sync when a tenant is moved between units
  if (existing.unitId && existing.unitId !== unitId) {
    const stillThere = await prisma.tenant.count({
      where: { unitId: existing.unitId, status: "ACTIVE", id: { not: id } },
    });
    if (stillThere === 0) {
      await prisma.unit.update({ where: { id: existing.unitId }, data: { status: "VACANT" } });
    }
  }
  if (unitId) await prisma.unit.update({ where: { id: unitId }, data: { status: "OCCUPIED" } });

  await audit(user.id, "UPDATE", "Tenant", id, existing.name);
  revalidatePath(`/tenants/${id}`);
  revalidatePath("/tenants");
  redirect(`/tenants/${id}`);
}

export async function moveOutTenantAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const tenant = await prisma.tenant.findFirst({ where: { id, ownerId: user.id } });
  if (!tenant) throw new Error("Tenant not found");

  await prisma.tenant.update({
    where: { id },
    data: { status: "LEFT", moveOutDate: dateOr(fd, "moveOutDate"), unitId: tenant.unitId },
  });

  if (tenant.unitId) {
    const others = await prisma.tenant.count({
      where: { unitId: tenant.unitId, status: "ACTIVE", id: { not: id } },
    });
    if (others === 0) {
      await prisma.unit.update({ where: { id: tenant.unitId }, data: { status: "VACANT" } });
    }
  }

  await audit(user.id, "MOVE_OUT", "Tenant", id, tenant.name);
  revalidatePath(`/tenants/${id}`);
  revalidatePath("/tenants");
}

export async function deleteTenantAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const tenant = await prisma.tenant.findFirst({ where: { id, ownerId: user.id } });
  if (!tenant) throw new Error("Tenant not found");

  await prisma.tenant.delete({ where: { id } });
  if (tenant.unitId) {
    const others = await prisma.tenant.count({ where: { unitId: tenant.unitId, status: "ACTIVE" } });
    if (others === 0) await prisma.unit.update({ where: { id: tenant.unitId }, data: { status: "VACANT" } });
  }

  await audit(user.id, "DELETE", "Tenant", id, tenant.name);
  revalidatePath("/tenants");
  redirect("/tenants");
}

/**
 * Quick add from the tenants list: just the four things an owner knows when a
 * family moves in — name, mobile, how many people, and which unit. Everything
 * else (NID, agreement, utilities) can be filled in later.
 */
export async function quickAddTenantAction(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name");
  const phone = normalizePhone(str(fd, "phone"));
  const unitId = optStr(fd, "unitId");
  if (!name || !phone) throw new Error("Name and mobile number are required");

  const unit = unitId
    ? await prisma.unit.findFirst({
        where: { id: unitId, property: { ownerId: user.id } },
        include: { property: true },
      })
    : null;
  if (unitId && !unit) throw new Error("Unit not found");

  const rentAmount = nbr(fd, "rentAmount", unit?.rentAmount ?? 0);

  const tenant = await prisma.tenant.create({
    data: {
      ownerId: user.id,
      unitId,
      name,
      phone,
      familyMembers: int(fd, "familyMembers", 1),
      rentAmount,
      serviceCharge: unit?.serviceCharge || unit?.property.serviceCharge || 0,
      gasCharge: unit?.property.gasCharge ?? 0,
      waterCharge: unit?.property.waterCharge ?? 0,
      advanceAmount: nbr(fd, "advanceAmount", rentAmount),
      openingDue: nbr(fd, "openingDue"),
      electricityMode: "SUBMETER",
      electricityRate: unit?.property.electricityRate || 9,
      moveInDate: dateOr(fd, "moveInDate"),
      status: "ACTIVE",
    },
  });

  if (unitId) await prisma.unit.update({ where: { id: unitId }, data: { status: "OCCUPIED" } });

  await audit(user.id, "CREATE", "Tenant", tenant.id, `${name} (quick add)`);
  revalidatePath("/tenants");
  revalidatePath("/dashboard");
}
