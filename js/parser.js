// Lettura dei PDF: estrazione del testo (pdf.js, nel browser) e riconoscimento di titoli, pesi e metriche.
// Il riconoscimento è euristico: il risultato passa sempre da una schermata di revisione modificabile.
import { KNOWN, classify, num } from './core.js';

/* ---------- estrazione testo con pdf.js ---------- */
let pdfjs = null;
async function loadPdfJs() {
  if (pdfjs) return pdfjs;
  pdfjs = await import(new URL('../vendor/pdf.min.mjs', import.meta.url).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.mjs', import.meta.url).href;
  return pdfjs;
}

export async function extractLines(buffer) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim() && it.str !== ' ') continue;
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x, w: it.width || 0, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let s = '', end = null;
      for (const i of r.items) {
        if (end !== null) { const gap = i.x - end; s += gap > 6 ? '   ' : (gap > 0.8 ? ' ' : ''); }
        s += i.s; end = i.x + i.w;
      }
      lines.push(s);
    }
    lines.push('');
  }
  return lines;
}

/* ---------- ISIN ---------- */
export function isValidIsin(code) {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(code)) return false;
  const digits = code.split('').map(c => /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c).join('');
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

const PCT = /(-?\d{1,3}(?:[.,]\d{1,3})?)\s*%/g;
const METRIC_WORDS = /rendiment|volatilit|cagr|sharpe|totale|somma|inflaz|imposta|bollo|rata\b|probabilit|mediana|scenario|capitale|anni\b|correlaz/i;

function pcts(line) {
  const out = []; let m; PCT.lastIndex = 0;
  while ((m = PCT.exec(line))) out.push({ v: num(m[1]), i: m.index, len: m[0].length });
  return out;
}

