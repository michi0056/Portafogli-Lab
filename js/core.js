// Nucleo: formati, classificazione, calcolo delle metriche, stato persistente.
import { SEED } from './seed.js';
import { auth, db, doc, getDoc, setDoc, onSnapshot } from './firebase.js';

export const RF = 2.5; // tasso privo di rischio usato per lo Sharpe (come nel progetto)

/* ---------- formattazione (it-IT) ---------- */
export const it = (v, dp = 2) => (v === null || v === undefined || Number.isNaN(v)) ? 'n.d.' : Number(v).toFixed(dp).replace('.', ',');
export const pct = (v, dp = 2) => (v === null || v === undefined || Number.isNaN(v)) ? 'n.d.' : it(v, dp) + '%';
export const eur = v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const num = s => { if (typeof s === 'number') return s; const v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null; };

/* ---------- classi di attivo ---------- */
export const CLASSES = {
  svil: { label: 'Azionario sviluppato', color: 'var(--k-svil)', grp: 'eq' },
  usa: { label: 'Azionario USA', color: 'var(--k-usa)', grp: 'eq' },
  glob: { label: 'Azionario globale', color: 'var(--k-glob)', grp: 'eq' },
  em: { label: 'Mercati emergenti', color: 'var(--k-em)', grp: 'eq' },
  small: { label: 'Small cap', color: 'var(--k-small)', grp: 'eq' },
  single: { label: 'Azioni singole', color: 'var(--k-single)', grp: 'st' },
  bond: { label: 'Obbligazionario', color: 'var(--k-bond)', grp: 'bd' },
  gold: { label: 'Oro e metalli', color: 'var(--k-gold)', grp: 'au' },
  cash: { label: 'Liquidità', color: 'var(--k-cash)', grp: 'ca' }
};

export function classify(h) {
  const n = (h.n || '').toLowerCase();
  if (h.isin === false || /liquidit|cash|contanti/.test(n)) return 'cash';
  if (/\boro\b|gold|metalli prez/.test(n)) return 'gold';
  if (/bond|obbligaz|btp|bund|govern|treasur|titoli di stato|corporate/.test(n)) return 'bond';
  if (/small cap|small-cap|smallcap/.test(n)) return 'small';
  if (/emergent|\bem\b|eimi|msci em|sema/.test(n)) return 'em';
  if (/s&p ?500|msci usa|nasdaq|\busa\b|cspx|iusa|covered call/.test(n)) return 'usa';
  if (/world|all-world|all world|acwi|globale|global/.test(n)) return 'glob';
  if (/etf|ucits|msci|ftse|stoxx|emu|europe|pacific|sviluppat|index/.test(n)) return 'svil';
  return 'single';
}

