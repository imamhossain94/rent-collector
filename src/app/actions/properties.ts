"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str, optStr, nbr, int } from "@/lib/utils";

async function ownedProperty(propertyId: string, ownerId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) throw new Error("Property not found");
  return property;
}

export async function createPropertyAction(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name");
  if (!name) return;

  const property = await prisma.property.create({
    data: {
      ownerId: user.id,
      name,
      type: str(fd, "type", "BUILDING"),
      addressLine: optStr(fd, "addressLine"),
      area: optStr(fd, "area"),
      city: optStr(fd, "city"),
      district: optStr(fd, "district"),
      division: optStr(fd, "division"),
      description: optStr(fd, "description"),
      mainMeterNumber: optStr(fd, "mainMeterNumber"),
      meterType: str(fd, "meterType", "PREPAID"),
      electricityRate: nbr(fd, "electricityRate", 9),
      gasCharge: nbr(fd, "gasCharge"),
      waterCharge: nbr(fd, "waterCharge"),
      serviceCharge: nbr(fd, "serviceCharge"),
      dueDay: int(fd, "dueDay", 10),
      lateFee: nbr(fd, "lateFee"),
    },
  });

  await audit(user.id, "CREATE", "Property", property.id, name);
  revalidatePath("/properties");
  redirect(`/properties/${property.id}`);
}

export async function updatePropertyAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  await ownedProperty(id, user.id);

  await prisma.property.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      type: str(fd, "type", "BUILDING"),
      addressLine: optStr(fd, "addressLine"),
      area: optStr(fd, "area"),
      city: optStr(fd, "city"),
      district: optStr(fd, "district"),
      division: optStr(fd, "division"),
      description: optStr(fd, "description"),
      mainMeterNumber: optStr(fd, "mainMeterNumber"),
      meterType: str(fd, "meterType", "PREPAID"),
      electricityRate: nbr(fd, "electricityRate", 9),
      gasCharge: nbr(fd, "gasCharge"),
      waterCharge: nbr(fd, "waterCharge"),
      serviceCharge: nbr(fd, "serviceCharge"),
      dueDay: int(fd, "dueDay", 10),
      lateFee: nbr(fd, "lateFee"),
    },
  });

  await audit(user.id, "UPDATE", "Property", id);
  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  redirect(`/properties/${id}`);
}

export async function deletePropertyAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  await ownedProperty(id, user.id);
  await prisma.property.delete({ where: { id } });
  await audit(user.id, "DELETE", "Property", id);
  revalidatePath("/properties");
  redirect("/properties");
}

/* ------------------------------- units ------------------------------- */

export async function createUnitAction(fd: FormData) {
  const user = await requireUser();
  const propertyId = str(fd, "propertyId");
  await ownedProperty(propertyId, user.id);

  const count = int(fd, "count", 1);
  const baseName = str(fd, "name");
  if (!baseName) return;

  // "Add 4 units" creates A-1..A-4 style names when a count is given.
  const rows = Array.from({ length: Math.max(1, Math.min(count, 50)) }, (_, i) => ({
    propertyId,
    name: count > 1 ? `${baseName}${i + 1}` : baseName,
    floor: optStr(fd, "floor"),
    type: str(fd, "type", "FLAT"),
    bedrooms: int(fd, "bedrooms"),
    bathrooms: int(fd, "bathrooms"),
    sizeSqft: int(fd, "sizeSqft") || null,
    rentAmount: nbr(fd, "rentAmount"),
    serviceCharge: nbr(fd, "serviceCharge"),
    meterNumber: count > 1 ? null : optStr(fd, "meterNumber"),
    notes: optStr(fd, "notes"),
  }));

  await prisma.unit.createMany({ data: rows });
  await audit(user.id, "CREATE", "Unit", propertyId, `${rows.length} unit(s) added`);
  revalidatePath(`/properties/${propertyId}`);
}

export async function updateUnitAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const unit = await prisma.unit.findFirst({
    where: { id, property: { ownerId: user.id } },
    select: { id: true, propertyId: true },
  });
  if (!unit) throw new Error("Unit not found");

  await prisma.unit.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      floor: optStr(fd, "floor"),
      type: str(fd, "type", "FLAT"),
      bedrooms: int(fd, "bedrooms"),
      bathrooms: int(fd, "bathrooms"),
      sizeSqft: int(fd, "sizeSqft") || null,
      rentAmount: nbr(fd, "rentAmount"),
      serviceCharge: nbr(fd, "serviceCharge"),
      meterNumber: optStr(fd, "meterNumber"),
      status: str(fd, "status", "VACANT"),
      notes: optStr(fd, "notes"),
    },
  });

  await audit(user.id, "UPDATE", "Unit", id);
  revalidatePath(`/properties/${unit.propertyId}`);
}

export async function deleteUnitAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const unit = await prisma.unit.findFirst({
    where: { id, property: { ownerId: user.id } },
    select: { id: true, propertyId: true, tenants: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  if (!unit) throw new Error("Unit not found");
  if (unit.tenants.length > 0) throw new Error("Move the tenant out before deleting this unit");

  await prisma.unit.delete({ where: { id } });
  await audit(user.id, "DELETE", "Unit", id);
  revalidatePath(`/properties/${unit.propertyId}`);
}
