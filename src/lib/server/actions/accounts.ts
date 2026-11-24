// Business bank and card accounts. Who sees an account comes from their business role, and each account can
// switch a person on or off (see ../access.ts). Only people who can see an account can change it.
import { type Action, type Ctx, biz, canEdit, canManage, d, db, money, need, str } from '../actions';
import { enc } from '../crypto';
import { ROLE_DEFAULT, ROLE_LOCKED, visibleAccounts } from '../access';

export const ACCOUNT_TYPES = ['Transaction', 'Savings', 'Credit card'];

async function myAccount(c: Ctx, id: unknown, closed: boolean | null = false) {
  const a = await db.account.findFirst({ where: { id: str(id), businessId: biz(c), deletedAt: null, ...(closed === null ? {} : { closedAt: closed ? { not: null } : null }), ...visibleAccounts(c.u.id, c.m!.role) } });
  need(a, 'That account is not one you can see.');
  return a!;
}
/** Saves a person's switch on an account. A switch that matches their role's default is removed, so a later role change still applies. */
async function setAccess(c: Ctx, accountId: string, userId: string, allowed: boolean) {
  const m = await db.membership.findFirst({ where: { businessId: biz(c), userId, removedAt: null } });
  need(m, 'That person is not in this business.');
  need(!ROLE_LOCKED[m!.role], 'Owners always see every account.');
  if (allowed === ROLE_DEFAULT[m!.role]) await db.accountAccess.deleteMany({ where: { accountId, userId } });
  else await db.accountAccess.upsert({ where: { accountId_userId: { accountId, userId } }, update: { allowed, changedAt: new Date(), changedById: c.u.id }, create: { accountId, userId, allowed, changedById: c.u.id } });
  return m!;
}

const bsbOk = (s: string) => !s || /^\d{3}-?\d{3}$/.test(s);
const numOk = (s: string) => !s || /^\d{4,16}$/.test(s.replace(/\s/g, ''));

async function fields(c: Ctx) {
  const p = c.p;
  const name = str(p.name, 80);
  need(name, 'Give the account a name.');
  const bank = await db.bank.findFirst({ where: { businessId: biz(c), deletedAt: null, OR: [{ id: str(p.bankId) }, { name: { equals: str(p.bank), mode: 'insensitive' } }] } });
  need(bank, 'Choose a bank.');
  const type = ACCOUNT_TYPES.includes(str(p.type)) ? str(p.type) : 'Transaction';
  const card = type === 'Credit card';
  const bsb = card ? '' : str(p.bsb, 7), number = str(p.number ?? p.num, 20).replace(/\s/g, '');
  need(bsbOk(bsb), 'A BSB is six digits, like 062-000.');
  need(numOk(number), card ? 'Enter the last 4 digits of the card, or leave it empty.' : 'An account number is 4 to 12 digits.');
  return { name, bankId: bank!.id, type, bsb: bsb ? enc(bsb.replace(/^(\d{3})-?(\d{3})$/, '$1-$2')) : null, number: number ? enc(card ? number.slice(-4) : number) : null, nameOnAccount: str(p.holder, 120) || null };
}

export const accountActions: Record<string, Action> = {
  createAccount: async (c) => {
    canEdit(c);
    const f = await fields(c);
    const dup = await db.account.count({ where: { businessId: biz(c), deletedAt: null, closedAt: null, name: { equals: f.name, mode: 'insensitive' }, ...visibleAccounts(c.u.id, c.m!.role) } });
    need(!dup, 'You already have an account with this name.');
    const ob = c.p.openingBalance === '' || c.p.openingBalance == null ? 0 : money(c.p.openingBalance);
    need(isFinite(ob), 'Enter the balance as a number.');
    const a = await db.account.create({ data: { ...f, businessId: biz(c), openingBalance: ob, openingDate: d(c.p.openingDate) || new Date(), openedAt: d(c.p.openedAt) } });
    // switches chosen while adding (only an owner can change other people's); you always see an account you add
    const sw = (c.p.access && typeof c.p.access === 'object' ? c.p.access : {}) as Record<string, unknown>;
    const isOwner = c.m!.role === 'OWNER' || c.u.isAdmin;
    for (const [userId, on] of Object.entries(sw)) if (isOwner && userId !== c.u.id) await setAccess(c, a.id, str(userId), !!on).catch(() => {});
    if (!ROLE_LOCKED[c.m!.role] && !ROLE_DEFAULT[c.m!.role]) await setAccess(c, a.id, c.u.id, true);
    return { id: a.id };
  },
  editAccount: async (c) => {
    canEdit(c);
    const a = await myAccount(c, c.p.id);
    const f = await fields(c);
    const dup = await db.account.count({ where: { businessId: biz(c), deletedAt: null, closedAt: null, id: { not: a.id }, name: { equals: f.name, mode: 'insensitive' }, ...visibleAccounts(c.u.id, c.m!.role) } });
    need(!dup, 'You already have an account with this name.');
    // the BSB and number stay as they were when the fields come back masked or empty
    const keep = (v: unknown) => v === undefined || /•/.test(String(v));
    await db.account.update({ where: { id: a.id }, data: { ...f, ...(keep(c.p.bsb) ? { bsb: a.bsb } : {}), ...(keep(c.p.number ?? c.p.num) ? { number: a.number } : {}) } });
    return { id: a.id };
  },
  closeAccount: async (c) => {
    canEdit(c);
    const a = await myAccount(c, c.p.id);
    await db.account.update({ where: { id: a.id }, data: { closedAt: d(c.p.date) || new Date() } });
  },
  /** The switch for one person on one account. Business owners decide who sees what. */
  setAccountAccess: async (c) => {
    canManage(c);
    const a = await myAccount(c, c.p.accountId, null);
    const m = await setAccess(c, a.id, str(c.p.userId), !!c.p.allowed);
    const u = await db.user.findUnique({ where: { id: m.userId } });
    return { text: (u?.displayName || 'They') + (c.p.allowed ? ' can now see ' : ' can no longer see ') + a.name };
  },
  restoreAccount: async (c) => {
    canEdit(c);
    const a = await myAccount(c, c.p.id, true);
    await db.account.update({ where: { id: a.id }, data: { closedAt: null } });
  }
};
