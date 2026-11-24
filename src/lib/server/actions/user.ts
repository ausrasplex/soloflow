import { type Action, db, need, str } from '../actions';
import { checkPassword, hashPassword } from '../auth';
import { dec, enc, sha256 } from '../crypto';
import { checkCode, makeRecoveryCodes, newSecret, otpUri, useRecoveryCode } from '../twofactor';

const img = (v: unknown) => { const s = String(v ?? ''); if (!s) return null; need(/^data:image\/(png|jpeg|webp|gif);base64,/.test(s) && s.length < 600000, 'That image is too large or not a picture.'); return s; };
const freshCodes = async (userId: string) => { const codes = makeRecoveryCodes(); await db.user.update({ where: { id: userId }, data: { recoveryCodes: codes.map((c) => sha256(c.toUpperCase())) } }); return codes; };

const mergePrefs = async (userId: string, patch: Record<string, unknown>) => {
  const u = await db.user.findUnique({ where: { id: userId } });
  const p = { ...((u?.prefs as Record<string, unknown>) || {}), ...patch };
  await db.user.update({ where: { id: userId }, data: { prefs: p as object } });
  return p;
};

export const userActions: Record<string, Action> = {
  theme: async ({ u, p }) => {
    const themes = ['lilac', 'ocean', 'forest', 'sunset', 'graphite'];
    await db.user.update({ where: { id: u.id }, data: { theme: themes.includes(p.theme) ? p.theme : 'lilac', mode: p.mode === 'dark' ? 'dark' : 'light' } });
  },
  alertsRead: async ({ u, p }) => {
    const prev = ((u.prefs as Record<string, unknown>)?.readAlerts as string[]) || [];
    const ids = Array.isArray(p.ids) ? p.ids.map(String) : [];
    await mergePrefs(u.id, { readAlerts: Array.from(new Set(prev.concat(ids))).slice(-500) });
  },
  prefs: async ({ u, p }) => {
    const allowed = ['accountsHeroCards', 'alerts', 'missDays'];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in p) patch[k] = p[k];
    await mergePrefs(u.id, patch);
  },
  setName: async ({ u, p }) => {
    const name = str(p.name, 60);
    need(name, 'Enter a name.');
    await db.user.update({ where: { id: u.id }, data: { displayName: name } });
  },
  setPhoto: async ({ u, p }) => { await db.user.update({ where: { id: u.id }, data: { photo: img(p.photo) } }); },
  /** There is no mail server on a home install, so the sign-in email changes straight away after the password is checked. */
  changeEmail: async ({ u, p }) => {
    const email = str(p.email, 120).toLowerCase();
    need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address.');
    need(await checkPassword(String(p.password || ''), u.passwordHash), 'That password is not right.');
    need(!(await db.user.count({ where: { email, id: { not: u.id } } })), 'Another account on this server uses that email.');
    await db.user.update({ where: { id: u.id }, data: { email, pendingEmail: null, emailToken: null } });
  },
  changePassword: async ({ u, p }) => {
    need(await checkPassword(String(p.cur || ''), u.passwordHash), 'Your current password is not right.');
    const nw = String(p.nw || '');
    need(nw.length >= 12, 'The new password needs at least 12 characters.');
    need(nw !== p.cur, 'Choose a password you have not used here.');
    await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(nw) } });
    await mergePrefs(u.id, { pwChanged: new Date().toISOString() });
    if (p.others) await db.session.deleteMany({ where: { userId: u.id, id: { not: u.sessionId } } });
  },
  tfaStart: async ({ u }) => {
    need(!u.totpOn, 'Two-step verification is already on.');
    const secret = await newSecret();
    await db.user.update({ where: { id: u.id }, data: { totpSecret: enc(secret) } });
    return { secret, uri: otpUri(secret, u.email) };
  },
  tfaVerify: async ({ u, p }) => {
    const fresh = await db.user.findUnique({ where: { id: u.id } });
    need(fresh?.totpSecret, 'Start the set-up again.');
    need(await checkCode(dec(fresh!.totpSecret), str(p.code).replace(/\s/g, '')), 'That code did not match. Check the time on your phone and try the newest code.');
    await db.user.update({ where: { id: u.id }, data: { totpOn: true } });
    await mergePrefs(u.id, { tfaOn: new Date().toISOString() });
    return { codes: await freshCodes(u.id) };
  },
  tfaCodes: async ({ u, p }) => {
    need(u.totpOn && u.totpSecret, 'Two-step verification is off.');
    need(await checkCode(dec(u.totpSecret), str(p.code).replace(/\s/g, '')), 'That code did not match.');
    return { codes: await freshCodes(u.id) };
  },
  tfaOff: async ({ u, p }) => {
    need(u.totpOn && u.totpSecret, 'Two-step verification is already off.');
    const code = str(p.code).replace(/\s/g, '');
    need((await checkCode(dec(u.totpSecret), code)) || (await useRecoveryCode(u.id, code)), 'That code did not match.');
    await db.user.update({ where: { id: u.id }, data: { totpOn: false, totpSecret: null, recoveryCodes: [] } });
  },
  signOutSession: async ({ u, p }) => {
    need(str(p.id) !== u.sessionId, 'Use Log out to sign out of this device.');
    await db.session.deleteMany({ where: { userId: u.id, id: str(p.id) } });
  },
  signOutOthers: async ({ u }) => { await db.session.deleteMany({ where: { userId: u.id, id: { not: u.sessionId } } }); },
  leaveBusiness: async ({ u, p }) => {
    const m = await db.membership.findFirst({ where: { userId: u.id, businessId: str(p.id), removedAt: null } });
    need(m, 'You are not in that business.');
    if (m!.role === 'OWNER') need(await db.membership.count({ where: { businessId: m!.businessId, removedAt: null, role: 'OWNER', userId: { not: u.id } } }), 'You are the only owner. Make someone else an owner first, or delete the business.');
    await db.membership.update({ where: { id: m!.id }, data: { removedAt: new Date() } });
    if (u.currentBusinessId === m!.businessId) {
      const next = await db.membership.findFirst({ where: { userId: u.id, removedAt: null, business: { deletedAt: null } } });
      await db.user.update({ where: { id: u.id }, data: { currentBusinessId: next?.businessId || null } });
    }
  },
  switchBusiness: async ({ u, p }) => {
    const m = await db.membership.findFirst({ where: { userId: u.id, businessId: str(p.id), removedAt: null } });
    need(m, 'You are not in that business.');
    await db.user.update({ where: { id: u.id }, data: { currentBusinessId: m!.businessId } });
  }
};
export { mergePrefs };
