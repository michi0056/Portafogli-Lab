// Punto di ingresso: carica i dati, gestisce navigazione, tema, trascinamento dei file e segnalibri dei 5 piani.
import { loadState, state, onChange, isServerOk, dueToday, getPortfolio, effectiveMetrics, esc, it, invalidate } from './core.js';
import { $, $$, setRefresh, ICON, toast, go, download } from './ui.js';
import * as dash from './v-dashboard.js';
import * as cmp from './v-compare.js';
import * as plans from './v-plans.js';
import * as combo from './v-combiner.js';
import * as glo from './v-glossary.js';
import * as up from './v-upload.js';

const ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: ICON.dashboard, view: dash },
  { id: 'confronto', label: 'Confronto', icon: ICON.confronto, view: cmp },
  { id: 'piani', label: '5 piani', icon: ICON.piani, view: plans },
  { id: 'combinatore', label: 'Combinatore', icon: ICON.combinatore, view: combo },
  { id: 'glossario', label: 'Glossario', icon: ICON.glossario, view: glo },
  { id: 'carica', label: 'Carica PDF', icon: ICON.carica, view: up }
];

const main = $('#main');
let lastRoute = '';
let nNew = 0;

function parseHash() {
  const [, id = 'dashboard', ...rest] = (location.hash || '#/dashboard').split('/');
  const route = ROUTES.find(r => r.id === id) || ROUTES[0];
  return { route, param: rest.length ? decodeURIComponent(rest.join('/')) : '' };
}

/* ---------- navigazione e segnalibri ---------- */
function drawNav(cur) {
  $('#nav').innerHTML = ROUTES.map(r =>
    `<a href="#/${r.id}" ${r.id === cur ? 'aria-current="page"' : ''}>${r.icon}<span>${r.label}</span>${r.id === 'carica' && nNew ? `<span class="badge warn" style="margin-left:auto" title="PDF nuovi nella cartella inbox">${nNew}</span>` : ''}</a>`).join('');
  drawPlansRail();
}

function drawPlansRail() {
  let rail = $('#plans-rail');
  if (!rail) {
    rail = document.createElement('div');
    rail.id = 'plans-rail'; rail.className = 'plans-rail';
    $('#nav').after(rail);
  }
  const curId = location.hash.startsWith('#/dashboard/') ? decodeURIComponent(location.hash.slice('#/dashboard/'.length)) : '';
  rail.innerHTML = `<h3>I miei 5 piani</h3><ol>${state.plans.map((pl, i) => {
    const p = pl && getPortfolio(pl.pid);
    if (!p) return `<li><button type="button" class="bookmark empty" data-slot="${i}"><span class="nm">Piano ${i + 1}: vuoto</span></button></li>`;
    const e = effectiveMetrics(p);
    return `<li><button type="button" class="bookmark" style="--c:var(${p.c})" data-open="${esc(p.id)}" ${curId === p.id ? 'aria-current="true"' : ''} title="${esc(p.n)}"><span class="nm">${esc(p.s)}</span>${dueToday(pl) ? '<span class="due" title="Scadenza o revisione da fare"></span>' : ''}<span class="cg">${e.m.cagr == null ? '' : it(e.m.cagr, 1) + '%'}</span></button></li>`;
  }).join('')}</ol>`;
  $$('[data-open]', rail).forEach(b => b.addEventListener('click', () => go('#/dashboard/' + b.dataset.open)));
  $$('[data-slot]', rail).forEach(b => b.addEventListener('click', () => go('#/piani')));
}

function drawSaveState(kind) {
  const el = $('#savestate'); if (!el) return;
  if (!isServerOk()) { el.className = 'savestate err'; el.textContent = 'Server non raggiungibile: i dati restano solo in questo browser.'; return; }
  el.className = 'savestate';
  el.textContent = kind === 'changed' ? 'Salvataggio…' : 'Salvato sul computer';
}

/* ---------- disegno della schermata ---------- */
async function render(toTop) {
  const { route, param } = parseHash();
  const key = route.id + '/' + param;
  const y = window.scrollY;
  drawNav(route.id);
  document.title = route.label + ' · Portafogli Lab';
  main.innerHTML = '';
  try { await route.view.mount(main, param); }
  catch (err) {
    console.error(err);
    main.innerHTML = `<div class="view"><header><h1>Qualcosa non ha funzionato</h1><p class="muted">Errore nella schermata «${esc(route.label)}»: ${esc(err.message || err)}. Ricarica la pagina; i dati salvati non sono stati toccati.</p></header></div>`;
  }
  if (toTop || key !== lastRoute) { window.scrollTo(0, 0); if (key !== lastRoute) main.focus({ preventScroll: true }); }
  else window.scrollTo(0, y);
  lastRoute = key;
}

/* ---------- tema ---------- */
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
function initTheme() {
  let t = null; try { t = localStorage.getItem('pl-theme'); } catch { /* facoltativo */ }
  applyTheme(t);
  $('#btn-theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    applyTheme(next); try { localStorage.setItem('pl-theme', next); } catch { /* facoltativo */ }
  });
}

/* ---------- trascinamento dei file su tutta la pagina ---------- */
function initDrop() {
  let depth = 0;
  const hasFiles = ev => ev.dataTransfer && [...(ev.dataTransfer.types || [])].includes('Files');
  window.addEventListener('dragenter', ev => { if (!hasFiles(ev)) return; depth++; document.body.classList.add('dragging'); });
  window.addEventListener('dragleave', ev => { if (!hasFiles(ev)) return; depth = Math.max(0, depth - 1); if (!depth) document.body.classList.remove('dragging'); });
  window.addEventListener('dragover', ev => { if (hasFiles(ev)) ev.preventDefault(); });
  window.addEventListener('drop', ev => {
    if (!hasFiles(ev)) return;
    ev.preventDefault(); depth = 0; document.body.classList.remove('dragging');
    up.handleFiles(ev.dataTransfer.files);
  });
}

/* ---------- PDF nuovi nella cartella inbox ---------- */
let announced = 0;
async function watchInbox() {
  const n = await up.pollInbox();
  if (n !== nNew) {
    nNew = n;
    drawNav(parseHash().route.id);
    if (n > announced) toast(n === 1 ? 'C\'è 1 PDF nuovo nella cartella inbox: aprilo da «Carica PDF».' : `Ci sono ${n} PDF nuovi nella cartella inbox: aprili da «Carica PDF».`, 6000);
    announced = n;
  }
}

/* ---------- avvio ---------- */
(async function start() {
  initTheme();
  $('#btn-backup')?.addEventListener('click', () => { let t = null; try { t = localStorage.getItem('pl-state'); } catch { /* facoltativo */ } download('portafogli-backup.json', t || '{"version":1,"portfolios":[],"plans":[null,null,null,null,null]}'); });
  await loadState();
  invalidate();
  setRefresh(() => render(false));
  onChange(kind => { drawSaveState(kind); drawPlansRail(); });
  window.addEventListener('hashchange', () => render(true));
  initDrop();
  drawSaveState('saved');
  await render(true);
  watchInbox();
  setInterval(watchInbox, 5000);
})();
