// Combinatore: sceglie 2 o 3 portafogli, prende i titoli che interessano e ne fa un nuovo portafoglio,
// salvato tra quelli caricati (quindi in Dashboard, Confronto e 5 piani) e scaricabile in JSON.
import { state, allPortfolios, getPortfolio, computeMetrics, holdingKey, addPortfolio, esc, it, pct, CLASSES } from './core.js';
import { donut } from './charts.js';
import { scatter } from './charts.js';
import { byClass, legend } from './pies.js';
import { $, $$, toast, go } from './ui.js';

const MAX = 3;
let picked = [];      // id dei portafogli di partenza (2-3)
let quota = {};       // id → quota % del nuovo portafoglio
let sel = {};         // `${id}|${i}` → { on, w }  (w = peso relativo dentro il portafoglio di partenza)
let cname = '', cshort = '', nameTouched = false;
let lastSaved = null;

const k = (id, i) => id + '|' + i;
function addSource(id) {
  const p = getPortfolio(id); if (!p) return;
  picked.push(id);
  p.h.forEach((h, i) => { sel[k(id, i)] = { on: true, w: h.w || 0 }; });
  equalQuotas();
}
function dropSource(id) {
  picked = picked.filter(x => x !== id);
  Object.keys(sel).forEach(key => { if (key.startsWith(id + '|')) delete sel[key]; });
  delete quota[id];
  equalQuotas();
}
function equalQuotas() {
  const n = picked.length; if (!n) return;
  const base = Math.floor(1000 / n) / 10;
  picked.forEach((id, i) => { quota[id] = i === n - 1 ? Math.round((100 - base * (n - 1)) * 10) / 10 : base; });
}
const defaultName = () => picked.map(id => getPortfolio(id)?.s || '').join(' + ');

/* ---------- calcolo del portafoglio combinato ---------- */
function build() {
  const parts = picked.map(id => {
    const p = getPortfolio(id);
    const rows = p.h.map((h, i) => ({ h, i, s: sel[k(id, i)] })).filter(x => x.s && x.s.on && x.s.w > 0);
    return { id, p, rows, rel: rows.reduce((a, x) => a + x.s.w, 0), q: Math.max(0, Number(quota[id]) || 0) };
  });
  const contrib = parts.filter(x => x.rows.length && x.rel > 0);
  const qs = contrib.reduce((a, x) => a + x.q, 0);
  const merged = new Map();
  contrib.forEach(x => {
    const share = qs > 0 ? x.q / qs : 1 / contrib.length;
    x.rows.forEach(r => {
      const w = share * 100 * r.s.w / x.rel;
      const key = holdingKey(r.h);
      const cur = merged.get(key);
      if (cur) { cur.w += w; cur.from.add(x.p.s); }
      else merged.set(key, { ...r.h, w, from: new Set([x.p.s]) });
    });
  });
  const hs = [...merged.values()].map(h => {
    const { from, ...rest } = h;
    const src = 'da ' + [...from].join(' + ');
    return { ...rest, info: rest.info ? rest.info + ' · ' + src : src };
  }).sort((a, b) => b.w - a.w);
  return { parts, contrib, hs, dups: [...merged.values()].filter(h => h.from.size > 1).length };
}

/* arrotonda a 2 decimali facendo tornare la somma a 100 */
function roundedHoldings(hs) {
  const out = hs.map(h => ({ ...h, w: Math.round(h.w * 100) / 100 }));
  const diff = Math.round((100 - out.reduce((a, h) => a + h.w, 0)) * 100) / 100;
  if (out.length && diff) out[0].w = Math.round((out[0].w + diff) * 100) / 100;
  return out;
}

/* ---------- schermata ---------- */
export function mount(root) {
  picked = picked.filter(id => getPortfolio(id));
  draw(root);
}