function cleanName(s) {
  return s.replace(/[|•·▪►●■•]/g, ' ').replace(/^[\s\-–—*\d.)]+(?=[A-Za-z])/, '').replace(/[\s(\[:,;–—-]+(?:ISIN\s*:?\s*)?$/i, '').replace(/[\s(\[:,;–—-]+$/, '').replace(/\s{2,}/g, ' ').trim();
}

function metric(text, res) {
  for (const re of res) { const m = text.match(re); if (m) { const v = num(m[1]); if (v !== null) return v; } }
  return null;
}

function guessFx(h) {
  const code = (h.isin && h.isin[0] && h.isin[0].c) || '';
  const n = h.n.toLowerCase();
  if (/hedged|coperto in euro|eur hedged/.test(n)) return 'coperto in euro';
  if (code.startsWith('IT')) return 'EUR';
  if (h.cls === 'bond' && !code) return '';
  if (['glob', 'usa', 'em', 'small', 'gold', 'svil'].includes(h.cls) && code) return 'non coperto';
  if (h.cls === 'cash') return 'EUR';
  return '';
}

/* ---------- riconoscimento ---------- */
export function parseLines(rawLines, { fileName = '' } = {}) {
  const lines = rawLines.map(l => l.replace(/ /g, ' ').replace(/[−–]/g, m => m === '−' ? '-' : '–').replace(/\s+$/g, ''));
  const text = lines.join('\n');
  const warnings = [];

  /* nome del portafoglio */
  let name = '';
  const titleLine = lines.find(l => /portafoglio|piano|pac\b|allocazione/i.test(l) && l.trim().length > 6 && l.trim().length < 90 && !pcts(l).length);
  const firstLine = lines.find(l => l.trim().length >= 4 && l.trim().length <= 60 && !pcts(l).length && !/\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b/.test(l) && /[A-Za-zÀ-ÿ]{3,}/.test(l));
  name = titleLine ? cleanName(titleLine) : (firstLine ? cleanName(firstLine) : '');
  if (!name) name = fileName.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim();
  if (!name) name = 'Portafoglio da PDF';

  /* metriche dichiarate */
  const m = {
    lordo: metric(text, [/rendimento\s+(?:atteso\s+)?(?:medio\s+)?(?:annuo\s+)?lordo[^0-9\n-]{0,60}(-?\d+(?:[.,]\d+)?)\s*%/i, /rendimento\s+atteso[^0-9\n-]{0,40}(\d+(?:[.,]\d+)?)\s*%/i]),
    netto: metric(text, [/rendimento\s+(?:atteso\s+)?netto[^0-9\n-]{0,60}(-?\d+(?:[.,]\d+)?)\s*%/i]),
    ter: metric(text, [/\bTER\s+(?:ponderato|medio|totale|portafoglio)[^0-9\n]{0,40}(\d+(?:[.,]\d+)?)\s*%/i, /costo\s+(?:medio|annuo)\s+ponderato[^0-9\n]{0,30}(\d+(?:[.,]\d+)?)\s*%/i]),
    vol: metric(text, [/volatilit[aà][^0-9\n-]{0,60}(\d+(?:[.,]\d+)?)\s*%/i, /\bσ\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%/i]),
    cagr: metric(text, [/CAGR[^0-9\n-]{0,60}(-?\d+(?:[.,]\d+)?)\s*%/i]),
    sharpe: metric(text, [/sharpe[^0-9\n-]{0,50}(\d+[.,]\d+)/i]),
    usa: null, fx: null
  };

  /* colonne: ordine peso / TER in una eventuale intestazione */
  let weightFirst = null;
  for (const l of lines) {
    if (/\b(peso|quota|allocazione|%\s*portafoglio)\b/i.test(l) && /\bTER\b/.test(l)) {
      const a = l.search(/\b(peso|quota|allocazione)\b/i), b = l.search(/\bTER\b/);
      weightFirst = a >= 0 && a < b; break;
    }
  }

  const h = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    const ps = pcts(line);
    if (!ps.length) continue;
    const isins = [...line.matchAll(/\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/g)].map(x => x[1]).filter(isValidIsin);
    const isMetricLine = METRIC_WORDS.test(line) && !isins.length;
    if (isMetricLine) continue;

    let weight = null, ter = null;
    const cand = ps.filter(p => p.v !== null && p.v > 0 && p.v <= 100);
    if (!cand.length) continue;
    const terTagged = ps.filter(p => /ter\W{0,4}$/i.test(line.slice(Math.max(0, p.i - 8), p.i)));
    const rest = cand.filter(p => !terTagged.includes(p));
    if (terTagged.length) ter = terTagged[0].v;
    if (rest.length === 1) weight = rest[0].v;
    else if (rest.length >= 2) {
      if (weightFirst === true) { weight = rest[0].v; ter = ter ?? rest[1].v; }
      else if (weightFirst === false) { weight = rest[1].v; ter = ter ?? rest[0].v; }
      else {
        const sorted = [...rest].sort((a, b) => b.v - a.v);
        weight = sorted[0].v; const small = sorted.find(p => p !== sorted[0] && p.v < 1.5); if (small) ter = ter ?? small.v;
      }
    }
    if (weight === null) continue;

    let nm = '';
    const first = ps[0];
    if (isins.length) {
      const pos = line.indexOf(isins[0]);
      nm = cleanName(line.slice(0, Math.min(pos, first.i < pos ? first.i : pos)));
      if (nm.length < 3 && first.i < pos) nm = cleanName(line.slice(first.i + first.len, pos));
      if (nm.length < 3 && idx > 0) nm = cleanName(lines[idx - 1]);
    } else {
      if (first.i < 3) nm = cleanName(line.slice(first.i + first.len)); // "40% Nome"
      else nm = cleanName(line.slice(0, first.i));
      nm = nm.replace(/\.{3,}.*/, '').trim();
      if (!/[A-Za-zÀ-ÿ]{3,}/.test(nm) || nm.length < 4) continue;
      if (nm.length > 140) continue;
    }
    if (/^(totale|somma|peso|strumento|titolo|nome|isin)\b/i.test(nm)) continue;

    const item = { n: nm || (isins[0] || 'Titolo'), w: weight, isin: isins.length ? isins.map(c => ({ c })) : null, ter: ter ?? null, fx: '' };
    if (item.ter == null && isins[0] && KNOWN[isins[0]]?.t != null) item.ter = KNOWN[isins[0]].t;
    item.cls = (isins[0] && KNOWN[isins[0]]?.cls) || classify(item);
    item.fx = guessFx(item);
    h.push(item);
  }

  /* dedup: stesso ISIN (o stesso nome) più volte → tiene la prima occorrenza */
  const seen = new Set(), dedup = [];
  for (const x of h) {
    const k = x.isin ? x.isin[0].c : x.n.toLowerCase();
    if (seen.has(k)) continue; seen.add(k); dedup.push(x);
  }
  const sum = dedup.reduce((a, x) => a + x.w, 0);

  if (!dedup.length) warnings.push('Non ho trovato nessun titolo con un peso percentuale. Puoi aggiungerli a mano nella tabella qui sotto, oppure incollare un JSON.');
  else {
    if (Math.abs(sum - 100) > 0.6) warnings.push(`I pesi sommano ${sum.toFixed(1).replace('.', ',')}%: controlla se manca o è doppia una riga. Puoi normalizzarli a 100% con il pulsante dedicato.`);
    const noIsin = dedup.filter(x => !x.isin).length;
    if (noIsin) warnings.push(`${noIsin} titoli senza ISIN riconosciuto: senza ISIN non posso trovare rendimento e volatilità, quindi le metriche potrebbero essere parziali. Puoi inserire l'ISIN o i valori a mano.`);
  }
  const found = Object.entries(m).filter(([, v]) => v !== null).map(([k]) => k);
  return { name, h: dedup, m, sum, found, warnings, lineCount: lines.filter(l => l.trim()).length };
}


/* ---------- PDF con più portafogli ---------- */
const HEAD = /^\s*(?:[#\d.)\-–]+\s*)?(portafoglio|piano\b|pac\b|mix\b|scenario|allocazione|degiro|tr\s?my|trmy|ideale)/i;

/* Divide il testo in sezioni che iniziano con un titolo (es. "DEGIRO 2", "Portafoglio B") e legge ogni sezione.
   Una sezione con meno di 2 titoli viene unita alla precedente. Se non ne escono almeno 2 valide, legge il PDF come un solo portafoglio. */
export function parseDocument(rawLines, opts = {}) {
  const whole = parseLines(rawLines, opts);
  const heads = [];
  rawLines.forEach((l, i) => {
    const t = l.trim();
    if (t.length >= 4 && t.length <= 80 && !/%/.test(t) && !/\d{2,}[.,]\d/.test(t) && HEAD.test(t)) heads.push(i);
  });
  if (heads.length < 2) return [whole];
  const cuts = [0, ...heads.filter(i => i > 0), rawLines.length];
  const segs = [];
  let carry = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const lines = carry.concat(rawLines.slice(cuts[k], cuts[k + 1]));
    const first = (lines.find(l => l.trim()) || '').trim();
    const n = parseLines(lines, opts).h.length;
    if (n >= 2) { segs.push({ lines, head: HEAD.test(first) ? first : '' }); carry = []; }
    else if (segs.length) { segs[segs.length - 1].lines.push(...lines); carry = []; }
    else carry = lines; // testo iniziale senza titoli: passa alla sezione successiva
  }
  const out = segs.map(sg => {
    const r = parseLines(sg.lines, opts);
    if (sg.head) r.name = cleanName(sg.head) || r.name;
    return r;
  }).filter(r => r.h.length >= 2);
  if (out.length >= 2) return out;
  return [whole];
}
