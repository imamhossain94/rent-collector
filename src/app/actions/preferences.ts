"use server";

import { revalidatePath } from "next/cache";
import { setLangCookie, setThemeCookie, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/constants";

export async function setLanguage(lang: Lang) {
  await setLangCookie(lang);
  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { language: lang } });
  }
  revalidatePath("/", "layout");
}

export async function setTheme(theme: "dark" | "light") {
  await setThemeCookie(theme);
}