function draw(root) {
  const all = allPortfolios();
  const y = window.scrollY;
  root.innerHTML = `<div class="view">
  <header>
    <h1>Combinatore</h1>
    <p class="muted">Scegli da 2 a 3 portafogli, spunta i titoli che vuoi tenere e decidi quanto pesa ciascun portafoglio nel nuovo. Il risultato è un portafoglio vero: lo salvi e compare in Dashboard, Confronto e nei 5 piani, e lo puoi scaricare in JSON per ricaricarlo in futuro.</p>
  </header>
  <section aria-label="Scelta dei portafogli">
    <h2>1. Scegli 2 o 3 portafogli <span class="small">(${picked.length}/${MAX})</span></h2>
    <div class="pickgrid">${all.map(p => { const on = picked.includes(p.id); const full = !on && picked.length >= MAX; return `<button type="button" class="pick" data-pick="${esc(p.id)}" aria-pressed="${on}" style="--c:var(${p.c})" ${full ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}><i class="dot" style="--c:var(${p.c})"></i><span><b>${esc(p.s)}</b><span class="s">${p.h.length} titoli${p.kind === 'combo' ? ' · combinato' : ''}</span></span></button>`; }).join('')}</div>
    ${picked.length < 2 ? '<p class="notice info">Seleziona almeno due portafogli per cominciare.</p>' : ''}
  </section>
  <div id="combo-main">${picked.length ? '' : ''}</div>
  </div>`;

  $$('[data-pick]', root).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.pick;
    if (picked.includes(id)) dropSource(id); else if (picked.length < MAX) addSource(id);
    if (!nameTouched) { cname = defaultName(); cshort = cname.slice(0, 18); }
    lastSaved = null;
    draw(root);
  }));
  if (picked.length) drawWork(root);
  window.scrollTo(0, y);
}

function drawWork(root) {
  const host = $('#combo-main', root);
  const b = build();
  host.innerHTML = `<div class="combo">
    <div class="stack" style="gap:26px">
      <section aria-label="Titoli">
        <h2>2. Scegli i titoli e le quote</h2>
        <p class="muted">Ogni portafoglio di partenza ha una <b>quota</b> nel nuovo (la somma si normalizza a 100%). Dentro il blocco puoi togliere titoli e cambiare i pesi relativi: il peso finale viene ricalcolato da solo. Un titolo presente in più portafogli (stesso ISIN) viene unito e i pesi si sommano.</p>
        ${picked.map(id => source(id, b)).join('')}
      </section>
      <section aria-label="Confronto con i portafogli di partenza"><h2>Rispetto ai portafogli di partenza</h2><div id="cmp-box"></div></section>
    </div>
    <aside class="combo-side" aria-label="Risultato"><div id="side"></div></aside>
  </div>`;
  drawSide(root, b);

  $$('[data-quota]', root).forEach(el => el.addEventListener('input', () => { quota[el.dataset.quota] = Number(el.value) || 0; refreshNumbers(root); }));
  $$('[data-on]', root).forEach(el => el.addEventListener('change', () => { sel[el.dataset.on].on = el.checked; refreshNumbers(root); }));
  $$('[data-rel]', root).forEach(el => el.addEventListener('input', () => { sel[el.dataset.rel].w = Math.max(0, Number(el.value) || 0); refreshNumbers(root); }));
  $$('[data-all]', root).forEach(el => el.addEventListener('click', () => {
    const id = el.dataset.all, on = el.dataset.v === '1';
    getPortfolio(id).h.forEach((h, i) => { sel[k(id, i)].on = on; });
    drawWork(root);
  }));
  $$('[data-reset]', root).forEach(el => el.addEventListener('click', () => {
    const id = el.dataset.reset; getPortfolio(id).h.forEach((h, i) => { sel[k(id, i)] = { on: true, w: h.w || 0 }; }); drawWork(root);
  }));
}

/* aggiorna solo i numeri (finali dei titoli e pannello laterale) senza ridisegnare i campi, per non perdere il cursore */
function refreshNumbers(root) {
  const b = build();
  const finals = new Map();
  b.contrib.forEach(x => {
    const qs = b.contrib.reduce((a, y) => a + y.q, 0), share = qs > 0 ? x.q / qs : 1 / b.contrib.length;
    x.rows.forEach(r => finals.set(k(x.id, r.i), share * 100 * r.s.w / x.rel));
  });
  $$('[data-final]', root).forEach(el => { const v = finals.get(el.dataset.final); el.textContent = v === undefined ? '—' : it(v, 1) + '%'; });
  $$('[data-qinfo]', root).forEach(el => {
    const id = el.dataset.qinfo, x = b.parts.find(p => p.id === id);
    const qs = b.contrib.reduce((a, y) => a + y.q, 0);
    el.textContent = x.rows.length && x.rel > 0 ? `peso effettivo ${it(qs > 0 ? x.q / qs * 100 : 100 / b.contrib.length, 1)}%` : 'nessun titolo selezionato: non contribuisce';
  });
  drawSide(root, b);
}

