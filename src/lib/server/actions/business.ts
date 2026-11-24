// Business settings: name, ABN and GST details, members and their roles, invites, deleting the business.
import { type Action, type Ctx, biz, canManage, db, need, str } from '../actions';
import { token } from '../crypto';
import { seesAccount } from '../access';

const ROLES: Record<string, 'OWNER' | 'EDITOR' | 'VIEWER'> = { Owner: 'OWNER', Editor: 'EDITOR', Viewer: 'VIEWER', OWNER: 'OWNER', EDITOR: 'EDITOR', VIEWER: 'VIEWER' };
const WORD: Record<string, string> = { OWNER: 'an owner', EDITOR: 'an editor', VIEWER: 'a viewer' };

/** An ABN is 11 digits whose weighted sum (after taking 1 from the first digit) divides by 89. */
export function abnOk(raw: string) {
  const s = raw.replace(/\s/g, '');
  if (!/^\d{11}$/.test(s)) return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = s.split('').reduce((t, ch, i) => t + (Number(ch) - (i === 0 ? 1 : 0)) * w[i], 0);
  return sum % 89 === 0;
}
export const abnFormat = (s: string) => s.replace(/\s/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');

async function ownersLeft(c: Ctx, change?: { userId: string; role?: string; removed?: boolean }) {
  const ms = await db.membership.findMany({ where: { businessId: biz(c), removedAt: null } });
  return ms.filter((m) => {
    if (change && m.userId === change.userId) return !change.removed && (change.role ?? m.role) === 'OWNER';
    return m.role === 'OWNER';
  }).length;
}
async function member(c: Ctx, userId: unknown, removed = false) {
  const m = await db.membership.findFirst({ where: { businessId: biz(c), userId: str(userId), removedAt: removed ? { not: null } : null }, include: { user: true } });
  need(m, 'That person is not in this business.');
  return m!;
}

export const businessActions: Record<string, Action> = {
  renameBusiness: async (c) => {
    canManage(c);
    const name = str(c.p.name, 60);
    need(name, 'A business needs a name.');
    await db.business.update({ where: { id: biz(c) }, data: { name } });
  },
  /** ABN, GST registration and how often BAS is lodged. */
  businessTax: async (c) => {
    canManage(c);
    const data: { abn?: string | null; gstRegistered?: boolean; gstPeriod?: string } = {};
    if ('abn' in c.p) {
      const abn = str(c.p.abn, 20);
      need(!abn || abnOk(abn), 'That ABN is not valid. It has 11 digits, like 51 824 753 556.');
      data.abn = abn ? abnFormat(abn) : null;
    }
    if ('gstRegistered' in c.p) data.gstRegistered = !!c.p.gstRegistered;
    if ('gstPeriod' in c.p) data.gstPeriod = str(c.p.gstPeriod) === 'monthly' ? 'monthly' : 'quarterly';
    await db.business.update({ where: { id: biz(c) }, data });
  },
  setRole: async (c) => {
    canManage(c);
    const m = await member(c, c.p.userId);
    const role = ROLES[str(c.p.role)];
    need(role, 'Choose a role.');
    need(await ownersLeft(c, { userId: m.userId, role }), 'A business needs at least one owner.');
    await db.membership.update({ where: { id: m.id }, data: { role } });
    return { text: m.user.displayName + ' is now ' + WORD[role] };
  },
  removeMember: async (c) => {
    canManage(c);
    const m = await member(c, c.p.userId);
    need(m.userId !== c.u.id, 'You cannot remove yourself. Ask another owner.');
    need(await ownersLeft(c, { userId: m.userId, removed: true }), 'A business needs at least one owner. Make someone else an owner first.');
    await db.membership.update({ where: { id: m.id }, data: { removedAt: new Date() } });
    await db.user.updateMany({ where: { id: m.userId, currentBusinessId: m.businessId }, data: { currentBusinessId: null } });
  },
  restoreMember: async (c) => {
    canManage(c);
    const m = await member(c, c.p.userId, true);
    await db.membership.update({ where: { id: m.id }, data: { removedAt: null } });
  },
  createInvite: async (c) => {
    canManage(c);
    const role = ROLES[str(c.p.role)] || 'VIEWER';
    const inv = await db.invite.create({ data: { businessId: biz(c), role, token: token(18), createdById: c.u.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    return { id: inv.id, token: inv.token };
  },
  revokeInvite: async (c) => {
    canManage(c);
    const inv = await db.invite.findFirst({ where: { id: str(c.p.id), businessId: biz(c), usedAt: null, revokedAt: null } });
    need(inv, 'That invite is no longer waiting.');
    await db.invite.update({ where: { id: inv!.id }, data: { revokedAt: new Date() } });
  },
  /** Only a business with no open accounts can go. A blocked delete names only what you can see. */
  deleteBusiness: async (c) => {
    canManage(c);
    const bid = biz(c);
    const accts = await db.account.findMany({ where: { businessId: bid, deletedAt: null, closedAt: null }, include: { access: { where: { userId: c.u.id } } } });
    const visible = accts.filter((a) => seesAccount(c.m!.role, a.access[0]?.allowed)).map((a) => a.name);
    const hidden = accts.length - visible.length;
    if (visible.length || hidden) return { blocked: true, visible, hidden: hidden > 0 };
    const row = await db.business.findUnique({ where: { id: bid } });
    need(str(c.p.confirm).toLowerCase() === row!.name.toLowerCase(), 'Type the business name to confirm.');
    await db.business.update({ where: { id: bid }, data: { deletedAt: new Date() } });
    await db.invite.updateMany({ where: { businessId: bid, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const next = await db.membership.findFirst({ where: { userId: c.u.id, removedAt: null, businessId: { not: bid }, business: { deletedAt: null } } });
    await db.user.update({ where: { id: c.u.id }, data: { currentBusinessId: next?.businessId || null } });
    return { deleted: true };
  },
  createBusiness: async (c) => {
    const name = str(c.p.name, 60);
    need(name, 'A business needs a name.');
    const b = await db.business.create({ data: { name, memberships: { create: { userId: c.u.id, role: 'OWNER' } } } });
    await db.user.update({ where: { id: c.u.id }, data: { currentBusinessId: b.id } });
    return { id: b.id };
  }
};
