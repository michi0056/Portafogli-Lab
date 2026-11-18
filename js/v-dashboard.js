// Dashboard: analisi del singolo portafoglio con grafici a torta, indicatori, titoli e proiezione.
import { state, allPortfolios, getPortfolio, effectiveMetrics, it, pct, eur, esc, project, CLASSES, isMine, removePortfolio, planSlot, addToPlans, setPlan, state as S, touch, exportable } from './core.js';
import { donut, bindDonut, lineChart } from './charts.js';
import { byHolding, byClass, byCurrency, legend } from './pies.js';
import { $, $$, toast, copyText, download, go, refresh, openDlg } from './ui.js';
import { editPortfolio } from './v-upload.js';

let cur = null;

export function groupedOptions(selectedId) {
  const all = allPortfolios();
  const g = (label, arr) => arr.length ? `<optgroup label="${esc(label)}">${arr.map(p => `<option value="${esc(p.id)}"${p.id === selectedId ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}</optgroup>` : '';
  return g('Dal progetto Creazione Portafogli', all.filter(p => p.origin === 'progetto'))
    + g('Caricati (PDF, JSON, manuali)', all.filter(p => p.origin !== 'progetto' && p.kind !== 'combo'))
    + g('Combinati', all.filter(p => p.kind === 'combo'));
}

export function defaultId() {
  const pl = state.plans.find(x => x && getPortfolio(x.pid));
  return pl ? pl.pid : (getPortfolio('oc') ? 'oc' : allPortfolios()[0]?.id);
}

function kpi(label, value, sub, term, hero) {
  return `<a class="kpi${hero ? ' hero' : ''}" href="#/glossario/${term}" title="Apri nel glossario"><span class="l">${esc(label)}</span><span class="v">${value}</span><span class="t">${sub || '&nbsp;'}</span></a>`;
}

function pieCard(title, items, top, main, sub) {
  return `<div class="panel pie-card" data-pie><h3>${esc(title)}</h3>${donut({ items, top, main, sub })}${legend(items)}</div>`;
}

export function mount(root, param) {
  const all = allPortfolios();
  if (param && getPortfolio(param)) cur = param;
  if (!cur || !getPortfolio(cur)) cur = defaultId();
  const p = getPortfolio(cur);
  if (!p) { root.innerHTML = '<div class="view"><header><h1>Dashboard</h1><p class="muted">Nessun portafoglio disponibile. Carica un PDF dalla pagina «Carica PDF».</p></header></div>'; return; }
  const e = effectiveMetrics(p), m = e.m;
  const inPlan = planSlot(p.id) >= 0;
  const mine = isMine(p.id);
  const idx = all.findIndex(x => x.id === p.id);
  const sumW = p.h.reduce((a, h) => a + (h.w || 0), 0);
  const norm = Math.abs(sumW - 100) > 0.05;
  const cov = e.calc.coverage;
  const nCalc = Object.values(e.src).filter(Boolean).length;
  const items = { t: byHolding(p), c: byClass(p), v: byCurrency(p) };
  const cn = x => x === null || x === undefined ? 'n.d.' : x;
  const proj = { start: 0, monthly: 300, years: 30, ...(state.settings.proj || {}) };

  root.innerHTML = `<div class="view">
  <header>
    <div class="row between">
      <h1>Dashboard</h1>
      <div class="row">
        <button class="btn ghost small" id="prev" ${idx <= 0 ? 'disabled' : ''} aria-label="Portafoglio precedente">← Precedente</button>
        <button class="btn ghost small" id="next" ${idx >= all.length - 1 ? 'disabled' : ''} aria-label="Portafoglio successivo">Successivo →</button>
      </div>
    </div>
    <label class="f" style="max-width:520px">Portafoglio analizzato
      <select class="big" id="sel">${groupedOptions(p.id)}</select></label>
    <div class="row">
      <button class="btn ghost small star" id="star" aria-pressed="${inPlan}">${inPlan ? '★ Nei tuoi 5 piani' : '☆ Aggiungi ai 5 piani'}</button>
      <a class="btn ghost small" href="#/confronto" id="cmp">Confronta con gli altri</a>
      <button class="btn ghost small" id="json">Scarica JSON</button>
      ${mine ? '<button class="btn ghost small" id="edit">Modifica titoli e valori</button><button class="btn danger small" id="del">Elimina</button>' : '<button class="btn ghost small" id="hide" title="Lo nasconde da tutto il sito; si ripristina da «Carica PDF»">Nascondi</button>'}
      ${p.kind === 'combo' ? '<span class="badge ok">Combinato</span>' : (mine ? '<span class="badge">Caricato</span>' : '<span class="badge">Dal progetto</span>')}
    </div>
  </header>

  ${cov < 99.5 ? `<div class="notice"><b>Dati parziali.</b> Rendimento e volatilità sono noti per il ${it(cov, 0)}% del portafoglio: dove mancano le metriche sono sotto «n.d.» o calcolate solo sulla parte nota. Apri «Modifica titoli e valori» per inserire ISIN, rendimento atteso e volatilità dei titoli mancanti.</div>` : ''}

  <section aria-label="Indicatori">
    <div class="kpis">
      ${kpi('CAGR netto stimato', pct(cn(m.cagr)), e.src.cagr ? 'calcolato dal sito' : 'crescita composta', 'cagr', true)}
      ${kpi('Rendimento netto', pct(cn(m.netto)), `lordo ${pct(cn(m.lordo))}`, 'rendimento-atteso')}
      ${kpi('Volatilità σ', pct(cn(m.vol), 1), e.src.vol ? 'calcolata' : 'annua', 'volatilita')}
      ${kpi('Sharpe', it(m.sharpe, 2), 'Rf 2,5%', 'sharpe')}
      ${kpi('TER ponderato', pct(cn(m.ter), 2), e.calc.terPartial && e.src.ter ? 'parziale' : 'costo annuo', 'ter')}
      ${kpi('Esposizione USA', m.usa === null ? 'n.d.' : (p.usaPre || '') + Math.round(m.usa) + '%', p.usaPre ? 'indiretta, stima' : 'diretta', 'esposizione-usa')}
      ${kpi('Cambio non coperto', m.fx === null ? 'n.d.' : (p.fxPre || '') + Math.round(m.fx) + '%', p.fxSub || 'senza copertura', 'rischio-cambio')}
      ${kpi('Titoli', String(p.h.length), `peso totale ${it(sumW, 1)}%`, 'diversificazione')}
    </div>
    ${nCalc ? '<p class="small">Gli indicatori marcati «calcolato» sono stimati dal sito dai titoli, non letti dal documento: vedi la voce «n.d. e valori calcolati» nel glossario.</p>' : ''}
  </section>

  <section aria-label="Composizione">
    <h2>Composizione</h2>
    <div class="grid3">
      ${pieCard('Per titolo', items.t, 'Titoli', String(p.h.length), 'passa sopra una fetta')}
      ${pieCard('Per classe di attivo', items.c, 'Classi', String(items.c.length), 'passa sopra una fetta')}
      ${pieCard('Per valuta', items.v, 'Cambio', m.fx === null ? 'n.d.' : Math.round(m.fx) + '%', 'non coperto')}
    </div>
  </section>

  <section aria-label="Titoli">
    <h2>Titoli, pesi e ISIN</h2>
    <div class="wrap"><table id="hold"><thead><tr><th>Strumento</th><th>ISIN</th><th>Peso</th><th>TER</th><th>Rend. / vol.</th><th>Cambio</th></tr></thead><tbody>
    ${p.h.map(h => holdRow(h, p, sumW, norm)).join('')}
    <tr><td><b>Totale</b></td><td></td><td class="n"><b>${it(sumW, 1)}%${norm ? ' → 100%' : ''}</b></td><td colspan="3"></td></tr>
    </tbody></table></div>
    ${p.note ? `<p class="small" style="max-width:90ch">${esc(p.note)}</p>` : ''}
    ${norm ? '<p class="small">I pesi non sommano 100%: nelle torte e nei calcoli sono normalizzati (voce «Pesi normalizzati» del glossario).</p>' : ''}
  </section>

  <section aria-label="Proiezione">
    <h2>Quanto potrebbe crescere</h2>
    <p class="muted">Proiezione con il CAGR netto del portafoglio (${pct(cn(m.cagr))}) e versamenti mensili costanti. È una stima semplificata, al lordo delle imposte e senza inflazione: serve a confrontare i piani, non a prevederne il risultato.</p>
    <div class="fgrid" style="max-width:640px">
      <label class="f">Capitale iniziale (€)<input type="number" id="p-start" min="0" step="100" value="${proj.start}"></label>
      <label class="f">Versamento mensile (€)<input type="number" id="p-monthly" min="0" step="25" value="${proj.monthly}"></label>
      <label class="f">Anni<input type="number" id="p-years" min="1" max="60" step="1" value="${proj.years}"></label>
    </div>
    <div id="proj-out"></div>
  </section>

  <section aria-label="Tutti i portafogli">
    <h2>Tutti i portafogli</h2>
    <p class="muted">Un clic apre la dashboard del portafoglio.</p>
    <div class="grid3" id="gallery">${all.map(q => galleryCard(q, q.id === p.id)).join('')}</div>
  </section>
  </div>`;

  $$('[data-pie]', root).forEach((el, i) => bindDonut(el, [items.t, items.c, items.v][i]));
  $('#sel', root).addEventListener('change', ev => { cur = ev.target.value; go('#/dashboard/' + cur); });
  $('#prev', root)?.addEventListener('click', () => go('#/dashboard/' + all[idx - 1].id));
  $('#next', root)?.addEventListener('click', () => go('#/dashboard/' + all[idx + 1].id));
  $('#star', root).addEventListener('click', () => {
    if (inPlan) { setPlan(planSlot(p.id), null); toast('Rimosso dai 5 piani.'); refresh(); return; }
    const i = addToPlans(p.id);
    if (i >= 0) { toast(`Aggiunto come piano ${i + 1}.`); refresh(); } else { toast('I 5 posti sono occupati: libera o sostituisci un piano dalla pagina «5 piani».'); go('#/piani'); }
  });
  $('#json', root).addEventListener('click', () => download((p.s || p.n).replace(/[^\w\-]+/g, '_') + '.json', JSON.stringify(exportable(p), null, 2)));
  $('#edit', root)?.addEventListener('click', () => editPortfolio(p));
  $('#del', root)?.addEventListener('click', () => { if (confirm(`Eliminare «${p.n}»? L'operazione non si può annullare (puoi scaricare prima il JSON).`)) { removePortfolio(p.id); cur = null; toast('Portafoglio eliminato.'); go('#/dashboard'); } });
  $('#hide', root)?.addEventListener('click', () => { S.hidden.push(p.id); S.plans = S.plans.map(x => x && x.pid === p.id ? null : x); touch(); cur = null; toast('Nascosto. Lo ripristini da «Carica PDF».'); go('#/dashboard'); });
  $$('.code', root).forEach(b => b.addEventListener('click', () => copyText(b, b.dataset.c)));
  $$('#gallery [data-go]', root).forEach(b => b.addEventListener('click', () => { go('#/dashboard/' + b.dataset.go); window.scrollTo(0, 0); }));

  const drawProj = () => {
    const start = Math.max(0, Number($('#p-start', root).value) || 0), monthly = Math.max(0, Number($('#p-monthly', root).value) || 0), years = Math.min(60, Math.max(1, Math.round(Number($('#p-years', root).value) || 30)));
    state.settings.proj = { start, monthly, years }; touch();
    const out = $('#proj-out', root);
    if (m.cagr === null) { out.innerHTML = '<p class="notice">Serve il CAGR: manca il rendimento o la volatilità dei titoli.</p>'; return; }
    const base = project({ start, monthly, years, cagr: m.cagr });
    const last = base[base.length - 1];
    const sens = [-1, 0, 1].map(d => ({ d, v: project({ start, monthly, years, cagr: m.cagr + d }).pop().cap }));
    out.innerHTML = `<div class="kpis" style="max-width:720px">
      <div class="kpi hero"><span class="l">Capitale stimato a ${years} anni</span><span class="v">${eur(last.cap)}</span><span class="t">con CAGR ${pct(m.cagr)}</span></div>
      <div class="kpi"><span class="l">Totale versato</span><span class="v">${eur(last.paid)}</span><span class="t">${eur(monthly)} al mese</span></div>
      <div class="kpi"><span class="l">Crescita dei mercati</span><span class="v">${eur(last.cap - last.paid)}</span><span class="t">${last.paid ? it((last.cap / last.paid - 1) * 100, 0) + '% sul versato' : ''}</span></div></div>
      ${lineChart({ pts: base, color: 'var(--accent)' })}
      <p class="small">Linea piena: capitale stimato. Tratteggiata: somma versata. Sensibilità: con CAGR di un punto più basso ${eur(sens[0].v)}, con un punto più alto ${eur(sens[2].v)}.</p>`;
  };
  ['p-start', 'p-monthly', 'p-years'].forEach(id => $('#' + id, root).addEventListener('input', drawProj));
  drawProj();
}