function source(id, b) {
  const p = getPortfolio(id), x = b.parts.find(z => z.id === id);
  const qs = b.contrib.reduce((a, y) => a + y.q, 0);
  const share = x.rows.length && x.rel > 0 ? (qs > 0 ? x.q / qs : 1 / b.contrib.length) : 0;
  return `<div class="src panel" style="border-left:5px solid var(${p.c})">
    <div class="src-h">
      <div><h3 style="font-size:16px">${esc(p.n)}</h3><span class="small" data-qinfo="${esc(id)}">${x.rows.length && x.rel > 0 ? `peso effettivo ${it(share * 100, 1)}%` : 'nessun titolo selezionato: non contribuisce'}</span></div>
      <div class="row"><label class="quota">Quota nel nuovo <input type="number" min="0" max="100" step="1" data-quota="${esc(id)}" value="${quota[id] ?? 0}" aria-label="Quota di ${esc(p.s)}"> %</label>
        <button type="button" class="btn ghost small" data-all="${esc(id)}" data-v="1">Tutti</button>
        <button type="button" class="btn ghost small" data-all="${esc(id)}" data-v="0">Nessuno</button>
        <button type="button" class="btn ghost small" data-reset="${esc(id)}" title="Riporta selezione e pesi come nel portafoglio originale">Ripristina</button></div>
    </div>
    <div class="wrap"><table style="--c:var(${p.c})"><thead><tr><th>Titolo</th><th></th><th>Peso originale</th><th>Peso relativo</th><th>Peso nel nuovo</th></tr></thead><tbody>
      ${p.h.map((h, i) => { const s = sel[k(id, i)]; const fw = s.on && s.w > 0 && share ? share * 100 * s.w / x.rel : null; return `<tr>
        <td>${esc(h.n)}<span class="sub">${esc(CLASSES[h.cls]?.label || '')}${h.isin && h.isin[0]?.c ? ' · ' + esc(h.isin[0].c) : ''}</span></td>
        <td style="text-align:center"><input type="checkbox" data-on="${esc(k(id, i))}" ${s.on ? 'checked' : ''} aria-label="Includi ${esc(h.n)}" style="width:18px;height:18px"></td>
        <td class="n">${it(h.w, 1)}%</td>
        <td><input type="number" min="0" step="0.5" data-rel="${esc(k(id, i))}" value="${s.w}" aria-label="Peso relativo di ${esc(h.n)}"></td>
        <td class="n"><b data-final="${esc(k(id, i))}">${fw === null ? '—' : it(fw, 1) + '%'}</b></td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}

function drawSide(root, b) {
  const side = $('#side', root); if (!side) return;
  const hs = b.hs;
  const m = hs.length ? computeMetrics(hs, state.settings.rho) : null;
  const tmp = { h: hs.map(h => ({ ...h })) };
  const items = hs.length ? byClass(tmp) : [];
  const nContrib = b.contrib.length;
  const ready = nContrib >= 2 && hs.length >= 2;
  const name = nameTouched ? cname : (cname || defaultName());
  side.innerHTML = `
    <div class="panel stack" style="gap:12px">
      <h3>Il nuovo portafoglio</h3>
      <label class="f">Nome<input type="text" id="c-name" value="${esc(name)}" placeholder="es. Mix World + Ex-USA"></label>
      <label class="f">Etichetta breve (grafici)<input type="text" id="c-short" maxlength="18" value="${esc(cshort || name.slice(0, 18))}"></label>
      ${hs.length ? `<div class="kpis" style="grid-template-columns:repeat(2,1fr)">
        <div class="kpi hero"><span class="l">CAGR netto</span><span class="v">${m.cagr == null ? 'n.d.' : pct(m.cagr)}</span><span class="t">calcolato</span></div>
        <div class="kpi"><span class="l">Volatilità σ</span><span class="v">${m.vol == null ? 'n.d.' : pct(m.vol, 1)}</span><span class="t">calcolata</span></div>
        <div class="kpi"><span class="l">Sharpe</span><span class="v">${it(m.sharpe, 2)}</span><span class="t">Rf 2,5%</span></div>
        <div class="kpi"><span class="l">TER</span><span class="v">${pct(m.ter, 2)}</span><span class="t">${m.terPartial ? 'parziale' : 'ponderato'}</span></div></div>
        ${m.coverage < 99.5 ? `<p class="small">Rendimento e volatilità noti per il ${it(m.coverage, 0)}% dei titoli: le metriche usano solo quella parte. Dopo il salvataggio puoi completare i dati da «Modifica titoli e valori».</p>` : ''}
        ${items.length ? `<div class="pie-card">${donut({ items, size: 200, thick: 40, top: 'Titoli', main: String(hs.length), sub: 'per classe' })}${legend(items)}</div>` : ''}
        ${b.dups ? `<p class="small">${b.dups} ${b.dups === 1 ? 'titolo presente' : 'titoli presenti'} in più portafogli: uniti sommando i pesi.</p>` : ''}`
      : '<p class="muted">Spunta almeno un titolo per vedere il risultato.</p>'}
      <button type="button" class="btn" id="c-save" ${ready ? '' : 'disabled'}>Salva come nuovo portafoglio</button>
      ${ready ? '' : '<p class="small">Servono titoli di almeno due portafogli diversi.</p>'}
      ${lastSaved && getPortfolio(lastSaved) ? `<div class="notice info">Salvato: <b>${esc(getPortfolio(lastSaved).n)}</b>.<div class="row" style="margin-top:8px"><a class="btn small" href="#/dashboard/${esc(lastSaved)}">Apri dashboard</a><a class="btn ghost small" href="#/confronto">Confronta</a></div></div>` : ''}
    </div>
    ${hs.length ? `<div class="panel"><h3>Titoli finali</h3><div class="wrap" style="border:0"><table><tbody>${hs.map(h => `<tr><td>${esc(h.n)}</td><td class="n">${it(h.w, 1)}%</td></tr>`).join('')}<tr><td><b>Totale</b></td><td class="n"><b>${it(hs.reduce((a, h) => a + h.w, 0), 1)}%</b></td></tr></tbody></table></div></div>` : ''}`;

  $('#c-name', side).addEventListener('input', ev => { cname = ev.target.value; nameTouched = true; });
  $('#c-short', side).addEventListener('input', ev => { cshort = ev.target.value; });
  $('#c-save', side)?.addEventListener('click', () => save(b));
  drawCompare(root, b, m);
}

