// Carica PDF / JSON, cartella automatica "inbox", revisione dei dati letti e gestione dei portafogli caricati.
import { state, allPortfolios, addPortfolio, updatePortfolio, removePortfolio, effectiveMetrics, computeMetrics, enrichHolding, classify, CLASSES, SEED_IDS, esc, it, pct, num, touch, exportable, normalizeImported, isMine, invalidate, loadFromBackup } from './core.js';
import { extractLines, parseDocument, isValidIsin } from './parser.js';
import { $, $$, toast, openDlg, download, go, refresh } from './ui.js';

/* ---------- cartella inbox ---------- */
let inbox = [], inboxPath = '', inboxErr = false;
const keyOf = f => `${f.name}|${f.size}|${Math.round(f.mtime)}`;
const sig = () => inbox.map(f => keyOf(f) + (state.imported[keyOf(f)] ? '*' : '')).join(';');
let drawnSig = '';
export const newInbox = () => inbox.filter(f => !state.imported[keyOf(f)]);

export async function pollInbox() {
  try {
    const r = await fetch('/api/inbox', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    inbox = await r.json(); inboxErr = false;
    if (!inboxPath) { try { inboxPath = (await (await fetch('/api/info')).json()).inbox || ''; } catch { /* facoltativo */ } }
  } catch { inboxErr = true; inbox = []; }
  return newInbox().length;
}

/* ---------- lettura file ---------- */
const shortOf = n => (n || 'Portafoglio').replace(/^portafoglio\s+/i, 'P. ').slice(0, 18);

export async function handleFiles(files, meta = {}) {
  const list = [...files];
  if (!list.length) return;
  for (const f of list) {
    const isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
    const isJson = /\.json$/i.test(f.name) || f.type === 'application/json';
    if (!isPdf && !isJson) { toast(`«${f.name}»: formato non supportato (servono PDF o JSON).`); continue; }
    try {
      const buf = await f.arrayBuffer();
      if (isPdf) await readPdf(f.name, buf, meta); else await readJson(new TextDecoder().decode(buf), f.name);
    } catch (err) {
      console.error(err);
      toast(`Non riesco a leggere «${f.name}»: ${err.message || err}. Puoi inserire i dati a mano da «Nuovo portafoglio a mano».`, 7000);
    }
  }
  refresh();
}

async function readPdf(fileName, buf, meta) {
  const lines = await extractLines(buf);
  if (!lines.join('').trim()) {
    toast(`«${fileName}» non contiene testo selezionabile (forse è una scansione): inserisci i dati a mano.`, 7000);
    const r = await review({ title: `«${fileName}»: inserimento manuale`, draft: { name: fileName.replace(/\.pdf$/i, ''), h: [], m: {}, warnings: ['Il PDF non contiene testo leggibile (probabile scansione o immagine).'], file: fileName }, queue: '' });
    if (meta.key) state.imported[meta.key] = r.id || 'skip';
    return;
  }
  const results = parseDocument(lines, { fileName });
  let last = null;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const warnings = [...r.warnings];
    if (results.length > 1) warnings.unshift(`Questo PDF contiene ${results.length} portafogli: stai rivedendo il ${i + 1}° («${r.name}»). Puoi saltare quelli che non servono.`);
    const out = await review({
      title: results.length > 1 ? `«${fileName}»: portafoglio ${i + 1} di ${results.length}` : `Controlla i dati letti da «${fileName}»`,
      draft: { name: r.name, s: shortOf(r.name), h: r.h, m: r.m, warnings, file: fileName, raw: i === 0 ? lines : null, found: r.found },
      queue: results.length > 1 ? `${i + 1}/${results.length}` : ''
    });
    if (out.id) last = out.id;
  }
  if (meta.key) { state.imported[meta.key] = last || 'skip'; touch(); }
}

