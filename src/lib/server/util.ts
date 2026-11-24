// Small date and number helpers shared by the server code. Money is exact decimal in the database.
import Decimal from 'decimal.js';

export const DAY = 86400000;
export const today0 = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
export const num = (v: Decimal.Value | null | undefined) => (v == null ? 0 : new Decimal(v).toNumber());