/* ---------- dati noti per ISIN: rendimento atteso, volatilità, quota USA (stime del progetto) ---------- */
export const KNOWN = {
  IE00B4L5Y983: { t: 0.2, r: 7.7, s: 16, usa: 71, cls: 'glob' },
  IE00BKM4GZ66: { t: 0.18, r: 8.1, s: 17.6, usa: 0, cls: 'em' },
  IE00BK5BQT80: { t: 0.14, r: 7.7, s: 16, usa: 60.5, cls: 'glob' },
  IE0003XJA0J9: { t: 0.07, r: 7.7, s: 16, usa: 60, cls: 'glob' },
  IE00BF4RFH31: { t: 0.35, r: 9.3, s: 19, usa: 59.1, cls: 'small' },
  IE00B4ND3602: { t: 0.12, r: 5.8, s: 15, usa: 0, cls: 'gold' },
  IE00B5BMR087: { r: 7.6, s: 15.9, usa: 100, cls: 'usa' },
  IE0031442068: { r: 7.6, s: 15.9, usa: 100, cls: 'usa' },
  IE0002L5QB31: { r: 6.0, s: 12, usa: 100, cls: 'usa' },
  IE00B4L5YC18: { t: 0.18, r: 8.1, s: 17.6, usa: 0, cls: 'em' },
  JE00BN2CJ301: { t: 0.12, r: 5.8, s: 15, usa: 0, cls: 'gold' },
  IE000T9EOCL3: { r: 9.3, s: 19, usa: 60.4, cls: 'small' },
  LU0378818131: { t: 0.25, r: 3.0, s: 5, usa: 47, cls: 'bond' },
  IT0003796171: { r: 6.7, s: 28, usa: 0, cls: 'single' },
  US5324571083: { r: 4.6, s: 35, usa: 100, cls: 'single' },
  US67066G1040: { r: 12.4, s: 45, usa: 100, cls: 'single' },
  KYG9830T1067: { r: 9.8, s: 53, usa: 0, cls: 'single' },
  IT0001233417: { r: 5.6, s: 21, usa: 0, cls: 'single' },
  /* titoli e ETF dei portafogli rivisti (rendimenti ricavati dal documento di revisione: ETF con stime BNY, resto con CAPM) */
  IE00BMC38736: { t: 0.35, r: 10.8, s: 30, usa: 74, cls: 'usa' },     // VanEck Semiconductor
  IE00B53SZB19: { t: 0.3, r: 8.6, s: 20, usa: 95.5, cls: 'usa' },    // iShares Nasdaq 100
  US69608A1088: { r: 15.0, s: 55, usa: 100, cls: 'single' }, // Palantir
  US88160R1014: { r: 12.9, s: 55, usa: 100, cls: 'single' }, // Tesla
  LU0950668870: { t: 0.09, r: 6.9, s: 17, usa: 0, cls: 'svil' },      // UBS Core MSCI EMU
  LU1681045370: { t: 0.2, r: 8.1, s: 17.6, usa: 0, cls: 'em' },      // Amundi MSCI EM Swap
  IT0005735201: { t: 0, r: 3.0, s: 5, usa: 0, cls: 'bond' },       // BTP Valore 2031
  IT0005735227: { t: 0, r: 3.0, s: 5, usa: 0, cls: 'bond' }
};

/* valori prudenti per i titoli senza ISIN, riconosciuti dal nome: stime modificabili */
export const NAME_DEFAULTS = [
  { re: /bitcoin|btc|cripto|crypto/i, r: 12.9, s: 60, usa: 0, cls: 'single' },
  { re: /btp|titoli di stato|bund/i, r: 3.2, s: 6, usa: 0, cls: 'bond' },
  { re: /obbligazion.*(em|emergent)|em .*hard|hard currency/i, r: 5.5, s: 9, usa: 0, cls: 'bond' },
  { re: /obbligaz|bond|governativ/i, r: 3.0, s: 5, usa: 0, cls: 'bond' },
  { re: /\boro\b|gold|metalli/i, r: 5.8, s: 15, usa: 0, cls: 'gold' },
  { re: /small cap/i, r: 9.3, s: 19, usa: 60, cls: 'small' },
  { re: /emergent|\bem\b|msci em/i, r: 8.1, s: 17.6, usa: 0, cls: 'em' },
  { re: /s&p ?500|msci usa|\busa\b|statunitens/i, r: 7.6, s: 15.9, usa: 100, cls: 'usa' },
  { re: /world|all-world|globale|acwi/i, r: 7.7, s: 16, usa: 62, cls: 'glob' },
  { re: /europe|pacific|sviluppat|emu|eurozona/i, r: 6.9, s: 16, usa: 0, cls: 'svil' }
];

export function isFx(h) { // true se il titolo espone a valute diverse dall'euro senza copertura
  const f = (h.fx || '').toLowerCase();
  if (!f) return null;
  if (/nessuno|euro|^eur$|coperto in euro/.test(f) && !/non coperto/.test(f)) return false;
  return true;
}

/* arricchisce un titolo con classe e dati noti, senza sovrascrivere i campi già presenti */
export function enrichHolding(h) {
  const out = { ...h };
  const code = Array.isArray(h.isin) ? (h.isin.find(i => i.c) || {}).c : null;
  const k = code && KNOWN[code];
  if (k) {
    if (out.ter == null && k.t != null) out.ter = k.t;
    if (out.r === undefined || out.r === null) out.r = k.r;
    if (out.s === undefined || out.s === null) out.s = k.s;
    if (out.usa === undefined || out.usa === null) out.usa = k.usa;
    if (!out.cls) out.cls = k.cls;
  }
  if ((out.r == null || out.s == null) && !k) {
    const d = NAME_DEFAULTS.find(x => x.re.test(h.n || ''));
    if (d && !(out.cls === 'single' && d.cls !== 'single' && !/bitcoin|btc/i.test(h.n || ''))) {
      if (out.r == null) out.r = d.r; if (out.s == null) out.s = d.s; if (out.usa == null) out.usa = d.usa; if (!out.cls) out.cls = d.cls;
    }
  }
  if (h.isin === false) { if (out.r == null) out.r = RF; if (out.s == null) out.s = 0; if (out.usa == null) out.usa = 0; }
  if (!out.cls) out.cls = classify(out);
  if (out.r === undefined) out.r = null;
  if (out.s === undefined) out.s = null;
  if (out.usa === undefined) out.usa = null;
  return out;
}