async function readJson(text, fileName) {
  let obj;
  try { obj = JSON.parse(text); } catch { toast(`«${fileName}» non è un JSON valido.`); return; }
  if (obj && obj.version && Array.isArray(obj.portfolios) && 'plans' in obj) {
    if (!confirm(`«${fileName}» è un backup completo del sito. Ripristinarlo SOSTITUISCE portafogli, 5 piani e impostazioni attuali. Continuare?`)) return;
    loadFromBackup(obj); toast('Backup ripristinato.'); return;
  }
  const arr = Array.isArray(obj) ? obj : Array.isArray(obj?.portfolios) ? obj.portfolios : [obj];
  const ok = arr.map(o => normalizeImported(o, 'json')).filter(Boolean);
  if (!ok.length) { toast(`In «${fileName}» non trovo portafogli con titoli e pesi.`, 6000); return; }
  for (let i = 0; i < ok.length; i++) {
    await review({ title: `Controlla «${ok[i].n}» (da ${fileName})`, draft: { name: ok[i].n, s: ok[i].s, h: ok[i].h, m: ok[i].m, note: ok[i].note, kind: ok[i].kind, from: ok[i].from, warnings: [], file: fileName }, queue: ok.length > 1 ? `${i + 1}/${ok.length}` : '', origin: 'json' });
  }
}

/* ---------- finestra di revisione ---------- */
const FX_OPTS = ['', 'non coperto', 'USD', 'coperto in euro', 'nessuno (euro)'];
const fxNorm = f => { const x = (f || '').trim(); if (/^eur$/i.test(x)) return 'nessuno (euro)'; return x; };
const METRIC_FIELDS = [['lordo', 'Rend. lordo %'], ['netto', 'Rend. netto %'], ['ter', 'TER ponderato %'], ['vol', 'Volatilità %'], ['cagr', 'CAGR %'], ['sharpe', 'Sharpe'], ['usa', 'Esposizione USA %'], ['fx', 'Cambio non coperto %']];

function rowHtml(h, i) {
  const code = h.isin ? (h.isin.map(x => x.c).filter(Boolean).join(', ')) : '';
  const fx = fxNorm(h.fx);
  const fxOpts = FX_OPTS.includes(fx) ? FX_OPTS : FX_OPTS.concat([fx]);
  const cls = h.cls || classify(h);
  return `<tr data-i="${i}">
    <td><input type="text" data-k="n" value="${esc(h.n)}" aria-label="Strumento"></td>
    <td><input type="text" data-k="isin" value="${esc(code)}" placeholder="IE00…" aria-label="ISIN" style="min-width:128px"></td>
    <td><input type="number" data-k="w" step="0.1" min="0" value="${h.w ?? ''}" aria-label="Peso %"></td>
    <td><input type="number" data-k="ter" step="0.01" min="0" value="${h.ter ?? ''}" aria-label="TER %"></td>
    <td><input type="number" data-k="r" step="0.1" value="${h.r ?? ''}" placeholder="auto" aria-label="Rendimento atteso %"></td>
    <td><input type="number" data-k="s" step="0.1" min="0" value="${h.s ?? ''}" placeholder="auto" aria-label="Volatilità %"></td>
    <td><select data-k="fx" aria-label="Cambio">${fxOpts.map(o => `<option value="${esc(o)}"${o === fx ? ' selected' : ''}>${o || 'non indicato'}</option>`).join('')}</select></td>
    <td><select data-k="cls" aria-label="Classe">${Object.entries(CLASSES).map(([k, v]) => `<option value="${k}"${k === cls ? ' selected' : ''}>${esc(v.label)}</option>`).join('')}</select></td>
    <td><button type="button" class="btn ghost small" data-del aria-label="Togli riga">✕</button></td></tr>`;
}

