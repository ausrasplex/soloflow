import { describe, expect, it } from 'vitest';
import { abnFormat, abnOk } from './actions/business';

describe('ABN check', () => {
  it('accepts a valid ABN with or without spaces', () => {
    expect(abnOk('51 824 753 556')).toBe(true);
    expect(abnOk('51824753556')).toBe(true);
  });
  it('rejects a wrong check digit or length', () => {
    expect(abnOk('51 824 753 557')).toBe(false);
    expect(abnOk('1234')).toBe(false);
  });
  it('formats as 2-3-3-3', () => {
    expect(abnFormat('51824753556')).toBe('51 824 753 556');
  });
});
