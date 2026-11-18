// Confronto tra tutti i portafogli: tabella con i migliori evidenziati, rischio/CAGR, composizione, classifica.
import { state, allPortfolios, effectiveMetrics, esc, it, pct, CLASSES } from './core.js';
import { scatter, stackedBars } from './charts.js';
import { byClass } from './pies.js';
import { ROWS, cell, bestOf } from './metrics.js';
import { $, $$, go } from './ui.js';

const sel = new Set(), seen = new Set();
let sortKey = '', rankKey = 'cagr';

export function setSelection(ids) { sel.clear(); ids.forEach(i => sel.add(i)); allPortfolios().forEach(p => seen.add(p.id)); }

const RANK = { cagr: ['CAGR netto stimato', 1, 2], sharpe: ['Sharpe ratio', 1, 2], lordo: ['Rendimento lordo', 1, 2], vol: ['Volatilità (più bassa è meglio)', -1, 1], ter: ['TER ponderato (più basso è meglio)', -1, 3] };

export function mount(root) {
  const all = allPortfolios();
  all.forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); sel.add(p.id); } });
  [...sel].forEach(id => { if (!all.some(p => p.id === id)) sel.delete(id); });
  draw(root);
}

function draw(root) {
  const y = window.scrollY;
  const all = allPortfolios();
  let vis = all.filter(p => sel.has(p.id));
  const eff = new Map(all.map(p => [p.id, effectiveMetrics(p)]));
  if (sortKey) vis = [...vis].sort((a, b) => { const x = eff.get(a.id).m[sortKey], z = eff.get(b.id).m[sortKey]; if (x == null) return 1; if (z == null) return -1; const dir = (ROWS.find(r => r.k === sortKey)?.d || 1); return (z - x) * dir; });
  const plans = state.plans.filter(Boolean).map(x => x.pid);

  root.innerHTML = `<div class="view">
  <header>
    <h1>Confronto</h1>
    <p class="muted">Tutti i portafogli a confronto: quelli del progetto, quelli che hai caricato da PDF e quelli combinati. Scegli quali mettere a confronto; il valore migliore di ogni riga è evidenziato.</p>
  </header>
  <section aria-label="Selezione">
    <div class="row">
      <button class="btn ghost small" data-pre="all">Tutti</button>
      <button class="btn ghost small" data-pre="none">Nessuno</button>
      <button class="btn ghost small" data-pre="plans" ${plans.length ? '' : 'disabled'}>Solo i miei 5 piani</button>
      <button class="btn ghost small" data-pre="mine" ${state.portfolios.length ? '' : 'disabled'}>Solo caricati e combinati</button>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-left:auto">Ordina colonne per
        <select id="sort" style="width:auto"><option value="">ordine originale</option>${ROWS.filter(r => r.k && r.d).map(r => `<option value="${r.k}"${sortKey === r.k ? ' selected' : ''}>${esc(r.l.split(',')[0])}</option>`).join('')}</select></label>
    </div>
    <div class="chips" role="group" aria-label="Portafogli da confrontare">
      ${all.map(p => `<button type="button" class="chip" data-id="${esc(p.id)}" style="--c:var(${p.c})" aria-pressed="${sel.has(p.id)}"><i></i>${esc(p.s)}${planIdx(p.id)}</button>`).join('')}
    </div>
  </section>
  ${vis.length ? body(vis, eff) : '<p class="notice">Seleziona almeno un portafoglio.</p>'}
  </div>`;

  $$('[data-id]', root).forEach(b => b.addEventListener('click', () => { const id = b.dataset.id; if (sel.has(id)) sel.delete(id); else sel.add(id); draw(root); }));
  $$('[data-pre]', root).forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.pre; sel.clear();
    if (t === 'all') all.forEach(p => sel.add(p.id));
    if (t === 'plans') plans.forEach(id => sel.add(id));
    if (t === 'mine') state.portfolios.forEach(p => sel.add(p.id));
    draw(root);
  }));
  $('#sort', root)?.addEventListener('change', ev => { sortKey = ev.target.value; draw(root); });
  $('#rank', root)?.addEventListener('change', ev => { rankKey = ev.target.value; draw(root); });
  $$('[data-open]', root).forEach(a => a.addEventListener('click', () => go('#/dashboard/' + a.dataset.open)));
  window.scrollTo(0, y);
}

