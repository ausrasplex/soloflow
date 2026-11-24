'use client';
import React from 'react';
import { HostCtx } from '../lib/dc';
import AppShell from './AppShell';

// Loads the signed-in person's data once for every signed-in page, then draws the shared frame around the page.
// Actions post to /api/act and reload the data. The theme lives here so a change repaints the frame at once.
export default function AppData({ children }) {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [theme, setThemeState] = React.useState(null);
  const load = React.useCallback(async () => {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (r.status === 401) { window.location.href = '/signin'; return null; }
      const j = await r.json();
      try { if (j.me) window.localStorage.setItem('soloflowTheme', JSON.stringify({ themeId: j.me.theme, mode: j.me.mode })); } catch (e) {}
      setData(j);
      return j;
    } catch (e) { setErr('SoloFlow could not reach its server.'); return null; }
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const act = React.useCallback(async (kind, payload, opts) => {
    const r = await fetch('/api/act', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, payload: payload || {} }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { window.location.href = '/signin'; return null; }
    if (!r.ok) throw new Error(j.error || 'That did not work. Try again.');
    if (!opts || opts.reload !== false) await load();
    return j;
  }, [load]);
  const setTheme = React.useCallback((themeId, mode) => {
    setThemeState({ themeId, mode });
    try { window.localStorage.setItem('soloflowTheme', JSON.stringify({ themeId, mode })); } catch (e) {}
  }, []);
  if (err) return <div className="boot">{err}</div>;
  if (!data) return <div className="boot">Loading…</div>;
  return (
    <HostCtx.Provider value={{ data, act, reload: load, params: {}, theme, setTheme }}>
      <AppShell>{children}</AppShell>
    </HostCtx.Provider>
  );
}
