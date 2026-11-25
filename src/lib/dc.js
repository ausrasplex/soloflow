'use client';
// Runtime for screens generated from the mockup boards (tools/convert.py).
import React from 'react';

export const HostCtx = React.createContext({ data: null, act: async () => null, reload: async () => null, theme: null, setTheme: () => {} });

// Base class: the mockup logic classes used DCLogic, which behaves like a React class component.
export class DCBase extends React.Component {
  static contextType = HostCtx;
  constructor(props, context) {
    super(props, context);
    const me = context && context.data && context.data.me;
    this.state = me ? { themeId: me.theme || 'lilac', mode: me.mode || 'light' } : {};
  }
  get data() { return (this.context && this.context.data) || {}; }
  act(kind, payload, opts) { return this.context.act(kind, payload, opts); }
  /** Runs an action and shows its error (or a message) in the screen's toast when it has one. */
  async run(kind, payload, okMsg) {
    try { const r = await this.act(kind, payload); if (okMsg && this.flash) this.flash(okMsg); return r; }
    catch (e) { if (this.flash) this.flash(e.message); else if (typeof window !== 'undefined') window.alert(e.message); return null; }
  }
  /** Saves the theme on the server and repaints the shared frame straight away. */
  saveThemeServer(theme, mode) { try { if (this.context && this.context.setTheme) this.context.setTheme(theme, mode); this.act('theme', { theme, mode }, { reload: false }); } catch (e) {} }
  /** Values every screen shares: you, the business and the alerts. Merged over each screen's own values. */
  common() {
    const d = this.data; const me = d.me || {}; const st = this.state || {};
    const read = (me.readAlerts || []);
    const notifs = (d.notifications || []).map((n) => {
      const unread = read.indexOf(n.id) < 0;
      return Object.assign({}, n, { dot: unread ? 'background:var(--primary)' : 'background:transparent',
        open: () => { if (n.fo) { try { window.localStorage.setItem('soloflowOpen', JSON.stringify(Object.assign({ t: Date.now() }, n.fo))); } catch (e) {} } this.act('alertsRead', { ids: [n.id] }, { reload: false }); } });
    });
    const unreadCount = notifs.filter((n) => read.indexOf(n.id) < 0).length;
    return {
      meIni: me.initials || '?', mePhotoSt: me.photo ? ";background:var(--a1) url('" + me.photo + "') center/cover no-repeat;color:transparent" : '',
      bizLabel: (d.business && d.business.name) || 'Business',
      notifs, unreadCount, hasUnread: unreadCount > 0, allRead: unreadCount === 0, noNotifs: notifs.length === 0,
      notifsOpen: !!st.notifsOpen, toggleNotifs: () => this.setState({ notifsOpen: !st.notifsOpen }),
      markAll: () => this.act('alertsRead', { ids: notifs.map((n) => n.id) })
    };
  }
  notifRead() { return ((this.data.me || {}).readAlerts) || []; }
  notifMark(ids) { this.act('alertsRead', { ids }); }
  bizSaved() { return (this.data.business && this.data.business.name) || 'Business'; }
}

