import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Lang } from "./constants";

const SESSION_COOKIE = "bk_session";
const LANG_COOKIE = "bk_lang";
const THEME_COOKIE = "bk_theme";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    // A missing secret in production would mean every session cookie is signed
    // with a value published in this repo — anyone could forge a login. Fail
    // the request instead of quietly accepting that.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set. Add it to the deployment's environment variables.");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please-32");
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = {
  sub: string;
  role: string;
  name: string;
  phone: string;
};

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  plan: string;
  language: string;
  businessName: string | null;
  address: string | null;
  nid: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session?.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      plan: true,
      language: true,
      businessName: true,
      address: true,
      nid: true,
    },
  });
  if (!user || user.status === "SUSPENDED") return null;
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOwner(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "OWNER" && user.role !== "SUPER_ADMIN") redirect("/login");
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return user;
}

/* ------------------------------------------------------------------ */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ---------------------- preferences (cookies) --------------------- */

/**
 * Language for a signed-in user. English is the default, and the account's own
 * preference wins — a `bk_lang` cookie left behind on some browser can't flip
 * the language behind the owner's back. The cookie only decides for visitors
 * who are not signed in (landing, login, register).
 */
export function userLang(user: { language?: string | null } | null | undefined, fallback: Lang = "en"): Lang {
  const value = user?.language;
  return value === "en" || value === "bn" ? value : fallback;
}

export async function getLang(fallback: Lang = "en"): Promise<Lang> {
  const jar = await cookies();
  const value = jar.get(LANG_COOKIE)?.value;
  return value === "en" || value === "bn" ? value : fallback;
}

export async function setLangCookie(lang: Lang): Promise<void> {
  const jar = await cookies();
  jar.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function getTheme(): Promise<"dark" | "light"> {
  const jar = await cookies();
  // Light is the default; dark only when the user has picked it.
  return jar.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}

export async function setThemeCookie(theme: "dark" | "light"): Promise<void> {
  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export const COOKIE_NAMES = { SESSION_COOKIE, LANG_COOKIE, THEME_COOKIE };
