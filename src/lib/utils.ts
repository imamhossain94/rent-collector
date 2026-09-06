import { prisma } from "./prisma";

/* ------------------------- form data helpers ------------------------- */

export function str(fd: FormData, key: string, fallback = ""): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : fallback;
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export function nbr(fd: FormData, key: string, fallback = 0): number {
  const v = str(fd, key);
  if (v === "") return fallback;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function int(fd: FormData, key: string, fallback = 0): number {
  return Math.trunc(nbr(fd, key, fallback));
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function dateOrNull(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateOr(fd: FormData, key: string, fallback: Date = new Date()): Date {
  return dateOrNull(fd, key) ?? fallback;
}

/* ---------------------------- audit trail ---------------------------- */

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  summary?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, summary: summary ?? null },
    });
  } catch {
    // never let logging break a user action
  }
}

/* --------------------------- action results -------------------------- */

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

export function fail(error: string): ActionState {
  return { ok: false, error };
}

export function done(message?: string): ActionState {
  return { ok: true, message };
}

/* ------------------------------ misc --------------------------------- */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + (pick(row) || 0), 0);
}

export function groupBy<T, K extends string>(rows: T[], key: (row: T) => K): Record<K, T[]> {
  return rows.reduce((acc, row) => {
    const k = key(row);
    (acc[k] ||= []).push(row);
    return acc;
  }, {} as Record<K, T[]>);
}