export function review({ title, draft, queue = '', origin = 'pdf', editId = null }) {
  return new Promise(resolve => {
    const h0 = (draft.h || []).map(x => ({ ...x }));
    const origIsin = h0.map(x => x.isin);
    let rows = h0.length ? h0 : [{ n: '', w: null, isin: null, ter: null, fx: '', cls: 'glob' }];
    const declared = { ...(draft.m || {}) };
    const body = `
      ${(draft.warnings || []).length ? `<div class="notice"><ul style="margin:0">${draft.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
      <p class="muted" style="max-width:80ch">La lettura dei PDF è automatica ma può sbagliare: controlla nomi, ISIN e pesi prima di salvare. Rendimento e volatilità restano «auto» se l'ISIN è tra quelli noti; per gli altri titoli puoi inserirli a mano.</p>
      <div class="fgrid" style="max-width:720px">
        <label class="f">Nome del portafoglio<input type="text" id="r-name" value="${esc(draft.name || '')}"></label>
        <label class="f">Etichetta breve (grafici)<input type="text" id="r-s" maxlength="18" value="${esc(draft.s || shortOf(draft.name))}"></label>
      </div>
      <div class="wrap"><table class="edit-tbl"><thead><tr><th>Strumento</th><th>ISIN</th><th>Peso %</th><th>TER %</th><th>Rend. att. %</th><th>Vol. %</th><th>Cambio</th><th>Classe</th><th></th></tr></thead><tbody id="r-body">${rows.map(rowHtml).join('')}</tbody></table></div>
      <div class="row"><button type="button" class="btn ghost small" id="r-add">+ Aggiungi titolo</button><button type="button" class="btn ghost small" id="r-norm">Normalizza i pesi a 100%</button><span id="r-sum" class="mono"></span></div>
      <details><summary style="cursor:pointer;font-weight:600">Valori dichiarati nel documento (facoltativi)</summary>
        <p class="small" style="margin:8px 0">Se il PDF riporta già rendimento, volatilità, CAGR… scrivili qui: hanno la precedenza. Lasciati vuoti, li calcolo io dai titoli e lo segnalo con «calcolato».</p>
        <div class="fgrid">${METRIC_FIELDS.map(([k, l]) => `<label class="f">${l}<input type="number" step="0.01" data-m="${k}" value="${declared[k] ?? ''}"></label>`).join('')}</div></details>
      <div id="r-prev"></div>
      ${draft.raw ? `<details><summary style="cursor:pointer;font-weight:600">Testo letto dal PDF (per controllo)</summary><pre style="white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto;background:var(--surface);border:1px solid var(--line);padding:10px;border-radius:6px">${esc(draft.raw.filter(l => l.trim()).slice(0, 400).join('\n'))}</pre></details>` : ''}`;

    let done = false;
    const fin = v => { if (done) return; done = true; dlg.el.removeEventListener('close', onClose); resolve(v); };
    const onClose = () => fin({ id: null });
    const dlg = openDlg({
      title: title + (queue ? `  (${queue})` : ''), body, wide: true,
      buttons: [
        { label: queue ? 'Salta questo' : 'Annulla', kind: 'ghost', onClick: () => { dlg.close(); fin({ id: null }); } },
        { label: editId ? 'Salva modifiche' : 'Salva portafoglio', onClick: save }
      ]
    });
    dlg.el.addEventListener('close', onClose);
    const root = dlg.body, tb = $('#r-body', root);

    const collect = () => $$('tr', tb).map((tr, i) => {
      const g = k => $(`[data-k="${k}"]`, tr).value.trim();
      const codes = g('isin').split(/[\s,;/]+/).map(s => s.toUpperCase()).filter(Boolean);
      const prev = (origIsin[+tr.dataset.i] || []);
      const isin = codes.length ? codes.map(c => prev.find(x => x.c === c) || { c }) : null;
      const o = { n: g('n'), w: num(g('w')), isin, ter: g('ter') === '' ? null : num(g('ter')), fx: g('fx'), cls: g('cls') };
      if (g('r') !== '') o.r = num(g('r')); if (g('s') !== '') o.s = num(g('s'));
      const orig = h0[+tr.dataset.i]; if (orig?.info) o.info = orig.info;
      return o;
    }).filter(h => h.n || h.w);
    const collectM = () => { const m = {}; $$('[data-m]', root).forEach(el => { m[el.dataset.m] = el.value === '' ? null : num(el.value); }); return m; };

    const preview = () => {
      const hs = collect(), tot = hs.reduce((a, h) => a + (h.w || 0), 0);
      const ok = Math.abs(tot - 100) < 0.6;
      $('#r-sum', root).innerHTML = `Somma pesi: <b style="color:${ok ? 'var(--accent)' : 'var(--warn)'}">${it(tot, 1)}%</b>${ok ? '' : ' (non 100%)'}`;
      const c = hs.length ? computeMetrics(hs, state.settings.rho) : null;
      const dec = collectM();
      const v = k => dec[k] ?? c?.[k] ?? null;
      $('#r-prev', root).innerHTML = c ? `<div class="kpis"><div class="kpi"><span class="l">CAGR</span><span class="v">${pct(v('cagr'))}</span><span class="t">${dec.cagr != null ? 'dichiarato' : 'calcolato'}</span></div>
        <div class="kpi"><span class="l">Volatilità</span><span class="v">${pct(v('vol'), 1)}</span><span class="t">${dec.vol != null ? 'dichiarata' : 'calcolata'}</span></div>
        <div class="kpi"><span class="l">Sharpe</span><span class="v">${it(v('sharpe'), 2)}</span><span class="t"></span></div>
        <div class="kpi"><span class="l">TER</span><span class="v">${pct(v('ter'), 2)}</span><span class="t"></span></div>
        <div class="kpi"><span class="l">Dati noti</span><span class="v">${it(c.coverage, 0)}%</span><span class="t">dei titoli con rend./vol.</span></div></div>` : '';
    };
    const redraw = () => { rows = collect(); tb.innerHTML = rows.map((h, i) => { origIsin[i] = h.isin; h0[i] = h; return rowHtml(h, i); }).join(''); preview(); };
    root.addEventListener('input', preview);
    root.addEventListener('change', preview);
    root.addEventListener('click', ev => {
      const del = ev.target.closest('[data-del]'); if (del) { del.closest('tr').remove(); preview(); }
    });
    $('#r-add', root).addEventListener('click', () => { rows = collect(); rows.push({ n: '', w: null, isin: null, ter: null, fx: '', cls: 'glob' }); tb.innerHTML = rows.map((h, i) => { origIsin[i] = h.isin; h0[i] = h; return rowHtml(h, i); }).join(''); preview(); const last = $$('tr', tb).pop(); $('[data-k="n"]', last).focus(); });
    $('#r-norm', root).addEventListener('click', () => {
      const hs = collect(), tot = hs.reduce((a, h) => a + (h.w || 0), 0);
      if (!tot) return;
      $$('tr', tb).forEach(tr => { const w = num($('[data-k="w"]', tr).value); if (w) $('[data-k="w"]', tr).value = Math.round(w / tot * 1000) / 10; });
      preview();
    });
    preview();

    function save() {
      const name = $('#r-name', root).value.trim();
      const hs = collect().filter(h => h.n && h.w > 0);
      if (!name) { toast('Scrivi un nome per il portafoglio.'); $('#r-name', root).focus(); return; }
      if (!hs.length) { toast('Serve almeno un titolo con nome e peso.'); return; }
      const bad = hs.flatMap(h => (h.isin || []).map(i => i.c)).filter(c => c && !isValidIsin(c));
      if (bad.length && !confirm(`Questi ISIN non sembrano validi: ${bad.join(', ')}.\nSalvare comunque?`)) return;
      const payload = { n: name, s: ($('#r-s', root).value.trim() || shortOf(name)).slice(0, 18), h: hs, m: collectM(), note: draft.note || (draft.file ? `Letto da ${draft.file}.` : ''), file: draft.file || null };
      if (draft.kind) payload.kind = draft.kind; if (draft.from) payload.from = draft.from;
      let id;
      if (editId) { updatePortfolio(editId, payload); id = editId; }
      else { id = addPortfolio({ ...payload, origin, kind: draft.kind || null }).id; }
      toast(editId ? 'Modifiche salvate.' : `«${name}» aggiunto: ora è in Dashboard e Confronto.`);
      dlg.close(); fin({ id });
    }
  });
}

export function editPortfolio(p) {
  return review({ title: `Modifica «${p.n}»`, draft: { name: p.n, s: p.s, h: p.h, m: p.m, note: p.note, kind: p.kind, from: p.from, warnings: [] }, editId: p.id }).then(() => refresh());
}

export function newManual() {
  return review({ title: 'Nuovo portafoglio a mano', draft: { name: '', s: '', h: [], m: {}, warnings: [] }, origin: 'manuale' }).then(r => { refresh(); return r; });
}

/* ---------- schermata ---------- */
export async function mount(root) {
  await pollInbox();
  draw(root);
  const iv = setInterval(async () => { if (!$('#v-upload', root)) { clearInterval(iv); return; } await pollInbox(); if (sig() !== drawnSig && !$('#dlg')?.open) draw(root); }, 3000);
}

function draw(root) {
  drawnSig = sig();
  const mine = state.portfolios;
  const hidden = state.hidden.map(id => (SEED_IDS.find(s => s.id === id))).filter(Boolean);
  const nNew = newInbox().length;
  root.innerHTML = `<div class="view" id="v-upload">
  <header>
    <h1>Carica PDF</h1>
    <p class="muted">I PDF vengono letti sul tuo computer: non escono dal sito. Dopo la lettura vedi una schermata di controllo in cui correggi ciò che serve, poi il portafoglio compare in Dashboard, Confronto e Combinatore.</p>
  </header>

  <section aria-label="Trascina i file">
    <h2>1. Trascina o scegli i file</h2>
    <div class="drop" id="drop">
      <strong>Rilascia qui uno o più PDF (o JSON)</strong>
      <span class="muted">Funziona anche rilasciandoli in qualsiasi punto della pagina.</span>
      <div class="row" style="justify-content:center"><label class="btn" style="cursor:pointer">Scegli file…<input type="file" id="file" accept=".pdf,.json,application/pdf,application/json" multiple hidden></label></div>
    </div>
  </section>

  <section aria-label="Cartella automatica">
    <h2>2. Oppure copia i PDF nella cartella «inbox»</h2>
    <p class="muted">Il modo più comodo: salvi i PDF scaricati dal progetto in questa cartella e qui compaiono da soli, senza trascinare.</p>
    ${inboxPath ? `<p class="small">Cartella: <span class="code" style="cursor:text;user-select:all">${esc(inboxPath)}</span></p>` : ''}
    ${inboxErr ? '<div class="notice">Non riesco a leggere la cartella: il sito è aperto senza il server? Avvia «avvia» (vedi LEGGIMI) e riapri dall\'indirizzo localhost.</div>' : ''}
    <div class="wrap"><table><thead><tr><th>File nella cartella</th><th>Dimensione</th><th>Stato</th><th></th></tr></thead><tbody>
      ${inbox.length ? inbox.map((f, i) => { const st = state.imported[keyOf(f)]; return `<tr><td>${esc(f.name)}</td><td class="n">${Math.round(f.size / 1024)} KB</td><td style="text-align:left">${!st ? '<span class="badge warn">nuovo</span>' : st === 'skip' ? '<span class="badge">saltato</span>' : '<span class="badge ok">importato</span>'}</td><td><button class="btn ${st ? 'ghost' : ''} small" data-inbox="${i}">${st ? 'Rileggi' : 'Leggi'}</button></td></tr>`; }).join('') : '<tr><td colspan="4" class="muted" style="text-align:left">Nessun PDF nella cartella.</td></tr>'}
    </tbody></table></div>
    ${nNew > 1 ? `<div><button class="btn" id="inbox-all">Leggi tutti i ${nNew} nuovi</button></div>` : ''}
  </section>

  <section aria-label="Altri modi">
    <h2>3. Altri modi per aggiungere un portafoglio</h2>
    <div class="grid2">
      <div class="panel stack"><h3>A mano</h3><p class="muted">Inserisci titoli, ISIN e pesi di un portafoglio che non hai in PDF.</p><div><button class="btn ghost" id="manual">Nuovo portafoglio a mano</button></div></div>
      <div class="panel stack"><h3>Incolla un JSON</h3><textarea id="json-in" placeholder='{"n":"Il mio piano","h":[{"n":"VWCE","isin":"IE00BK5BQT80","w":100,"ter":0.14}]}' aria-label="JSON del portafoglio"></textarea><div class="row"><button class="btn ghost" id="json-go">Importa JSON</button><span class="small">Anche un elenco di portafogli, o un backup scaricato dal sito.</span></div></div>
    </div>
  </section>

  <section aria-label="I tuoi portafogli">
    <h2>I portafogli che hai caricato (${mine.length})</h2>
    ${mine.length ? `<div class="wrap"><table><thead><tr><th>Nome</th><th>Origine</th><th>Titoli</th><th>CAGR</th><th>Volatilità</th><th></th></tr></thead><tbody>
      ${mine.map(q => { const p = allPortfolios().find(x => x.id === q.id); const e = effectiveMetrics(p); return `<tr><td><span class="dot" style="--c:var(${p.c})"></span>${esc(p.n)}</td><td style="text-align:left">${p.kind === 'combo' ? 'combinato' : esc(p.origin || 'pdf')}</td><td class="n">${p.h.length}</td><td class="n">${e.m.cagr == null ? 'n.d.' : it(e.m.cagr, 2) + '%'}</td><td class="n">${e.m.vol == null ? 'n.d.' : it(e.m.vol, 1) + '%'}</td>
        <td style="white-space:nowrap"><a class="btn ghost small" href="#/dashboard/${esc(p.id)}">Apri</a> <button class="btn ghost small" data-edit="${esc(p.id)}">Modifica</button> <button class="btn ghost small" data-json="${esc(p.id)}">JSON</button> <button class="btn danger small" data-del="${esc(p.id)}">Elimina</button></td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="muted">Ancora nessuno: i 16 portafogli del progetto sono già presenti in Dashboard e Confronto.</p>'}
    ${hidden.length ? `<h3>Portafogli del progetto nascosti</h3><div class="chips">${hidden.map(s => `<button class="chip plain" data-restore="${esc(s.id)}">Ripristina «${esc(s.n)}»</button>`).join('')}</div>` : ''}
  </section>

  <section aria-label="Limiti della lettura">
    <h2>Cosa aspettarsi dalla lettura automatica</h2>
    <ul class="notes" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;color:var(--ink2);font-size:14px;max-width:80ch">
      <li>Riconosco le righe con un titolo e una percentuale (peso), gli ISIN validi e, se presenti, TER, rendimento, volatilità, CAGR e Sharpe dichiarati.</li>
      <li>Se un PDF contiene più portafogli con un titolo ciascuno (come il documento di revisione di DEGIRO e TR MY) li propone uno alla volta.</li>
      <li>Le scansioni (immagini senza testo) non si leggono: si inseriscono a mano.</li>
      <li>Per i titoli con ISIN noto uso rendimento e volatilità stimati del progetto; per gli altri li puoi scrivere tu nella schermata di controllo, altrimenti le metriche risultano «n.d.».</li>
    </ul>
  </section>
  </div>`;

  const dropEl = $('#drop', root);
  ['dragenter', 'dragover'].forEach(t => dropEl.addEventListener(t, ev => { ev.preventDefault(); dropEl.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => dropEl.addEventListener(t, () => dropEl.classList.remove('over')));
  $('#file', root).addEventListener('change', ev => { const f = [...ev.target.files]; ev.target.value = ''; handleFiles(f); });
  $('#manual', root).addEventListener('click', () => newManual());
  $('#json-go', root).addEventListener('click', async () => { const t = $('#json-in', root).value.trim(); if (!t) { toast('Incolla prima un JSON.'); return; } await readJson(t, 'JSON incollato'); refresh(); });
  $$('[data-inbox]', root).forEach(b => b.addEventListener('click', () => importInbox(inbox[+b.dataset.inbox])));
  $('#inbox-all', root)?.addEventListener('click', async () => { for (const f of newInbox()) await importInbox(f, true); refresh(); });
  $$('[data-edit]', root).forEach(b => b.addEventListener('click', () => editPortfolio(allPortfolios().find(p => p.id === b.dataset.edit))));
  $$('[data-json]', root).forEach(b => b.addEventListener('click', () => { const p = allPortfolios().find(x => x.id === b.dataset.json); download((p.s || p.n).replace(/[^\w\-]+/g, '_') + '.json', JSON.stringify(exportable(p), null, 2)); }));
  $$('[data-del]', root).forEach(b => b.addEventListener('click', () => { const p = allPortfolios().find(x => x.id === b.dataset.del); if (confirm(`Eliminare «${p.n}»?`)) { removePortfolio(p.id); toast('Eliminato.'); refresh(); } }));
  $$('[data-restore]', root).forEach(b => b.addEventListener('click', () => { state.hidden = state.hidden.filter(x => x !== b.dataset.restore); invalidate(); touch(); refresh(); }));
}

async function importInbox(f, quiet) {
  try {
    const r = await fetch('/api/inbox/' + encodeURIComponent(f.name));
    if (!r.ok) throw new Error('file non trovato');
    const buf = await r.arrayBuffer();
    await readPdf(f.name, buf, { key: keyOf(f) });
    state.imported[keyOf(f)] = state.imported[keyOf(f)] || 'skip'; touch();
  } catch (err) { toast(`«${f.name}»: ${err.message || err}`, 6000); }
  if (!quiet) refresh();
}
