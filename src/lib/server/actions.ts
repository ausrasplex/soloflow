// Every change the screens can make. Each checks access itself.
import type { Membership, Business } from '@prisma/client';
import type { CurrentUser } from './auth';
import { db } from './db';

export class Fail extends Error {}
export type Ctx = { u: CurrentUser; m: (Membership & { business: Business }) | null; p: Record<string, any> };
export type Action = (c: Ctx) => Promise<unknown>;

export const need = (cond: unknown, msg: string) => { if (!cond) throw new Fail(msg); };
/** The business the person is working in. */
export const biz = (c: Ctx) => { need(c.m, 'You are not in a business yet.'); return c.m!.businessId; };
export const canEdit = (c: Ctx) => need(c.m && (c.m.role !== 'VIEWER' || c.u.isAdmin), 'Viewers cannot change business settings.');
export const canManage = (c: Ctx) => need(c.m && (c.m.role === 'OWNER' || c.u.isAdmin), 'Only business owners can do that.');
export const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
export const d = (v: unknown) => { const s = String(v || ''); if (!s) return null; const x = new Date(s.length === 10 ? s + 'T00:00:00Z' : s); return isNaN(+x) ? null : x; };
export const money = (v: unknown) => { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; };

/** Of the people given, those who are current members of this business. */
export async function memberIds(c: Ctx, ids: unknown) {
  const list = Array.isArray(ids) ? ids.map(String) : [];
  const ms = await db.membership.findMany({ where: { businessId: biz(c), removedAt: null, userId: { in: list } } });
  return ms.map((m) => m.userId);
}

import { userActions } from './actions/user';
import { businessActions } from './actions/business';
import { bankActions } from './actions/banks';
import { accountActions } from './actions/accounts';
import { statementActions } from './actions/statements';
import { layoutActions } from './actions/layouts';
import { serverActions } from './actions/server';
import { channelActions } from './actions/channels';

export const ACTIONS: Record<string, Action> = {
  ...userActions, ...businessActions, ...bankActions, ...accountActions, ...statementActions, ...layoutActions, ...serverActions, ...channelActions
};
export { db };
