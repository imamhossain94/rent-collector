import "server-only";
import { prisma } from "./prisma";

/**
 * Append-only trail of who did what. Kept in its own server-only module: it
 * touches the database, and pulling it into src/lib/utils.ts dragged Prisma
 * (and node-postgres) into every client bundle that wanted `cx()`.
 */
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
