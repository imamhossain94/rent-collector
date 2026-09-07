"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str, optStr } from "@/lib/utils";
import { normalizePhone, isValidBdPhone } from "@/lib/format";

export async function toggleUserStatusAction(fd: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(fd, "id");
  if (id === admin.id) throw new Error("You cannot suspend your own account");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");

  const status = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  await prisma.user.update({ where: { id }, data: { status } });
  await audit(admin.id, "STATUS", "User", id, `${user.name} → ${status}`);
  revalidatePath("/admin/users");
}

export async function setUserPlanAction(fd: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(fd, "id");
  const plan = str(fd, "plan", "FREE");

  await prisma.user.update({ where: { id }, data: { plan } });
  await audit(admin.id, "PLAN", "User", id, `plan → ${plan}`);
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(fd: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(fd, "id");
  const password = str(fd, "password");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  await audit(admin.id, "PASSWORD_RESET", "User", id);
  revalidatePath("/admin/users");
}

export async function createUserAction(fd: FormData) {
  const admin = await requireSuperAdmin();
  const phone = normalizePhone(str(fd, "phone"));
  const name = str(fd, "name");
  const password = str(fd, "password");

  if (!isValidBdPhone(phone)) throw new Error("Invalid mobile number");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new Error("This number already has an account");

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email: optStr(fd, "email"),
      businessName: optStr(fd, "businessName"),
      role: str(fd, "role", "OWNER"),
      plan: str(fd, "plan", "FREE"),
      passwordHash: await hashPassword(password),
    },
  });

  await audit(admin.id, "CREATE", "User", user.id, `${name} created by admin`);
  revalidatePath("/admin/users");
}

export async function deleteUserAction(fd: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(fd, "id");
  if (id === admin.id) throw new Error("You cannot delete your own account");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");

  await prisma.user.delete({ where: { id } });
  await audit(admin.id, "DELETE", "User", id, `${user.name} deleted`);
  revalidatePath("/admin/users");
}
