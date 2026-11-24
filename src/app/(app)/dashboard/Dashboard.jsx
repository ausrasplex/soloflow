'use client';
// The overview: what is in the business's accounts, the latest statements, and the statements still to import.
// Everything shown is worked out from the signed-in person's data.
import React from 'react';
import { HostCtx, css } from '@/lib/dc';

const DASH_CSS = `
.dgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;align-items:start}
.drow{display:flex;align-items:center;gap:12px;min-height:56px;padding:10px 12px;border-radius:16px;color:var(--ink);text-decoration:none;background:var(--surface2)}
@media (hover:hover){.drow:hover{background:color-mix(in srgb,var(--ink) 7%,var(--surface2))}}
.dstat{flex:1 1 180px;min-width:0;display:flex;flex-direction:column;gap:6px;padding:16px 18px;border-radius:20px;color:var(--onA)}
.dnum{font-variant-numeric:tabular-nums}
`;

const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-AU');
const dLong = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const dShort = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '');
const plural = (n, w, many) => n + ' ' + (n === 1 ? w : many || w + 's');
const STATUS_BG = { Reconciled: 'var(--t3)', Imported: 'var(--surface)', 'Needs attention': 'var(--dangerSoft)' };

export default function Dashboard() {
  const { data } = React.useContext(HostCtx);
  const D = data || {};
  const biz = D.business || {};
  const accts = D.accounts || [];
  const banks = accts.filter((a) => !a.card), cards = accts.filter((a) => a.card);
  const held = banks.reduce((t, a) => t + a.balance, 0);
  const owed = cards.reduce((t, a) => t + a.balance, 0);
  const lastMonth = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 0).toLocaleDateString('en-AU', { month: 'long' }); })();
  const moneyIn = banks.reduce((t, a) => t + (a.inc ? a.inc[11] : 0), 0);
  const moneyOut = banks.reduce((t, a) => t + (a.exp ? a.exp[11] : 0), 0);
  const stmts = (D.statements || []).filter((s) => !s.deletedAt);
  const nameOf = (id) => (accts.find((a) => a.id === id) || {}).name || '';
  const latest = stmts.slice().sort((x, y) => (x.importedAt < y.importedAt ? 1 : -1)).slice(0, 5);
  const missing = (D.notifications || []).filter((n) => n.id.startsWith('missing-'));
  const noStatements = accts.filter((a) => !a.statementCount);
  const needsLook = stmts.filter((s) => s.status === 'Needs attention');
  const empty = accts.length === 0;

  return (<>
<style>{DASH_CSS}</style>
<div style={css('max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:20px;padding-top:12px')}>
  <div style={css('display:flex;flex-direction:column;gap:4px')}>
    <h1 style={css('margin:0;font-size:26px;font-weight:700;letter-spacing:-0.02em')}>Dashboard</h1>
    <div style={css('font-size:14px;color:var(--muted)')}>{biz.name}{biz.abn ? ' · ABN ' + biz.abn : ''}{biz.gstRegistered ? ' · GST registered, ' + biz.gstPeriod + ' BAS' : ' · Not registered for GST'}</div>
  </div>

  {empty ? (
    <section className="card" style={css('align-items:flex-start')}>
      <h2 className="h2">Add Your First Account</h2>
      <div className="sub" style={css('max-width:520px')}>Add the business bank account or credit card your statements come from, then import its statements. SoloFlow reads them on your server.</div>
      <a className="hbp" href="/accounts/new" style={css('display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:999px;background:var(--primary);color:var(--primaryInk);font-size:14px;font-weight:700')}>Add an account</a>
    </section>
  ) : (<>
    <section style={css('background:var(--hero);border-radius:24px;padding:24px;display:flex;flex-direction:column;gap:16px;color:var(--heroInk)')}>
      <div style={css('display:flex;flex-direction:column;gap:4px')}>
        <div style={css('font-size:14px;color:var(--heroMuted)')}>In bank accounts</div>
        <div className="dnum" style={css('font-size:36px;font-weight:700;letter-spacing:-0.02em')}>{money(held)}</div>
        <div style={css('font-size:14px;color:var(--heroMuted)')}>{plural(banks.length, 'bank account')}{cards.length ? ' · ' + money(owed) + ' owed on ' + plural(cards.length, 'credit card') : ''}</div>
      </div>
      <div style={css('display:flex;flex-wrap:wrap;gap:12px')}>
        <div className="dstat" style={css('background:var(--a1)')}><span style={css('font-size:13px;font-weight:600')}>Money in, {lastMonth}</span><span className="dnum" style={css('font-size:22px;font-weight:700')}>{money(moneyIn)}</span></div>
        <div className="dstat" style={css('background:var(--a2)')}><span style={css('font-size:13px;font-weight:600')}>Money out, {lastMonth}</span><span className="dnum" style={css('font-size:22px;font-weight:700')}>{money(moneyOut)}</span></div>
        <div className="dstat" style={css('background:var(--a3)')}><span style={css('font-size:13px;font-weight:600')}>Statements imported</span><span className="dnum" style={css('font-size:22px;font-weight:700')}>{stmts.length}</span></div>
      </div>
    </section>

    <div className="dgrid">
      <section className="card">
        <div><h2 className="h2">Accounts</h2><div className="sub">Balances from the latest imported statement</div></div>
        <div style={css('display:flex;flex-direction:column;gap:8px')}>
          {accts.map((a) => (
            <a key={a.id} className="drow" href={'/accounts?id=' + a.id}>
              <span style={css('flex:none;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--onA);background:var(--' + a.slot + ')')}>{a.initial}</span>
              <span style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                <span style={css('font-size:14px;font-weight:700')}>{a.name}</span>
                <span style={css('font-size:12px;color:var(--muted);font-weight:500')}>{a.bank} · {a.lastStatement ? 'statement to ' + dShort(a.lastStatement) : 'no statements yet'}</span>
              </span>
              <span style={css('display:flex;flex-direction:column;align-items:flex-end;gap:2px')}>
                <span className="dnum" style={css('font-size:15px;font-weight:700')}>{money(a.balance)}</span>
                {a.card ? <span style={css('font-size:11px;font-weight:600;color:var(--muted)')}>owed</span> : null}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="card">
        <div><h2 className="h2">Needs a Look</h2><div className="sub">Statements to import or check</div></div>
        {missing.length || noStatements.length || needsLook.length ? (
          <div style={css('display:flex;flex-direction:column;gap:8px')}>
            {missing.map((n) => (
              <a key={n.id} className="drow" href="/statements">
                <span style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}><span style={css('font-size:14px;font-weight:700')}>{n.title}</span><span style={css('font-size:12px;color:var(--muted);font-weight:500;line-height:1.4')}>{n.text}</span></span>
                <span className="chip" style={css('flex:none;' + n.tagStyle)}>{n.when}</span>
              </a>
            ))}
            {noStatements.map((a) => (
              <a key={a.id} className="drow" href="/statements">
                <span style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}><span style={css('font-size:14px;font-weight:700')}>No statements for {a.name}</span><span style={css('font-size:12px;color:var(--muted);font-weight:500')}>Import its first statement to start</span></span>
              </a>
            ))}
            {needsLook.map((s) => (
              <a key={s.id} className="drow" href="/statements">
                <span style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}><span style={css('font-size:14px;font-weight:700')}>{nameOf(s.accountId)}, {dShort(s.start)} to {dLong(s.end)}</span><span style={css('font-size:12px;color:var(--muted);font-weight:500')}>{s.note || 'Needs attention'}</span></span>
              </a>
            ))}
          </div>
        ) : (
          <div style={css('padding:12px 14px;border-radius:14px;background:var(--surface2);font-size:13px;color:var(--muted);font-weight:500')}>Every account is up to date.</div>
        )}
      </section>

      <section className="card">
        <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
          <div><h2 className="h2">Latest Statements</h2><div className="sub">The most recently imported</div></div>
          <a className="hb2" href="/statements" style={css('flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;border:1px solid var(--outline);font-size:13px;font-weight:600')}>All statements</a>
        </div>
        {latest.length ? (
          <div style={css('display:flex;flex-direction:column;gap:8px')}>
            {latest.map((s) => (
              <a key={s.id} className="drow" href="/statements">
                <span style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}><span style={css('font-size:14px;font-weight:700')}>{nameOf(s.accountId)}</span><span style={css('font-size:12px;color:var(--muted);font-weight:500')}>{dShort(s.start)} to {dLong(s.end)}</span></span>
                <span className="chip" style={css('flex:none;background:' + (STATUS_BG[s.status] || 'var(--surface)'))}>{s.status}</span>
              </a>
            ))}
          </div>
        ) : (
          <div style={css('padding:12px 14px;border-radius:14px;background:var(--surface2);font-size:13px;color:var(--muted);font-weight:500')}>No statements imported yet.</div>
        )}
      </section>
    </div>
  </>)}
</div>
</>);
}
