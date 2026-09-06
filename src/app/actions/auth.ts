"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword, getCurrentUser } from "@/lib/auth";
import { normalizePhone, isValidBdPhone } from "@/lib/format";
import { audit, str } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export type AuthState = { error?: string } | null;

export async function registerAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const name = str(fd, "name");
  const phone = normalizePhone(str(fd, "phone"));
  const email = str(fd, "email");
  const password = str(fd, "password");
  const businessName = str(fd, "businessName");

  if (name.length < 3) return { error: "নাম কমপক্ষে ৩ অক্ষরের হতে হবে / Name is too short" };
  if (!isValidBdPhone(phone)) return { error: "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)" };
  if (password.length < 6) return { error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে / Password too short" };

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return { error: "এই নম্বরে অ্যাকাউন্ট আছে / This number is already registered" };

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) return { error: "এই ইমেইলে অ্যাকাউন্ট আছে / Email already used" };
  }

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email: email || null,
      businessName: businessName || null,
      passwordHash: await hashPassword(password),
      role: "OWNER",
    },
  });

  await audit(user.id, "REGISTER", "User", user.id, `${name} registered`);
  await createSession({ sub: user.id, role: user.role, name: user.name, phone: user.phone });
  redirect("/dashboard");
}

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const phone = normalizePhone(str(fd, "phone"));
  const password = str(fd, "password");

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return { error: "নম্বর বা পাসওয়ার্ড ভুল / Wrong number or password" };
  if (user.status === "SUSPENDED") return { error: "অ্যাকাউন্ট স্থগিত আছে / Account suspended" };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "নম্বর বা পাসওয়ার্ড ভুল / Wrong number or password" };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ sub: user.id, role: user.role, name: user.name, phone: user.phone });
  await audit(user.id, "LOGIN", "User", user.id);

  redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "LOGOUT", "User", user.id);
  await destroySession();
  redirect("/login");
}

export async function updateProfileAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  const name = str(fd, "name");
  const email = str(fd, "email");
  if (name.length < 3) return { error: "নাম কমপক্ষে ৩ অক্ষরের হতে হবে" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email: email || null,
      businessName: str(fd, "businessName") || null,
      address: str(fd, "address") || null,
      nid: str(fd, "nid") || null,
    },
  });
  await audit(user.id, "UPDATE", "User", user.id, "profile updated");
  revalidatePath("/settings");
  return { error: undefined };
}

export async function changePasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  const current = str(fd, "currentPassword");
  const next = str(fd, "newPassword");
  if (next.length < 6) return { error: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" };

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return { error: "বর্তমান পাসওয়ার্ড ভুল / Current password is wrong" };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(user.id, "PASSWORD_CHANGE", "User", user.id);
  return { error: undefined };
}