export function holdingKey(h) {
  const code = Array.isArray(h.isin) ? (h.isin.find(i => i.c) || {}).c : null;
  return code || (h.n || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/* ---------- metriche dai titoli ---------- */
export function corr(a, b, rhoEq) {
  const ga = CLASSES[a.cls]?.grp || 'eq', gb = CLASSES[b.cls]?.grp || 'eq';
  const k = [ga, gb].sort().join('-');
  const t = { 'eq-eq': rhoEq, 'st-st': 0.35, 'eq-st': 0.65, 'bd-bd': 0.8, 'bd-eq': 0.15, 'bd-st': 0.1, 'au-eq': 0.1, 'au-st': 0.05, 'au-bd': 0.2, 'au-au': 0.9 };
  return k in t ? t[k] : 0;
}

export function computeMetrics(holdings, rhoEq = 0.9) {
  const hs = holdings.map(enrichHolding);
  const tot = hs.reduce((a, h) => a + (h.w || 0), 0) || 1;
  const w = hs.map(h => (h.w || 0) / tot);
  const known = hs.map(h => h.r !== null && h.s !== null);
  const covW = hs.reduce((a, h, i) => a + (known[i] ? w[i] : 0), 0);
  const res = { lordo: null, ter: null, netto: null, vol: null, cagr: null, sharpe: null, usa: null, fx: null, coverage: covW * 100 };
  const terKnown = hs.every(h => h.ter !== null && h.ter !== undefined);
  res.ter = hs.reduce((a, h, i) => a + w[i] * (h.ter ?? 0), 0);
  if (!terKnown) res.terPartial = true;
  if (covW > 0) {
    const ww = w.map((x, i) => known[i] ? x / covW : 0);
    res.lordo = hs.reduce((a, h, i) => a + ww[i] * (h.r || 0), 0);
    let v = 0;
    for (let i = 0; i < hs.length; i++) for (let j = 0; j < hs.length; j++) {
      if (!known[i] || !known[j]) continue;
      const c = i === j ? 1 : corr(hs[i], hs[j], rhoEq);
      v += ww[i] * ww[j] * hs[i].s * hs[j].s * c;
    }
    res.vol = Math.sqrt(v);
    res.netto = res.lordo - res.ter;
    res.cagr = res.netto - (res.vol * res.vol) / 200;
    res.sharpe = res.vol > 0 ? (res.lordo - RF) / res.vol : null;
  }
  const usaK = hs.filter(h => h.usa !== null);
  if (usaK.length === hs.length) res.usa = hs.reduce((a, h, i) => a + w[i] * h.usa, 0);
  const fxs = hs.map(isFx);
  if (fxs.every(x => x !== null)) res.fx = hs.reduce((a, h, i) => a + (fxs[i] ? w[i] : 0), 0) * 100;
  return res;
}

/* ---------- stato: Firestore (users/{uid}/data/state), con copia locale di riserva ---------- */
export const state = {
  portfolios: [],       // portafogli dell'utente (PDF, combinati, JSON, manuali)
  plans: [null, null, null, null, null], // 5 piani principali: {pid, note, next, review, monthly}
  settings: { rho: 0.9, rf: 2.5 },
  hidden: []            // id dei portafogli di base nascosti dall'utente
};

const listeners = new Set();
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = kind => listeners.forEach(f => f(kind));
let saveTimer = null, serverOk = true, lastJson = '';
export const isServerOk = () => serverOk;

const stateRef = () => doc(db, 'users', auth.currentUser.uid, 'data', 'state');
const serialize = () => JSON.parse(JSON.stringify({ version: 1, portfolios: state.portfolios, plans: state.plans, settings: state.settings, hidden: state.hidden }));
export const backupJson = () => JSON.stringify(serialize(), null, 2);

function applyData(data) {
  state.portfolios = Array.isArray(data.portfolios) ? data.portfolios : [];
  state.plans = Array.isArray(data.plans) ? data.plans.concat([null, null, null, null, null]).slice(0, 5) : [null, null, null, null, null];
  state.settings = { ...state.settings, ...(data.settings || {}) };
  state.hidden = Array.isArray(data.hidden) ? data.hidden : [];
  invalidate();
}

/* legge i dati dal cloud; se non ci riesce usa la copia locale */
export async function loadState() {
  let data = null;
  try { const snap = await getDoc(stateRef()); data = snap.exists() ? snap.data() : null; serverOk = true; }
  catch { serverOk = false; }
  if (!data) { try { data = JSON.parse(localStorage.getItem('pl-state') || 'null'); } catch { data = null; } }
  if (data && data.version) applyData(data);
  lastJson = JSON.stringify(serialize());
}

/* riceve le modifiche fatte dall'altro dispositivo (PC o cellulare) */
export function watchRemote() {
  return onSnapshot(stateRef(), snap => {
    if (!snap.exists() || snap.metadata.hasPendingWrites) return;
    applyData(snap.data());
    const json = JSON.stringify(serialize());
    if (json === lastJson) return;
    lastJson = json;
    notify('remote');
  }, () => { serverOk = false; notify('saved'); });
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const data = serialize(), json = JSON.stringify(data);
    try { localStorage.setItem('pl-state', json); } catch { /* spazio esaurito: resta il cloud */ }
    if (json !== lastJson) {
      lastJson = json;
      try { await setDoc(stateRef(), data); serverOk = true; } catch { serverOk = false; }
    }
    notify('saved');
  }, 250);
}
export function touch() { save(); notify('changed'); }

