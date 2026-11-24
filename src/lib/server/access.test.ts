import { describe, expect, it } from 'vitest';
import { seesAccount, visibleAccounts } from './access';

describe('account access', () => {
  it('owners always see every account, even if a switch says off', () => {
    expect(seesAccount('OWNER', null)).toBe(true);
    expect(seesAccount('OWNER', false)).toBe(true);
    expect(visibleAccounts('u', 'OWNER')).toEqual({});
  });
  it('editors see accounts unless switched off', () => {
    expect(seesAccount('EDITOR', null)).toBe(true);
    expect(seesAccount('EDITOR', false)).toBe(false);
  });
  it('viewers see only accounts switched on for them', () => {
    expect(seesAccount('VIEWER', null)).toBe(false);
    expect(seesAccount('VIEWER', true)).toBe(true);
    expect(visibleAccounts('u', 'VIEWER')).toEqual({ access: { some: { userId: 'u', allowed: true } } });
  });
});
