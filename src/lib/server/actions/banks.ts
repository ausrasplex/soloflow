// Banks: shared by everyone in the business. Accounts and statement layouts point at them.
import { type Action, type Ctx, biz, canEdit, db, need, str } from '../actions';

const img = (v: unknown) => { const s = String(v ?? ''); if (!s) return null; need(/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(s) && s.length < 900000, 'That image is too large or not a picture.'); return s; };
const url = (v: unknown) => { const s = str(v, 300); return s && !/^https?:\/\//i.test(s) ? 'https://' + s : s; };

async function bankOf(c: Ctx, id: unknown, deleted = false) {
  const b = await db.bank.findFirst({ where: { id: str(id), businessId: biz(c), deletedAt: deleted ? { not: null } : null } });
  need(b, 'That bank is not in your business.');
  return b!;
}
async function dupName(c: Ctx, name: string, except?: string) {
  const n = await db.bank.count({ where: { businessId: biz(c), deletedAt: null, name: { equals: name, mode: 'insensitive' }, NOT: except ? { id: except } : undefined } });
  need(!n, 'A bank with this name is already saved.');
}

const bankData = (p: Record<string, unknown>) => ({
  name: str(p.name, 80), website: url(p.website ?? p.web) || null, phone: str(p.phone, 40) || null, email: str(p.email, 120) || null, note: str(p.note, 300) || null,
  ...('icon' in p ? { icon: img(p.icon) } : {}), ...('logo' in p ? { logo: img(p.logo) } : {})
});

export const bankActions: Record<string, Action> = {
  addBank: async (c) => {
    canEdit(c);
    const data = bankData(c.p);
    need(data.name, 'Give the bank a name.');
    await dupName(c, data.name);
    const b = await db.bank.create({ data: { businessId: biz(c), ...data } });
    return { id: b.id };
  },
  updateBank: async (c) => {
    canEdit(c);
    const b = await bankOf(c, c.p.id);
    const data = bankData(c.p);
    need(data.name, 'Give the bank a name.');
    await dupName(c, data.name, b.id);
    await db.bank.update({ where: { id: b.id }, data });
    return { id: b.id };
  },
  deleteBank: async (c) => {
    canEdit(c);
    const b = await bankOf(c, c.p.id);
    const inUse = await db.account.count({ where: { bankId: b.id, deletedAt: null, closedAt: null } });
    need(!inUse, 'This bank still has open accounts.');
    await db.bank.update({ where: { id: b.id }, data: { deletedAt: new Date(), deletedById: c.u.id } });
    return { ok: true };
  },
  restoreBank: async (c) => {
    canEdit(c);
    const b = await bankOf(c, c.p.id, true);
    await dupName(c, b.name, b.id);
    await db.bank.update({ where: { id: b.id }, data: { deletedAt: null, deletedById: null } });
    return { ok: true };
  }
};
