'use client';
// "Who Can See It" on an account page: one switch per business member. Owners are always on. Editors start on and
// viewers start off; an owner can switch anyone else on or off for this account. Changes save straight away.
import React from 'react';
import { HostCtx, css } from '@/lib/dc';

const ACCESS_CSS = `
.acsw{flex:none;position:relative;width:52px;height:32px;border:0;border-radius:999px;padding:0;cursor:pointer;transition:background-color .15s linear}
.acsw::after{content:"";position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .15s ease}
.acsw[aria-checked="true"]{background:var(--sel)}
.acsw[aria-checked="false"]{background:var(--outline)}
.acsw[aria-checked="true"]::after{transform:translateX(20px)}
.acsw:disabled{cursor:default;opacity:.55}
.acsw:focus-visible{outline:2px solid var(--sel);outline-offset:2px}
`;

export default function AccessCard({ accountId, onDone }) {
  const ctx = React.useContext(HostCtx);
  const D = ctx.data || {};
  const a = (D.accounts || []).find((x) => x.id === accountId);
  const [busy, setBusy] = React.useState('');
  const [msg, setMsg] = React.useState('');
  if (!a) return null;
  const canSwitch = !!(D.me || {}).canManage;
  const people = (a.access || []).slice().sort((x, y) => (y.you - x.you) || (x.locked === y.locked ? 0 : x.locked ? -1 : 1));
  const flip = async (p) => {
    if (p.locked || !canSwitch || busy) return;
    setBusy(p.id); setMsg('');
    try { const r = await ctx.act('setAccountAccess', { accountId: a.id, userId: p.id, allowed: !p.on }); if (onDone && r && r.text) onDone(r.text); }
    catch (e) { setMsg(e.message); }
    setBusy('');
  };
  const note = (p) => p.locked ? 'Owner · sees every account'
    : p.role + ' · ' + (p.on ? 'can see it' : 'cannot see it') + (p.byDefault ? ' (default for ' + p.role.toLowerCase() + 's)' : '');
  return (<>
<style>{ACCESS_CSS}</style>
<section className="card" style={css('gap:12px')}>
  <div>
    <h2 className="h2">Who Can See It</h2>
    <div className="sub">Owners see every account. Editors see it unless switched off, and viewers only if switched on.{canSwitch ? '' : ' Only an owner can change this.'}</div>
  </div>
  <div style={css('display:flex;flex-direction:column;gap:8px')}>
    {people.map((p) => (
      <div key={p.id} style={css('display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border-radius:16px;background:var(--surface2)')}>
        <span style={css('flex:none;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--onA);background:var(--' + p.slot + ')' + (p.photo ? ";background:var(--a1) url('" + p.photo + "') center/cover no-repeat;color:transparent" : ''))}>{p.ini}</span>
        <span style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}>
          <span style={css('font-size:14px;font-weight:700')}>{p.name}{p.you ? ' (you)' : ''}</span>
          <span style={css('font-size:12px;color:var(--muted);font-weight:500')}>{note(p)}</span>
        </span>
        <button type="button" role="switch" className="acsw" aria-checked={p.on} aria-label={(p.on ? 'Stop ' : 'Let ') + p.name + (p.on ? ' seeing ' : ' see ') + a.name}
          disabled={p.locked || !canSwitch || busy === p.id || (p.you && p.on)} title={p.you && p.on && !p.locked ? 'Ask an owner to switch you off' : undefined} onClick={() => flip(p)} />
      </div>
    ))}
  </div>
  {msg ? <div role="alert" style={css('font-size:13px;font-weight:600;color:var(--danger)')}>{msg}</div> : null}
</section>
</>);
}