function holdRow(h, p, sumW, norm) {
  const wn = (h.w || 0) / (sumW || 1) * 100;
  const isins = h.isin === false ? '<span class="small">n/a</span>' : !h.isin ? '<span class="small"><i>da scegliere</i></span>'
    : `<div class="isins">${h.isin.map(i => `<div>${i.c ? `<button type="button" class="code" data-c="${esc(i.c)}" title="Copia ISIN">${esc(i.c)}</button>` : ''}${i.l ? `<span class="small">${i.c ? ' ' : ''}${esc(i.l)}</span>` : ''}</div>`).join('')}</div>`;
  const rs = h.r === null || h.r === undefined ? 'n.d.' : `${it(h.r, 1)}% / ${it(h.s, 0)}%`;
  return `<tr style="--c:var(${p.c})"><td>${esc(h.n)}<span class="sub">${esc(CLASSES[h.cls]?.label || '')}${h.info ? ' · ' + esc(h.info) : ''}</span></td>
    <td style="text-align:left">${isins}</td>
    <td><div class="wcell"><span class="mono">${it(h.w, 1)}%${norm ? `<span class="sub">${it(wn, 1)}% norm.</span>` : ''}</span><span class="wbar"><span style="width:${wn}%"></span></span></div></td>
    <td class="n${h.ter == null ? ' nd' : ''}">${h.ter == null ? 'n.d.' : it(h.ter, 2) + '%'}</td>
    <td class="n${h.r == null ? ' nd' : ''}">${rs}</td>
    <td style="font-size:13px">${esc(h.fx || 'n.d.')}</td></tr>`;
}

function galleryCard(q, active) {
  const e = effectiveMetrics(q);
  const its = byClass(q);
  return `<button type="button" class="panel mini" data-go="${esc(q.id)}" style="text-align:left;cursor:pointer;border-left:5px solid var(${q.c});${active ? 'background:var(--best)' : ''}" aria-label="Apri ${esc(q.n)}">
    ${donut({ items: its, size: 120, thick: 28 })}
    <div class="stack" style="gap:3px"><b style="font-size:14px">${esc(q.n)}</b>
      <span class="small mono">CAGR ${e.m.cagr === null ? 'n.d.' : it(e.m.cagr, 2) + '%'} · σ ${e.m.vol === null ? 'n.d.' : it(e.m.vol, 1) + '%'}</span>
      <span class="small">${q.h.length} titoli${planSlot(q.id) >= 0 ? ' · ★ piano ' + (planSlot(q.id) + 1) : ''}</span></div></button>`;
}
