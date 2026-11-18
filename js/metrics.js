// Righe delle metriche e formattazione condivise da Dashboard e Confronto.
import { it, pct, effectiveMetrics } from './core.js';

/* d: 1 = meglio se più alto, -1 = meglio se più basso, 0 = nessun "migliore" */
export const ROWS = [
  { g: 'Rendimento' },
  { k: 'lordo', l: 'Rendimento atteso lordo, media annua', d: 1, f: 'pct2', term: 'rendimento-atteso' },
  { k: 'netto', l: 'Rendimento atteso netto dei costi', d: 1, f: 'pct2', term: 'rendimento-atteso' },
  { k: 'cagr', l: 'CAGR netto stimato (R − σ²/2)', d: 1, f: 'pct2', term: 'cagr' },
  { g: 'Costi e rischio' },
  { k: 'ter', l: 'TER ponderato', d: -1, f: 'ter', term: 'ter' },
  { k: 'vol', l: 'Volatilità annua (σ)', d: -1, f: 'pct1', term: 'volatilita' },
  { k: 'sharpe', l: 'Sharpe ratio (Rf = 2,5%)', d: 1, f: 'num2', term: 'sharpe' },
  { g: 'Esposizioni' },
  { k: 'usa', l: 'Esposizione diretta USA', d: 0, f: 'pct0', term: 'esposizione-usa' },
  { k: 'fx', l: 'Cambio non coperto', d: 0, f: 'fx', term: 'rischio-cambio' }
];

/* ritorna {t, sub, nd} per una cella (riga r, portafoglio p, metriche effettive e) */
export function cell(r, p, e) {
  const v = e.m[r.k];
  if (v === null || v === undefined || Number.isNaN(v)) return { t: 'n.d.', nd: true };
  const calc = e.src[r.k] === 'calcolato';
  let t = '', sub = null;
  switch (r.f) {
    case 'pct2': t = it(v, 2) + '%'; break;
    case 'pct1': t = it(v, 1) + '%'; sub = p.volSub || null; break;
    case 'pct0': t = (p.usaPre || '') + Math.round(v) + '%'; sub = p.usaPre ? 'indiretto, stima' : null; break;
    case 'num2': t = it(v, 2); break;
    case 'ter': t = it(v, p.terDp || (e.src.ter ? 2 : 2)) + '%'; sub = p.terNote || (e.calc.terPartial && calc ? 'parziale: TER mancante' : null); break;
    case 'fx': t = (p.fxPre || '') + Math.round(v) + '%'; sub = p.fxSub || null; break;
    default: t = String(v);
  }
  if (calc) sub = sub ? sub + ' · calcolato' : 'calcolato';
  return { t, sub };
}

/* valore numerico di una metrica per ordinare/graduare */
export function metricValue(p, k) { const e = effectiveMetrics(p); const v = e.m[k]; return v === null || v === undefined ? null : v; }

export function bestOf(r, vals) {
  if (r.d === 0) return null;
  const nums = vals.filter(v => v !== null && v !== undefined);
  if (nums.length < 2) return null;
  return r.d > 0 ? Math.max(...nums) : Math.min(...nums);
}

export const fmtPct = (v, dp = 2) => pct(v, dp);
