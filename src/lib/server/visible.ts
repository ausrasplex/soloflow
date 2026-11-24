import type { Role } from '@prisma/client';
import { db } from './db';
import { visibleAccounts } from './access';

/** Where-clause for statements the person can see: on an account they can see. */
export const myStatements = (userId: string, businessId: string, role: Role, deleted: boolean | null = false) => ({
  businessId,
  ...(deleted === null ? {} : { deletedAt: deleted ? { not: null } : null }),
  account: visibleAccounts(userId, role)
});

/** A stored file the person may open: it belongs to one of their statements, or it is their own upload waiting for review. */
export async function myFile(userId: string, businessId: string, role: Role, id: string) {
  const f = await db.storedFile.findUnique({ where: { id } });
  if (!f) return null;
  const pend = f.pending as { businessId?: string; userId?: string } | null;
  if (pend && pend.businessId === businessId && pend.userId === userId) return f;
  const st = await db.statement.findFirst({ where: { fileId: f.id, ...myStatements(userId, businessId, role, null) } });
  return st ? f : null;
}
