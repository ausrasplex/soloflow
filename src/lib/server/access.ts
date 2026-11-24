// Who can see an account. Each business member gets their role's default, and an account can switch a person
// on or off (an AccountAccess row). Owners always see every account; the switch is locked on for them.
// Admin is a server role and gives no access to accounts.
import type { Prisma, Role } from '@prisma/client';

export const ROLE_DEFAULT: Record<Role, boolean> = { OWNER: true, EDITOR: true, VIEWER: false };
export const ROLE_LOCKED: Record<Role, boolean> = { OWNER: true, EDITOR: false, VIEWER: false };

/** Whether a member with this role sees an account, given the account's switch for them (if any). */
export function seesAccount(role: Role, allowed: boolean | null | undefined) {
  if (ROLE_LOCKED[role]) return true;
  return allowed ?? ROLE_DEFAULT[role];
}

/** Where-clause for the accounts a member can see. */
export function visibleAccounts(userId: string, role: Role): Prisma.AccountWhereInput {
  if (ROLE_LOCKED[role]) return {};
  return ROLE_DEFAULT[role]
    ? { NOT: { access: { some: { userId, allowed: false } } } }
    : { access: { some: { userId, allowed: true } } };
}