/* ---------- accesso ai portafogli ---------- */
const PALETTE_N = 16;
export function allPortfolios() {
  const seed = SEED.filter(p => !state.hidden.includes(p.id)).map(p => prep(p));
  const mine = state.portfolios.map(p => prep(p));
  return seed.concat(mine);
}
const cache = new Map();
function prep(p) {
  const key = p.id + '|' + (p._v || 0);
  if (cache.has(p) ) return cache.get(p);
  const q = { ...p };
  q.h = (p.h || []).map(enrichHolding);
  if (!q.c) q.c = '--c' + ((p.ci ?? 0) % PALETTE_N);
  q.l = q.l || q.s || q.n;
  q.s = q.s || q.n;
  q.m = { lordo: null, ter: null, netto: null, vol: null, cagr: null, sharpe: null, usa: null, fx: null, ...(p.m || {}) };
  cache.set(p, q);
  void key;
  return q;
}
export function invalidate() { cache.clear(); }
export const getPortfolio = id => allPortfolios().find(p => p.id === id);

export function nextColorIndex() {
  const used = new Set(state.portfolios.map(p => p.ci));
  for (let i = 12; i < PALETTE_N * 3; i++) if (!used.has(i)) return i;
  return state.portfolios.length + 12;
}

export function addPortfolio(p) {
  p.id = p.id || uid();
  p.ci = p.ci ?? nextColorIndex();
  p.created = p.created || new Date().toISOString();
  state.portfolios.push(p);
  invalidate(); touch();
  return p;
}
export function removePortfolio(id) {
  state.portfolios = state.portfolios.filter(p => p.id !== id);
  state.plans = state.plans.map(x => (x && x.pid === id) ? null : x);
  invalidate(); touch();
}
export function updatePortfolio(id, patch) {
  const p = state.portfolios.find(x => x.id === id);
  if (p) { Object.assign(p, patch); invalidate(); touch(); }
}
export const isMine = id => state.portfolios.some(p => p.id === id);

