// I 5 piani principali: cinque posti fissi con note, scadenze e proiezione, sempre visibili anche nella barra laterale.
import { state, allPortfolios, getPortfolio, effectiveMetrics, esc, it, pct, eur, project, touch, setPlan, planSlot, dueToday } from './core.js';
import { donut } from './charts.js';
import { byClass } from './pies.js';
import { ROWS, cell, bestOf } from './metrics.js';
import { groupedOptions } from './v-dashboard.js';
import { setSelection } from './v-compare.js';
import { $, $$, toast, go, refresh } from './ui.js';

const years = () => Math.min(60, Math.max(1, Number(state.settings.planYears) || 30));
const fmtDate = d => { if (!d) return ''; const [y, m, g] = d.split('-'); return `${g}/${m}/${y}`; };
const todayIso = () => new Date().toISOString().slice(0, 10);

export function mount(root) {
  const filled = state.plans.map((pl, i) => ({ pl, i, p: pl && getPortfolio(pl.pid) })).filter(x => x.p);
  // se un portafoglio è stato eliminato, libera il posto
  state.plans.forEach((pl, i) => { if (pl && !getPortfolio(pl.pid)) state.plans[i] = null; });

  const due = filled.filter(x => dueToday(x.pl));
  root.innerHTML = `<div class="view">
  <header>
    <h1>I miei 5 piani</h1>
    <p class="muted">Cinque posti fissi per i portafogli che segui davvero. Restano sempre nella barra a sinistra come segnalibri (il numero accanto è il CAGR netto stimato), così non li perdi di vista. Per ognuno puoi scrivere una nota, la prossima azione e quando rivederlo.</p>
  </header>
  ${due.length ? `<div class="notice"><b>Da fare oggi o già scaduto</b><ul>${due.map(x => `<li>Piano ${x.i + 1} · ${esc(x.p.n)}${x.pl.next && x.pl.next <= todayIso() ? ` — prossima azione: ${fmtDate(x.pl.next)}` : ''}${x.pl.review && x.pl.review <= todayIso() ? ` — revisione: ${fmtDate(x.pl.review)}` : ''}</li>`).join('')}</ul></div>` : ''}
  <section aria-label="Orizzonte">
    <div class="fgrid" style="max-width:320px"><label class="f">Orizzonte per le proiezioni (anni)<input type="number" id="pl-years" min="1" max="60" step="1" value="${years()}"></label></div>
  </section>
  <section aria-label="I cinque piani"><div class="plans">${state.plans.map((pl, i) => slot(pl, i)).join('')}</div></section>
  ${filled.length >= 2 ? compareBlock(filled) : '<p class="muted">Quando avrai almeno due piani vedrai qui il confronto diretto tra loro.</p>'}
  </div>`;

  $('#pl-years', root).addEventListener('change', ev => { state.settings.planYears = Math.min(60, Math.max(1, Math.round(Number(ev.target.value) || 30))); touch(); refresh(); });

  $$('[data-pick]', root).forEach(sel => sel.addEventListener('change', ev => {
    const i = +sel.dataset.pick, pid = ev.target.value;
    if (!pid) return;
    const at = planSlot(pid);
    if (at >= 0 && at !== i) { toast(`«${getPortfolio(pid).n}» è già nel piano ${at + 1}.`); refresh(); return; }
    setPlan(i, pid); refresh();
  }));
  $$('[data-rm]', root).forEach(b => b.addEventListener('click', () => { const i = +b.dataset.rm; setPlan(i, null); toast(`Piano ${i + 1} liberato.`); refresh(); }));
  $$('[data-swap]', root).forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i, j = i + (+b.dataset.swap);
    if (j < 0 || j > 4) return;
    [state.plans[i], state.plans[j]] = [state.plans[j], state.plans[i]]; touch(); refresh();
  }));
  $$('[data-open]', root).forEach(b => b.addEventListener('click', () => go('#/dashboard/' + b.dataset.open)));
  $$('[data-f]', root).forEach(el => el.addEventListener('input', () => {
    const pl = state.plans[+el.dataset.i]; if (!pl) return;
    const k = el.dataset.f;
    pl[k] = k === 'monthly' ? Math.max(0, Number(el.value) || 0) : el.value;
    touch();
    if (k === 'monthly') updateProj(root, +el.dataset.i);
  }));
  $$('[data-f][type=date]', root).forEach(el => el.addEventListener('change', () => refresh()));
  $('#only-plans', root)?.addEventListener('click', () => { setSelection(state.plans.filter(Boolean).map(x => x.pid)); go('#/confronto'); });
}

function projText(p, pl) {
  const e = effectiveMetrics(p), y = years();
  if (e.m.cagr == null) return '<span class="muted">Proiezione non disponibile: manca il CAGR.</span>';
  const last = project({ start: 0, monthly: pl.monthly ?? 300, years: y, cagr: e.m.cagr }).pop();
  return `Con ${eur(pl.monthly ?? 300)} al mese per ${y} anni: <b class="mono">${eur(last.cap)}</b> stimati <span class="small">(versati ${eur(last.paid)}, CAGR ${pct(e.m.cagr)}, al lordo di imposte e inflazione)</span>`;
}
function updateProj(root, i) {
  const pl = state.plans[i], p = pl && getPortfolio(pl.pid), el = $(`#proj-${i}`, root);
  if (el && p) el.innerHTML = projText(p, pl);
}