function drawCompare(root, b, m) {
  const box = $('#cmp-box', root); if (!box) return;
  const rows = b.parts.map(x => ({ p: x.p, m: computeMetrics(x.p.h, state.settings.rho) }));
  if (m) rows.push({ p: { n: 'Nuovo portafoglio', s: 'Nuovo', c: '--accent' }, m, isNew: true });
  const f = (v, d) => v == null ? 'n.d.' : it(v, d);
  const pts = rows.filter(r => r.m.vol != null && r.m.cagr != null).map(r => ({ x: r.m.vol, y: r.m.cagr, label: r.p.s, color: `var(${r.p.c})` }));
  box.innerHTML = `<div class="wrap"><table><thead><tr><th></th><th>CAGR netto</th><th>Volatilità</th><th>Sharpe</th><th>TER</th><th>USA</th></tr></thead><tbody>
    ${rows.map(r => `<tr${r.isNew ? ' style="font-weight:650"' : ''}><td><span class="dot" style="--c:var(${r.p.c})"></span>${esc(r.p.n)}</td><td class="n">${f(r.m.cagr, 2)}%</td><td class="n">${f(r.m.vol, 1)}%</td><td class="n">${f(r.m.sharpe, 2)}</td><td class="n">${f(r.m.ter, 2)}%</td><td class="n">${r.m.usa == null ? 'n.d.' : Math.round(r.m.usa) + '%'}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="small">Tutti i valori sono calcolati dal sito con lo stesso metodo (rendimento e volatilità dei singoli titoli e correlazioni prudenti), così il confronto è omogeneo. Possono scostarsi di poco dai numeri scritti nei PDF originali.</p>
  <div class="panel">${scatter({ points: pts })}</div>`;
}

function save(b) {
  const name = (cname || defaultName()).trim();
  if (!name) { toast('Scrivi un nome per il nuovo portafoglio.'); return; }
  const hs = roundedHoldings(b.hs).filter(h => h.w > 0).map(h => {
    const o = { n: h.n, w: h.w, isin: h.isin || null, ter: h.ter ?? null, fx: h.fx || '', cls: h.cls };
    ['r', 's', 'usa', 'info'].forEach(f => { if (h[f] !== undefined && h[f] !== null) o[f] = h[f]; });
    return o;
  });
  const quotes = b.contrib.map(x => `${x.p.s} ${it(x.q / (b.contrib.reduce((a, y) => a + y.q, 0) || 1) * 100, 0)}%`).join(', ');
  const p = addPortfolio({
    n: name, s: (cshort || name).slice(0, 18), h: hs, m: {}, kind: 'combo', origin: 'combinato',
    from: b.contrib.map(x => x.id),
    note: `Combinazione di ${b.contrib.map(x => x.p.n).join(', ')} (quote: ${quotes}). Metriche calcolate dal sito dai titoli.`
  });
  lastSaved = p.id; nameTouched = false; cname = ''; cshort = '';
  toast(`«${name}» salvato: ora è in Dashboard e Confronto.`);
  go('#/dashboard/' + p.id);
}
