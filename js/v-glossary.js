// Glossario: ricerca, filtro per categoria, voci espandibili con formula ed esempio numerico.
import { esc } from './core.js';
import { GLOSSARY, CATS, byId } from './glossary.js';
import { $, $$ } from './ui.js';

let q = '', cat = '';
const START = ['interesse-composto', 'inflazione', 'diversificazione', 'etf', 'ter', 'volatilita', 'cagr', 'sharpe'];

const plain = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function hl(text) {
  const t = esc(text);
  if (!q.trim()) return t;
  const needle = esc(q.trim());
  const i = norm(t).indexOf(norm(needle));
  if (i < 0) return t;
  return t.slice(0, i) + '<mark>' + t.slice(i, i + needle.length) + '</mark>' + t.slice(i + needle.length);
}
const hay = g => norm([g.t, g.short, plain(g.body), g.formula, g.example, g.cat].join(' '));

export function mount(root, param) {
  if (param && byId(param)) { q = ''; cat = ''; }
  draw(root, param);
}

function draw(root, open) {
  const nq = norm(q.trim());
  const list = GLOSSARY.filter(g => (!cat || g.cat === cat) && (!nq || hay(g).includes(nq)));
  const cats = CATS.filter(c => list.some(g => g.cat === c));
  root.innerHTML = `<div class="view">
  <header>
    <h1>Glossario</h1>
    <p class="muted">Terminologia, coefficienti e basi di economia, spiegati con formule ed esempi numerici. Ogni indicatore di Dashboard e Confronto rimanda alla sua voce. Gli esempi sono illustrativi; le regole fiscali sono quelle generali italiane e vanno verificate con un professionista.</p>
  </header>
  <div class="glo-tools">
    <label class="f" style="max-width:520px">Cerca nel glossario<input type="search" id="gq" placeholder="es. volatilità, ETF, BTP, cambio…" value="${esc(q)}" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Categorie">
      <button type="button" class="chip plain" data-cat="" aria-pressed="${cat === ''}">Tutte (${GLOSSARY.length})</button>
      ${CATS.map(c => `<button type="button" class="chip plain" data-cat="${esc(c)}" aria-pressed="${cat === c}">${esc(c)} (${GLOSSARY.filter(g => g.cat === c).length})</button>`).join('')}
    </div>
    <div class="row"><button type="button" class="btn ghost small" id="g-open">Apri tutte</button><button type="button" class="btn ghost small" id="g-close">Chiudi tutte</button><span class="small" id="g-count">${list.length} ${list.length === 1 ? 'voce' : 'voci'}</span></div>
  </div>
  ${!q && !cat ? `<section aria-label="Da dove partire"><h2>Se parti da zero</h2><p class="muted">Otto voci, in quest'ordine, bastano per leggere tutto il resto del sito.</p>
    <div class="see">${START.map((id, i) => byId(id) ? `<a href="#/glossario/${id}">${i + 1}. ${esc(byId(id).t.replace(/\s*\(.*$/, ''))}</a>` : '').join('')}</div></section>` : ''}
  <div class="glo-list">
    ${list.length ? cats.map(c => `<section class="glo-cat" aria-label="${esc(c)}"><h2>${esc(c)}</h2>${list.filter(g => g.cat === c).map(g => term(g, open === g.id || (nq && list.length <= 6))).join('')}</section>`).join('') : '<p class="notice">Nessuna voce corrisponde alla ricerca.</p>'}
  </div></div>`;

  const input = $('#gq', root);
  input.addEventListener('input', () => {
    q = input.value; const pos = input.selectionStart;
    draw(root); const n = $('#gq', root); n.focus(); n.setSelectionRange(pos, pos);
  });
  $$('[data-cat]', root).forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; draw(root); }));
  $('#g-open', root).addEventListener('click', () => $$('details.term', root).forEach(d => { d.open = true; }));
  $('#g-close', root).addEventListener('click', () => $$('details.term', root).forEach(d => { d.open = false; }));
  if (open && byId(open)) {
    const el = $('#t-' + open, root);
    if (el) { el.open = true; setTimeout(() => el.scrollIntoView({ block: 'center' }), 30); }
  }
}

function term(g, open) {
  const see = (g.see || []).map(byId).filter(Boolean);
  return `<details class="term" id="t-${g.id}"${open ? ' open' : ''}>
    <summary><span class="tt">${hl(g.t)}</span><span class="ts">${hl(g.short)}</span></summary>
    <div class="term-body">${g.body}
      ${g.formula ? `<div class="formula">${esc(g.formula)}</div>` : ''}
      ${g.example ? `<p class="ex"><b>Esempio.</b> ${esc(g.example)}</p>` : ''}
      ${see.length ? `<div class="see">Vedi anche: ${see.map(s => `<a href="#/glossario/${s.id}">${esc(s.t.replace(/\s*\(.*$/, ''))}</a>`).join('')}</div>` : ''}
    </div></details>`;
}