/** The business name in the header; opens a menu to switch when you belong to more than one. */
export function BusinessSwitch({ style, chevron }) {
  const ctx = React.useContext(HostCtx);
  const [open, setOpen] = React.useState(false);
  const d = ctx.data || {};
  const all = d.businesses || [];
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: '0 1 auto', minWidth: 0 }}>
      {/* a long name stays on one line and ends in an ellipsis; the full name is in the tooltip and the menu */}
      <button className="hbs" type="button" style={Object.assign({}, style, { minWidth: 0, maxWidth: '100%' })} title={(d.business && d.business.name) || undefined} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(d.business && d.business.name) || 'Business'}</span>
        <span style={{ flex: 'none', display: 'inline-flex' }}>{chevron}</span>
      </button>
      {open ? (
        <>
          <span onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <span role="menu" className="bizmenu" style={{ position: 'absolute', top: 50, left: 0, zIndex: 50, minWidth: 260, maxWidth: 'min(360px, calc(100vw - 32px))', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 20, padding: 8, boxShadow: '0 12px 32px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' }}>
            <span style={{ padding: '8px 12px 4px', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Your businesses</span>
            {all.map((h) => (
              <button key={h.id} type="button" role="menuitemradio" aria-checked={h.current} className="bizopt" onClick={async () => { setOpen(false); if (!h.current) { await ctx.act('switchBusiness', { id: h.id }); window.location.reload(); } }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: '0 12px', border: 0, borderRadius: 12, background: h.current ? 'var(--surface2)' : 'transparent', color: 'var(--ink)', font: 'inherit', fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span><span style={{ flex: 'none', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{h.role}</span>
              </button>
            ))}
            <a href="/settings" style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 12px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', borderTop: '1px solid var(--line)', marginTop: 4 }}>Business settings</a>
          </span>
        </>
      ) : null}
    </span>
  );
}

const cache = new Map();
// Inline style string -> React style object. Respects quotes and brackets (data: URLs contain ';').
export function css(str) {
  if (str == null || str === false) return undefined;
  const s = String(str);
  if (cache.has(s)) return cache.get(s);
  const out = {};
  let depth = 0, quote = '', buf = '';
  const flush = () => {
    const i = buf.indexOf(':');
    if (i > 0) {
      const k = buf.slice(0, i).trim();
      let val = buf.slice(i + 1).trim();
      let imp = false;
      if (/!important$/.test(val)) { val = val.replace(/\s*!important$/, ''); imp = true; }
      if (k) {
        const key = k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^Ms/, 'ms');
        out[key] = val;
      }
      void imp;
    }
    buf = '';
  };
  for (const ch of s) {
    if (quote) { if (ch === quote) quote = ''; buf += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth <= 0) { flush(); continue; }
    buf += ch;
  }
  flush();
  if (cache.size > 5000) cache.clear();
  cache.set(s, out);
  return out;
}

// Mockup board links -> app routes (used for links built in the logic).
const ROUTES = { Dashboard: '/dashboard', Accounts: '/accounts', AddAccount: '/accounts/new', Statements: '/statements', Settings: '/settings', Profile: '/profile', Banks: '/settings', Layouts: '/settings' };
export function R(href) {
  if (typeof href !== 'string') return href;
  const m = href.match(/^([A-Za-z]+)\.dc\.html(#.*)?$/);
  return m ? (ROUTES[m[1]] || '/') + (m[2] || '') : href;
}

/** Uploads one statement file for reading. With autoSave, it is saved straight away when its layout matches and the checks pass. */
export async function importFile(file, dest, autoSave) {
  const fd = new FormData();
  fd.append('file', file);
  if (dest) fd.append('dest', dest);
  if (autoSave) fd.append('autoSave', '1');
  try {
    const r = await fetch('/api/import', { method: 'POST', body: fd });
    return await r.json();
  } catch (e) { return { error: 'Could not upload ' + file.name }; }
}

/** One page of a PDF drawn with pdf.js. `src` is a URL or an ArrayBuffer. Children are laid over the page (use % positions). */
export function PdfPage({ src, page, width, onPages, children, onSize }) {
  const ref = React.useRef(null);
  const [doc, setDoc] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [size, setSize] = React.useState(null);
  React.useEffect(() => {
    let dead = false; setDoc(null); setErr(''); setSize(null);
    if (!src) return undefined;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const d = await pdfjs.getDocument(Object.assign(typeof src === 'string' ? { url: src } : { data: new Uint8Array(src.slice(0)) }, { standardFontDataUrl: '/pdf-fonts/' })).promise;
        if (dead) return;
        setDoc(d); if (onPages) onPages(d.numPages);
      } catch (e) { if (!dead) setErr('This PDF could not be shown.'); }
    })();
    return () => { dead = true; };
  }, [src]);
  React.useEffect(() => {
    if (!doc) return undefined;
    let dead = false, task = null;
    (async () => {
      const p = await doc.getPage(Math.min(Math.max(1, page || 1), doc.numPages));
      const c = ref.current; if (!c || dead) return;
      const base = p.getViewport({ scale: 1 });
      const dpr = window.devicePixelRatio || 1;
      const k = (width || 600) / base.width;
      const vp = p.getViewport({ scale: k * dpr });
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const w = vp.width / dpr, h = vp.height / dpr;
      c.style.width = w + 'px'; c.style.height = h + 'px';
      setSize({ w, h }); if (onSize) onSize({ w, h });
      task = p.render({ canvasContext: c.getContext('2d'), viewport: vp });
      try { await task.promise; } catch (e) {}
    })();
    return () => { dead = true; try { if (task) task.cancel(); } catch (e) {} };
  }, [doc, page, width]);
  if (err) return React.createElement('div', { style: { padding: 24, fontSize: 14, color: 'var(--muted)' } }, err);
  return React.createElement('div', { className: 'pdfpage', style: { position: 'relative', flex: 'none', lineHeight: 0, background: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,.18)', borderRadius: 4, width: size ? size.w : 120, height: size ? size.h : 160, maxWidth: 'none', maxHeight: 'none' } },
    React.createElement('canvas', { ref, style: { display: 'block', borderRadius: 4 } }),
    size ? (typeof children === 'function' ? children(size) : children) : null);
}