function slot(pl, i) {
  const p = pl && getPortfolio(pl.pid);
  if (!p) {
    return `<article class="plan empty" aria-label="Piano ${i + 1}, vuoto">
      <span class="slot">Piano ${i + 1}</span>
      <p class="muted">Posto libero. Scegli un portafoglio da tenere sempre sotto mano.</p>
      <label class="f">Portafoglio<select data-pick="${i}"><option value="">Scegli…</option>${groupedOptions('')}</select></label>
    </article>`;
  }
  const e = effectiveMetrics(p), m = e.m;
  const k = (l, v) => `<div><b>${v}</b><span>${l}</span></div>`;
  return `<article class="plan" style="--c:var(${p.c})" aria-label="Piano ${i + 1}: ${esc(p.n)}">
    <div class="plan-top">
      <div class="stack" style="gap:2px"><span class="slot">Piano ${i + 1}${dueToday(pl) ? ' · <span style="color:var(--warn)">da rivedere</span>' : ''}</span><h2 style="font-size:18px">${esc(p.n)}</h2>
        <span class="small">${p.h.length} titoli${p.kind === 'combo' ? ' · combinato' : ''}</span></div>
      <div class="row" style="gap:6px;flex-wrap:nowrap">
        <button type="button" class="btn ghost small" data-swap="-1" data-i="${i}" aria-label="Sposta in su" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="btn ghost small" data-swap="1" data-i="${i}" aria-label="Sposta in giù" ${i === 4 ? 'disabled' : ''}>↓</button>
      </div>
    </div>
    <div class="mini">${donut({ items: byClass(p), size: 120, thick: 28 })}
      <div class="plan-kpi">${k('CAGR netto', m.cagr == null ? 'n.d.' : it(m.cagr, 2) + '%')}${k('Volatilità', m.vol == null ? 'n.d.' : it(m.vol, 1) + '%')}${k('Sharpe', it(m.sharpe, 2))}${k('TER', m.ter == null ? 'n.d.' : it(m.ter, 2) + '%')}</div></div>
    <p id="proj-${i}" style="max-width:none;font-size:14px">${projText(p, pl)}</p>
    <div class="fgrid">
      <label class="f">Versamento mensile (€)<input type="number" min="0" step="25" data-f="monthly" data-i="${i}" value="${pl.monthly ?? 300}"></label>
      <label class="f">Prossima azione<input type="date" data-f="next" data-i="${i}" value="${esc(pl.next || '')}"></label>
      <label class="f">Prossima revisione<input type="date" data-f="review" data-i="${i}" value="${esc(pl.review || '')}"></label>
    </div>
    <label class="f">Note (perché lo segui, cosa fare, dubbi)<textarea data-f="note" data-i="${i}" placeholder="es. Aumentare la rata a gennaio; verificare il TER di VWCE sul KID.">${esc(pl.note || '')}</textarea></label>
    <div class="row">
      <button type="button" class="btn small" data-open="${esc(p.id)}">Apri dashboard</button>
      <label class="f" style="flex-direction:row;align-items:center;gap:6px">Cambia <select data-pick="${i}" style="width:auto;max-width:210px">${groupedOptions(p.id)}</select></label>
      <button type="button" class="btn danger small" data-rm="${i}">Libera posto</button>
    </div>
  </article>`;
}

function compareBlock(filled) {
  const eff = new Map(filled.map(x => [x.p.id, effectiveMetrics(x.p)]));
  const head = `<tr><th></th>${filled.map(x => `<th style="--c:var(${x.p.c})"><span class="sw"></span>Piano ${x.i + 1}<span class="sub">${esc(x.p.s)}</span></th>`).join('')}</tr>`;
  let rows = '';
  ROWS.forEach(r => {
    if (r.g) { rows += `<tr class="grp"><td colspan="${filled.length + 1}">${r.g}</td></tr>`; return; }
    const vals = filled.map(x => { const v = eff.get(x.p.id).m[r.k]; return v == null ? null : v; });
    const best = bestOf(r, vals);
    rows += `<tr><td>${esc(r.l)}</td>${filled.map((x, j) => { const c = cell(r, x.p, eff.get(x.p.id)); return `<td class="n${c.nd ? ' nd' : ''}${best !== null && vals[j] === best ? ' best' : ''}">${c.t}${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ''}</td>`; }).join('')}</tr>`;
  });
  return `<section aria-label="Confronto dei piani"><h2>I tuoi piani a confronto</h2>
    <div class="wrap"><table class="cmp"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
    <div><button type="button" class="btn ghost" id="only-plans">Apri il confronto completo con grafici, solo con questi piani</button></div></section>`;
}