const planIdx = id => { const i = state.plans.findIndex(x => x && x.pid === id); return i >= 0 ? ` <span class="small">★${i + 1}</span>` : ''; };

function body(vis, eff) {
  const head = `<tr><th></th>${vis.map(p => `<th style="--c:var(${p.c})"><span class="sw"></span><a href="#/dashboard/${esc(p.id)}" style="color:inherit;text-decoration:none" title="Apri la dashboard">${esc(p.n)}</a></th>`).join('')}</tr>`;
  let rows = '';
  ROWS.forEach(r => {
    if (r.g) { rows += `<tr class="grp"><td colspan="${vis.length + 1}">${r.g}</td></tr>`; return; }
    const vals = vis.map(p => { const v = eff.get(p.id).m[r.k]; return v === null || v === undefined ? null : v; });
    const best = bestOf(r, vals);
    rows += `<tr><td><a href="#/glossario/${r.term}" style="color:inherit;text-decoration:none;border-bottom:1px dotted var(--muted)" title="Che cos'è?">${esc(r.l)}</a></td>`;
    vis.forEach((p, i) => { const c = cell(r, p, eff.get(p.id)); rows += `<td class="n${c.nd ? ' nd' : ''}${best !== null && vals[i] === best ? ' best' : ''}">${c.t}${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ''}</td>`; });
    rows += '</tr>';
  });

  const pts = vis.map(p => ({ x: eff.get(p.id).m.vol, y: eff.get(p.id).m.cagr, label: p.l, color: `var(${p.c})` }));
  const bars = vis.map(p => ({ c: p.c, label: p.s, parts: byClass(p).map(x => ({ cls: x.cls, value: x.value })) }));
  const usedCls = [...new Set(bars.flatMap(b => b.parts.map(x => x.cls)))];
  const rk = RANK[rankKey];
  const ranked = vis.map(p => ({ p, v: eff.get(p.id).m[rankKey] })).filter(x => x.v != null).sort((a, b) => (b.v - a.v) * rk[1]);
  const mx = Math.max(...ranked.map(x => Math.abs(x.v)), 0.0001);

  return `<section aria-label="Tabella"><h2>Indicatori a confronto</h2>
    <div class="wrap"><table class="cmp"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
    <p class="small">Evidenziato in verde il valore migliore tra i selezionati (più alto per rendimento, CAGR e Sharpe; più basso per TER e volatilità). «n.d.» = dato non disponibile, mai stimato di nascosto; «calcolato» = stimato dal sito dai titoli. Per i portafogli del progetto i numeri sono quelli dei documenti.</p></section>
  <section aria-label="Rischio e rendimento"><h2>Rischio e CAGR netto</h2>
    <p class="muted">A destra più volatilità, in alto più crescita composta netta stimata. Un portafoglio è «più efficiente» quando sta in alto e a sinistra.</p>
    <div class="panel">${scatter({ points: pts })}</div></section>
  <section aria-label="Classifica"><h2>Classifica</h2>
    <label class="f" style="max-width:340px">Ordina per<select id="rank">${Object.entries(RANK).map(([k, v]) => `<option value="${k}"${k === rankKey ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label>
    <div class="panel"><div class="hbars">${ranked.length ? ranked.map((x, i) => `<div class="hbar" style="--c:var(${x.p.c})"><span><span class="small">${i + 1}.</span> ${esc(x.p.s)}</span><div class="tr"><span style="width:${Math.max(2, Math.abs(x.v) / mx * 100)}%"></span></div><span class="num">${rankKey === 'sharpe' ? it(x.v, 2) : it(x.v, rk[2]) + '%'}</span></div>`).join('') : '<p class="muted">Nessun dato disponibile per questa misura.</p>'}</div></div></section>
  <section aria-label="Composizione"><h2>Composizione per classe di attivo</h2>
    <div class="panel">${stackedBars(bars, CLASSES)}<div class="legend-inline" style="margin-top:14px">${usedCls.map(c => `<span><i style="background:${CLASSES[c].color}"></i>${esc(CLASSES[c].label)}</span>`).join('')}</div></div></section>`;
}
