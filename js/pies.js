// Dati per i grafici a torta di un portafoglio: per titolo, per classe di attivo, per valuta.
import { CLASSES, isFx, it, esc } from './core.js';

const SER = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
const OTHER = 'var(--s9)';

export function shortName(n, max = 46) {
  let s = String(n || '').replace(/\s*\(([^)]*)\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) s = String(n || '');
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

const total = p => p.h.reduce((a, h) => a + (h.w || 0), 0) || 1;

export function byHolding(p) {
  const T = total(p);
  const rows = p.h.filter(h => (h.w || 0) > 0).map(h => ({ label: shortName(h.n), full: h.n, value: h.w / T * 100, cat: CLASSES[h.cls]?.label || '' }))
    .sort((a, b) => b.value - a.value);
  let items = rows;
  if (rows.length > 8) {
    const rest = rows.slice(7);
    items = rows.slice(0, 7).concat([{ label: `Altri ${rest.length} titoli`, full: rest.map(r => r.full).join(', '), value: rest.reduce((a, r) => a + r.value, 0), cat: '' }]);
  }
  return items.map((x, i) => ({ ...x, color: (i === 7 || x.label.startsWith('Altri ')) ? OTHER : SER[i % SER.length] }));
}

export function byClass(p) {
  const T = total(p), m = new Map();
  p.h.forEach(h => { if (!(h.w > 0)) return; m.set(h.cls, (m.get(h.cls) || 0) + h.w / T * 100); });
  return [...m.entries()].map(([cls, v]) => ({ cls, label: CLASSES[cls]?.label || cls, value: v, color: CLASSES[cls]?.color || OTHER, cat: '' })).sort((a, b) => b.value - a.value);
}

export function byCurrency(p) {
  const T = total(p); let eur = 0, fx = 0, nd = 0;
  p.h.forEach(h => { const w = (h.w || 0) / T * 100, f = isFx(h); if (f === null) nd += w; else if (f) fx += w; else eur += w; });
  return [
    { label: 'Euro (o coperto in euro)', value: eur, color: 'var(--s3)', cat: '' },
    { label: 'Altre valute, non coperte', value: fx, color: 'var(--s2)', cat: '' },
    { label: 'Valuta non indicata', value: nd, color: OTHER, cat: '' }
  ].filter(x => x.value > 0.0001);
}

export function legend(items) {
  return `<ul class="legend">` + items.map((x, i) => `<li data-i="${i}" title="${esc(x.full || x.label)}"><i style="background:${x.color}"></i><span>${esc(x.label)}</span><b>${it(x.value, 1)}%</b></li>`).join('') + `</ul>`;
}
