// Piccoli strumenti condivisi dalle schermate: avvisi, finestre di dialogo, copia, download, navigazione.
import { esc } from './core.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let _refresh = () => {};
export const setRefresh = f => { _refresh = f; };
export const refresh = () => _refresh();
export const go = hash => { if (location.hash === hash) _refresh(); else location.hash = hash; };

let tt = null;
export function toast(msg, ms = 3600) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, ms);
}

export async function copyText(el, txt) {
  const old = el.textContent;
  try { await navigator.clipboard.writeText(txt); el.textContent = 'copiato'; setTimeout(() => { el.textContent = old; }, 900); }
  catch { try { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch { /* niente */ } }
}

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* finestra di dialogo unica (#dlg): titolo, corpo HTML, pulsanti */
export function openDlg({ title, body, buttons = [], wide = false }) {
  const d = $('#dlg');
  d.innerHTML = `<form method="dialog" class="dlg-h"><h2>${esc(title)}</h2><button class="btn ghost small" value="x" aria-label="Chiudi">Chiudi</button></form>
    <div class="dlg-b">${body}</div><div class="dlg-f"></div>`;
  const f = $('.dlg-f', d);
  buttons.forEach(b => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'btn' + (b.kind ? ' ' + b.kind : '') ; el.textContent = b.label;
    el.addEventListener('click', () => b.onClick && b.onClick(el));
    f.appendChild(el);
  });
  if (wide) d.style.width = 'min(1100px, calc(100vw - 24px))'; else d.style.width = '';
  if (!d.open) d.showModal();
  return { el: d, body: $('.dlg-b', d), footer: f, close: () => d.close() };
}

/* icone della navigazione */
const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
export const ICON = {
  dashboard: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>`,
  confronto: `<svg viewBox="0 0 24 24" ${S}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
  piani: `<svg viewBox="0 0 24 24" ${S}><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  combinatore: `<svg viewBox="0 0 24 24" ${S}><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>`,
  glossario: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 8h6"/></svg>`,
  carica: `<svg viewBox="0 0 24 24" ${S}><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>`
};