/* metriche complete di un portafoglio: valori dichiarati, altrimenti calcolati dai titoli */
export function effectiveMetrics(p) {
  const calc = computeMetrics(p.h, state.settings.rho);
  const m = { ...p.m };
  const src = {};
  for (const k of ['lordo', 'ter', 'netto', 'vol', 'cagr', 'sharpe', 'usa', 'fx']) {
    if (m[k] === null || m[k] === undefined) {
      if (calc[k] !== null && calc[k] !== undefined && p.h.length) { m[k] = calc[k]; src[k] = 'calcolato'; }
      else m[k] = null;
    }
  }
  return { m, src, calc };
}

/* proiezione del capitale con versamenti mensili a CAGR costante (stima semplificata) */
export function project({ start, monthly, years, cagr }) {
  const g = Math.pow(1 + cagr / 100, 1 / 12) - 1;
  let cap = start, paid = start;
  const pts = [{ y: 0, cap, paid }];
  for (let m = 1; m <= years * 12; m++) {
    cap = cap * (1 + g) + monthly; paid += monthly;
    if (m % 12 === 0) pts.push({ y: m / 12, cap, paid });
  }
  return pts;
}

/* ---------- 5 piani principali ---------- */
export const planSlot = id => state.plans.findIndex(x => x && x.pid === id);
export function setPlan(i, pid) {
  const old = state.plans[i];
  state.plans[i] = pid ? { pid, note: old?.note || '', next: old?.next || '', review: old?.review || '', monthly: old?.monthly ?? 300 } : null;
  touch();
}
export function addToPlans(pid) {
  if (planSlot(pid) >= 0) return planSlot(pid);
  const i = state.plans.findIndex(x => !x);
  if (i < 0) return -1;
  setPlan(i, pid); return i;
}
export function dueToday(pl) {
  if (!pl) return false;
  const t = new Date().toISOString().slice(0, 10);
  return (pl.next && pl.next <= t) || (pl.review && pl.review <= t);
}

/* ---------- esporta / importa un portafoglio (JSON) ---------- */
export function exportable(p) {
  const m = {}; for (const [k, v] of Object.entries(p.m || {})) if (v !== null && v !== undefined) m[k] = v;
  return {
    format: 'portafogli-lab/1', n: p.n, s: p.s, note: p.note || '', kind: p.kind || null, from: p.from || null, m,
    h: p.h.map(h => ({ n: h.n, w: h.w, isin: h.isin || null, ter: h.ter ?? null, fx: h.fx || '', cls: h.cls, r: h.r ?? null, s: h.s ?? null, usa: h.usa ?? null, info: h.info || undefined }))
  };
}

const NUM_KEYS = ['lordo', 'ter', 'netto', 'vol', 'cagr', 'sharpe', 'usa', 'fx'];
export function normalizeImported(o, origin = 'json') {
  if (!o || typeof o !== 'object' || !Array.isArray(o.h)) return null;
  const h = o.h.map(x => {
    if (!x || typeof x !== 'object') return null;
    let isin = x.isin;
    if (typeof isin === 'string') isin = isin.trim() ? [{ c: isin.trim().toUpperCase() }] : null;
    else if (Array.isArray(isin)) isin = isin.map(i => typeof i === 'string' ? { c: i } : i).filter(Boolean);
    else if (isin !== false) isin = null;
    const n = (x.n ?? x.nome ?? '').toString().trim();
    const w = num(x.w ?? x.peso);
    if (!n || w === null) return null;
    const out = { n, w, isin, ter: x.ter === null || x.ter === undefined || x.ter === '' ? null : num(x.ter), fx: (x.fx || '').toString() };
    for (const k of ['cls', 'r', 's', 'usa', 'info']) if (x[k] !== undefined && x[k] !== null && x[k] !== '') out[k] = x[k];
    return out;
  }).filter(Boolean);
  if (!h.length) return null;
  const m = {}; NUM_KEYS.forEach(k => { const v = o.m ? num(o.m[k]) : null; m[k] = v === undefined ? null : v; });
  const name = (o.n || o.name || 'Portafoglio importato').toString().trim();
  return { n: name, s: (o.s || name).toString().slice(0, 18), note: o.note || '', kind: o.kind || null, from: o.from || null, origin, m, h };
}

export const SEED_IDS = SEED.map(p => ({ id: p.id, n: p.n }));

/* ripristina un backup completo (file scaricato con «Scarica backup») */
export function loadFromBackup(data) {
  applyData(data);
  touch();
}
