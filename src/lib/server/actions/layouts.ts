// Statement layouts: shared by everyone on the server. Each save makes a new version; statements keep the version that read them.
import { type Action, type Ctx, biz, canEdit, db, need, str } from '../actions';
import { headerKey, parseCsv, pdfPages, readCsv, readPdf, type CsvMap, type PdfMap } from '../importer';
import { myFile } from '../visible';

// account: a balance you hold (money in adds). card: a balance you owe (money out adds).
export const KINDS = ['account', 'card'];

async function sampleRead(c: Ctx, fileId: string, kind: string, format: string, map: Record<string, unknown>) {
  const f = await myFile(c.u.id, biz(c), fileId);
  need(f, 'That sample file is not available.');
  const buf = Buffer.from(f!.data);
  if (format === 'CSV') {
    const rows = parseCsv(buf.toString('utf8').replace(/^﻿/, ''));
    return { read: readCsv(rows, { ...(map as unknown as CsvMap), header: rows[0] || [] }, kind), header: rows[0] || [] };
  }
  return { read: readPdf(await pdfPages(buf), map as unknown as PdfMap, kind), header: null };
}
const cleanMap = (format: string, m: Record<string, unknown>) => {
  if (format === 'CSV') return { cols: Array.isArray(m.cols) ? (m.cols as unknown[]).map((x) => (x ? String(x) : 'ignore')) : [], dateFmt: ['dmy', 'mdy', 'ymd'].includes(String(m.dateFmt)) ? String(m.dateFmt) : 'dmy', header: Array.isArray(m.header) ? (m.header as unknown[]).map(String) : [] };
  const out: Record<string, { page: number; box: number[] }> = {};
  for (const [k, v] of Object.entries(m || {})) {
    const b = v as { page?: number; box?: number[] };
    if (!b || !Array.isArray(b.box) || b.box.length !== 4) continue;
    out[str(k, 20)] = { page: Math.max(1, Math.min(50, Number(b.page) || 1)), box: b.box.map((n) => Math.round(Math.max(0, Math.min(100, Number(n) || 0)) * 10) / 10) };
  }
  return out;
};

export const layoutActions: Record<string, Action> = {
  /** Reads the sample file with the boxes as they are now, so the screen can show real checks before saving. */
  testLayout: async (c) => {
    const format = str(c.p.format) === 'CSV' ? 'CSV' : 'PDF';
    const kind = KINDS.includes(str(c.p.kind)) ? str(c.p.kind) : 'account';
    const { read, header } = await sampleRead(c, str(c.p.fileId), kind, format, cleanMap(format, c.p.map || {}));
    return { read: { ...read, txns: read.txns.slice(0, 12), count: read.txns.length }, header };
  },
  saveLayout: async (c) => {
    canEdit(c);
    const p = c.p;
    const format = str(p.format) === 'CSV' ? 'CSV' : 'PDF';
    const kind = KINDS.includes(str(p.kind)) ? str(p.kind) : '';
    need(kind, 'Choose an account or a credit card statement.');
    const name = str(p.name, 80);
    need(name, 'Give the layout a name.');
    const bank = await db.bank.findFirst({ where: { businessId: biz(c), deletedAt: null, OR: [{ id: str(p.bankId) }, { name: str(p.bankName) }] } });
    const bankName = bank ? bank.name : str(p.bankName, 80);
    need(bankName, 'Choose a bank.');
    const map = cleanMap(format, p.map || {});
    let fingerprint: object = {};
    if (p.fileId) {
      const { read, header } = await sampleRead(c, str(p.fileId), kind, format, map);
      need(read.ok, 'The sample statement does not add up with these boxes yet: ' + read.checks.filter((x) => !x.ok).map((x) => x.text).join('. '));
      if (format === 'CSV' && header) { (map as { header: string[] }).header = header; fingerprint = { header: headerKey(header) }; }
    }
    if (format === 'CSV') need(((map as { header: string[] }).header || []).length, 'Choose a sample CSV file so the header row can be matched.');
    if (p.id) {
      const l = await db.layout.findFirst({ where: { id: str(p.id), deletedAt: null }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
      need(l, 'That layout is not there any more.');
      const n = (l!.versions[0]?.version || 0) + 1;
      await db.layoutVersion.create({ data: { layoutId: l!.id, version: n, map: map as object, fingerprint, createdBy: c.u.displayName } });
      await db.layout.update({ where: { id: l!.id }, data: { name, status: 'ok', failedNote: null } });
      return { id: l!.id, version: n };
    }
    const dup = await db.layout.count({ where: { deletedAt: null, bankName: { equals: bankName, mode: 'insensitive' }, name: { equals: name, mode: 'insensitive' } } });
    need(!dup, 'A layout with this name is already saved for ' + bankName + '.');
    const l = await db.layout.create({ data: { name, bankName, kind, format, versions: { create: { version: 1, map: map as object, fingerprint, createdBy: c.u.displayName } } } });
    return { id: l.id, version: 1 };
  },
  /** A layout can go only when no statement on the server was read with it. */
  deleteLayout: async (c) => {
    canEdit(c);
    const l = await db.layout.findFirst({ where: { id: str(c.p.id), deletedAt: null } });
    need(l, 'That layout is not there any more.');
    const used = await db.statement.count({ where: { deletedAt: null, layoutVersion: { layoutId: l!.id } } });
    need(!used, 'Statements were read with this layout, so it can only be deleted once those statements are deleted.');
    await db.layout.update({ where: { id: l!.id }, data: { deletedAt: new Date(), deletedById: c.u.id } });
  },
  restoreLayout: async (c) => {
    canEdit(c);
    const l = await db.layout.findFirst({ where: { id: str(c.p.id), deletedAt: { not: null } } });
    need(l, 'That layout is not in Deleted Layouts.');
    await db.layout.update({ where: { id: l!.id }, data: { deletedAt: null, deletedById: null } });
  },
  /** Layouts exported from another SoloFlow server (or Folio's account layouts). Names that already exist get a new version instead. */
  importLayouts: async (c) => {
    canEdit(c);
    const items = Array.isArray(c.p.layouts) ? c.p.layouts : [];
    need(items.length, 'That file has no layouts in it.');
    let added = 0, versions = 0;
    for (const it of items.slice(0, 100)) {
      const format = str(it.format ?? it.fmt) === 'CSV' ? 'CSV' : 'PDF';
      const kind = KINDS.includes(str(it.kind)) ? str(it.kind) : null;
      const name = str(it.name, 80), bankName = str(it.bankName ?? it.lenderName, 80);
      if (!kind || !name || !bankName || !it.map) continue;
      const map = cleanMap(format, it.map);
      const fingerprint = format === 'CSV' ? { header: headerKey((map as { header: string[] }).header || []) } : {};
      const ex = await db.layout.findFirst({ where: { deletedAt: null, bankName: { equals: bankName, mode: 'insensitive' }, name: { equals: name, mode: 'insensitive' } }, include: { versions: { orderBy: { version: 'desc' } } } });
      if (ex) {
        if (ex.versions.some((v) => JSON.stringify(v.map) === JSON.stringify(map))) continue;
        await db.layoutVersion.create({ data: { layoutId: ex.id, version: (ex.versions[0]?.version || 0) + 1, map: map as object, fingerprint, createdBy: c.u.displayName } }); versions++;
      } else { await db.layout.create({ data: { name, bankName, kind, format, versions: { create: { version: 1, map: map as object, fingerprint, createdBy: c.u.displayName } } } }); added++; }
    }
    return { added, versions };
  }
};
