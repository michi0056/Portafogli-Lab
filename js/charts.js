// Grafici SVG/HTML senza librerie esterne (funzionano offline).
import { esc, it, eur } from './core.js';

/* ---------- ciambella (torta) ---------- */
export function donut({ items, size = 280, thick = 52, top = '', main = '', sub = '' }) {
  const tot = items.reduce((a, x) => a + x.value, 0) || 1;
  const r = (size - thick) / 2, c = size / 2, L = 2 * Math.PI * r;
  let off = 0, s = '';
  items.forEach((x, i) => {
    const len = (x.value / tot) * L, gap = items.length > 1 ? Math.min(2.5, len * 0.4) : 0;
    s += `<circle class="slice" data-i="${i}" tabindex="0" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${x.color}" stroke-width="${thick}"
      stroke-dasharray="${Math.max(len - gap, 0.01)} ${L - Math.max(len - gap, 0.01)}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})">
      <title>${esc(x.label)}: ${it((x.value / tot) * 100, 1)}%</title></circle>`;
    off += len;
  });
  return `<div class="donut" data-top="${esc(top)}" data-main="${esc(main)}" data-sub="${esc(sub)}">
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Grafico a torta della composizione">${s}</svg>
    <div class="donut-center" aria-live="polite"><span class="dc-top">${esc(top)}</span><strong class="dc-main">${esc(main)}</strong><span class="dc-sub">${esc(sub)}</span></div>
  </div>`;
}

/* collega hover/focus di fette e voci di legenda al centro della ciambella */
export function bindDonut(root, items) {
  const d = root.querySelector('.donut'); if (!d) return;
  const tot = items.reduce((a, x) => a + x.value, 0) || 1;
  const T = d.querySelector('.dc-top'), M = d.querySelector('.dc-main'), S = d.querySelector('.dc-sub');
  const base = { t: d.dataset.top, m: d.dataset.main, s: d.dataset.sub };
  const set = i => {
    root.querySelectorAll('[data-i]').forEach(e => e.classList.toggle('dim', i !== null && Number(e.dataset.i) !== i));
    if (i === null) { T.textContent = base.t; M.textContent = base.m; S.textContent = base.s; return; }
    const x = items[i]; T.textContent = x.cat || ''; M.textContent = it((x.value / tot) * 100, 1) + '%'; S.textContent = x.label;
  };
  root.querySelectorAll('[data-i]').forEach(e => {
    e.addEventListener('mouseenter', () => set(Number(e.dataset.i)));
    e.addEventListener('focus', () => set(Number(e.dataset.i)));
    e.addEventListener('mouseleave', () => set(null));
    e.addEventListener('blur', () => set(null));
  });
}

/* ---------- rischio / rendimento ---------- */
export function scatter({ points, xLabel = 'Volatilità annua σ', yLabel = 'CAGR netto stimato' }) {
  const W = 680, H = 360, L = 54, R = 28, T = 18, B = 46;
  const pts = points.filter(p => p.x !== null && p.y !== null);
  if (!pts.length) return '<p class="muted">Nessun portafoglio selezionato ha volatilità e CAGR.</p>';
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const xmin = Math.floor(Math.min(...xs) - 1), xmax = Math.ceil(Math.max(...xs) + 1.5);
  let ymin = Math.floor((Math.min(...ys) - 0.3) * 2) / 2, ymax = Math.ceil((Math.max(...ys) + 0.3) * 2) / 2;
  if (ymax - ymin < 1) ymax = ymin + 1;
  const X = v => L + (W - L - R) * (v - xmin) / (xmax - xmin), Y = v => T + (H - T - B) * (1 - (v - ymin) / (ymax - ymin));
  let s = '';
  const yStep = (ymax - ymin) > 3 ? 1 : 0.5;
  for (let v = ymin; v <= ymax + 1e-9; v += yStep) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">${it(v, 1)}%</text>`;
  const xStep = (xmax - xmin) > 16 ? 4 : 2;
  for (let v = Math.ceil(xmin / xStep) * xStep; v <= xmax; v += xStep) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - B}" class="grid dash"/><text x="${X(v)}" y="${H - B + 18}" text-anchor="middle" class="ax">${v}%</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="axl">${esc(xLabel)}</text>`;
  s += `<text transform="translate(14,${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" class="axl">${esc(yLabel)}</text>`;
  const placed = [];
  pts.forEach(p => {
    const x = X(p.x), y = Y(p.y), lw = p.label.length * 6.6 + 6, offs = [-12, 21, -27, 36, -42, 51];
    let ly = y - 12;
    for (const o of offs) { const cy = y + o; if (!placed.some(r => Math.abs(r.x - x) < (r.w + lw) / 2 && Math.abs(r.y - cy) < 14)) { ly = cy; break; } }
    placed.push({ x, y: ly, w: lw });
    s += `<g><circle cx="${x}" cy="${y}" r="7" fill="${p.color}" class="dot"><title>${esc(p.label)}: σ ${it(p.x, 1)}%, CAGR ${it(p.y, 2)}%</title></circle><text x="${x}" y="${ly}" text-anchor="middle" class="pl">${esc(p.label)}</text></g>`;
  });
  return `<svg class="scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volatilità contro CAGR netto per portafoglio">${s}</svg>`;
}

