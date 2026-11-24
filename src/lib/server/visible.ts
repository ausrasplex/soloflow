import { db } from './db';

/** Where-clause for statements the person can see: on an account they hold. */
export const myStatements = (userId: string, businessId: string, deleted: boolean | null = false) => ({
  businessId,
  ...(deleted === null ? {} : { deletedAt: deleted ? { not: null } : null }),
  account: { holders: { some: { userId } } }
});

/** A stored file the person may open: it belongs to one of their statements, or it is their own upload waiting for review. */
export async function myFile(userId: string, businessId: string, id: string) {
  const f = await db.storedFile.findUnique({ where: { id } });
  if (!f) return null;
  const pend = f.pending as { businessId?: string; userId?: string } | null;
  if (pend && pend.businessId === businessId && pend.userId === userId) return f;
  const st = await db.statement.findFirst({ where: { fileId: f.id, ...myStatements(userId, businessId, null) } });
  return st ? f : null;
}