/* ---------- barre impilate (composizione per classe) ---------- */
export function stackedBars(rows, classes) {
  return `<div class="sbars">` + rows.map(r => {
    const tot = r.parts.reduce((a, x) => a + x.value, 0) || 1;
    return `<div class="sbar"><span class="sb-l" style="--c:var(${r.c})"><i></i>${esc(r.label)}</span>
      <div class="sb-track" role="img" aria-label="${esc(r.label)}: ${r.parts.map(p => classes[p.cls].label + ' ' + it(p.value / tot * 100, 0) + '%').join(', ')}">` +
      r.parts.map(p => `<span style="width:${p.value / tot * 100}%;background:${classes[p.cls].color}" title="${esc(classes[p.cls].label)}: ${it(p.value / tot * 100, 1)}%">${p.value / tot > 0.08 ? it(p.value / tot * 100, 0) + '%' : ''}</span>`).join('') +
      `</div></div>`;
  }).join('') + `</div>`;
}

/* ---------- linea: capitale nel tempo ---------- */
export function lineChart({ pts, color = 'var(--accent)' }) {
  const W = 680, H = 300, L = 70, R = 20, T = 16, B = 38;
  const ymax = Math.max(...pts.map(p => Math.max(p.cap, p.paid))) * 1.05, xmax = pts[pts.length - 1].y || 1;
  const X = v => L + (W - L - R) * v / xmax, Y = v => T + (H - T - B) * (1 - v / ymax);
  const path = k => pts.map((p, i) => (i ? 'L' : 'M') + X(p.y).toFixed(1) + ' ' + Y(p[k]).toFixed(1)).join(' ');
  let s = '';
  for (let i = 0; i <= 4; i++) { const v = ymax * i / 4; s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">${eur(v)}</text>`; }
  const step = xmax > 20 ? 10 : xmax > 10 ? 5 : xmax > 5 ? 2 : 1;
  for (let v = 0; v <= xmax; v += step) s += `<text x="${X(v)}" y="${H - B + 18}" text-anchor="middle" class="ax">${v} anni</text>`;
  s += `<path d="${path('paid')} L${X(xmax)} ${Y(0)} L${X(0)} ${Y(0)} Z" fill="var(--line)" opacity=".55"/>`;
  s += `<path d="${path('paid')}" fill="none" stroke="var(--ink2)" stroke-width="2" stroke-dasharray="5 4"/>`;
  s += `<path d="${path('cap')}" fill="none" stroke="${color}" stroke-width="3"/>`;
  const last = pts[pts.length - 1];
  s += `<circle cx="${X(last.y)}" cy="${Y(last.cap)}" r="5" fill="${color}"/>`;
  return `<svg class="scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Capitale stimato nel tempo contro versato">${s}</svg>`;
}
