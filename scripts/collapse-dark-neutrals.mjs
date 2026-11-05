/**
 * Colapsa los `dark:` neutros que quedaron colgando.
 *
 * Tras el mapeo por familia, manyas utilidades quedaron con una mitad clara ya
 * tokenizada y la mitad oscura todavia en paleta cruda:
 *
 *   bg-surface-2 dark:bg-slate-800       hover:bg-surface-2/50 dark:hover:bg-slate-800/20
 *   border-line dark:border-slate-700     text-ink dark:hover:text-slate-100
 *
 * Como el token ya se invierte por tema, la mitad oscura no aporta nada: estorba
 * y ademas ata el componente a una escala que ya no existe en el sistema. Este
 * script retira el `dark:` cuando el token equivalente esta presente sin
 * variante en el mismo elemento.
 *
 * Los neutros se mapean a los tokens de tinta/superficie, no a si mismos, para
 * que el criterio de colapso sea el token y no el nombre de la clase.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/** clase neutra -> token, por propiedad */
const NEUTRAL = {
  text: {
    100: 'text-ink', 200: 'text-ink', 300: 'text-ink-subtle', 400: 'text-ink-subtle',
    500: 'text-ink-muted', 600: 'text-ink-muted', 700: 'text-ink', 800: 'text-ink',
    900: 'text-ink', 950: 'text-ink',
  },
  bg: {
    50: 'bg-surface-2', 100: 'bg-surface-2', 200: 'bg-line', 300: 'bg-line-strong',
    400: 'bg-ink-muted', 500: 'bg-ink-muted', 600: 'bg-ink-muted', 700: 'bg-ink',
    800: 'bg-ink', 900: 'bg-ink', 950: 'bg-canvas',
  },
  border: { 50: 'border-line', 100: 'border-line', 200: 'border-line', 300: 'border-line-strong', 700: 'border-line-strong', 800: 'border-line-strong', 900: 'border-line-strong' },
  divide: { 100: 'divide-line', 200: 'divide-line', 800: 'divide-line-strong' },
  fill: { 900: 'fill-ink', 50: 'fill-ink' },
  stroke: { 700: 'stroke-line-strong', 800: 'stroke-line-strong', 600: 'stroke-line' },
  ring: { 300: 'ring-ink-muted', 700: 'ring-ink' },
  from: { 800: 'from-surface-2', 900: 'from-surface-2', 950: 'from-surface-2' },
  via: { 800: 'via-surface-2', 900: 'via-surface-2' },
  to: { 800: 'to-surface-2', 900: 'to-surface-2', 950: 'to-surface-2' },
};

const UTIL = /((?:[a-z-]+:)*)(text|bg|border|ring|fill|stroke|from|via|to|divide)-(slate|gray|zinc|neutral|stone)-(\d{2,3})(\/\d{1,3})?/g;

/** Divide una clase en variantes + base, respetando `[]` y `()`. */
function splitVariants(u) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < u.length; i++) {
    const c = u[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) { parts.push(u.slice(start, i)); start = i + 1; }
  }
  parts.push(u.slice(start));
  return [parts.slice(0, -1), parts[parts.length - 1]];
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

const STATS = { mapped: 0, dark: 0 };

/** Reescribe una clase suelta, respetando su prefijo de variante. */
function mapOne(cls) {
  const [variants, base] = splitVariants(cls);
  const m = base.match(/^(text|bg|border|ring|fill|stroke|from|via|to|divide)-(slate|gray|zinc|neutral|stone)-(\d{2,3})(\/\d{1,3})?$/);
  if (!m) return cls;
  const [, prop, , shade, opacity] = m;
  const token = NEUTRAL[prop]?.[parseInt(shade, 10)];
  if (!token) return cls;
  STATS.mapped++;
  return [...variants, `${token}${opacity ?? ''}`].join(':');
}

/**
 * Colapsa el segmento y conserva el espacio inicial y final exactos.
 *
 * Sin este cuidado, `` `Bearer ${token}` `` pierde el espacio antes de `${` y
 * el encabezado de autenticacion pasa a ser `Bearer<token>`. Un cambio asi no
 * lo detecta `tsc` (es una cadena en tiempo de ejecucion), asi que la defensa
 * es no reconstruir nunca una cadena que no haya cambiado.
 */
function mapSegment(seg) {
  const trimmed = seg.trim();
  if (trimmed === '') return seg;
  if (trimmed !== seg) {
    const lead = seg.slice(0, seg.length - seg.trimStart().length);
    const trail = seg.slice(seg.trimEnd().length);
    return lead + mapSegment(trimmed) + trail;
  }

  const utils = seg.split(/\s+/).map(mapOne);
  const bare = new Set(utils.filter((u) => !u.includes(':')));
  const seen = new Set();
  const out = [];
  let changed = false;

  for (let i = 0; i < utils.length; i++) {
    const u = utils[i];
    if (u !== seg.split(/\s+/)[i]) changed = true;
    if (seen.has(u)) { changed = true; continue; }
    const [variants, base] = splitVariants(u);
    // `dark:` (o `dark:hover:`, `dark:focus:`) ya no aporta nada si el token
    // equivalente esta presente sin variante.
    const esDark = variants.length >= 1 && variants[0] === 'dark';
    if (esDark && bare.has(base)) { STATS.dark++; changed = true; continue; }
    seen.add(u);
    out.push(u);
  }

  if (!changed) return seg;
  return out.join(' ');
}

/** Escanea cadenas respetando `${...}`. */
function processClassContent(content) {
  let result = '', buf = '', i = 0;
  while (i < content.length) {
    if (content[i] === '$' && content[i + 1] === '{') {
      result += mapSegment(buf); buf = '';
      let depth = 1, j = i + 2;
      while (j < content.length && depth > 0) {
        if (content[j] === '{') depth++;
        else if (content[j] === '}') depth--;
        if (depth === 0) break;
        j++;
      }
      const expr = content.slice(i, j + 1);
      result += expr.replace(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g,
        (f, q, body) => q + mapSegment(body) + q);
      i = j + 1;
    } else { buf += content[i]; i++; }
  }
  result += mapSegment(buf);
  return result;
}

const STRING = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

let files = 0;
for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(STRING, (full, q, body) => {
    const next = processClassContent(body);
    return next === body ? full : q + next + q;
  });
  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    files++;
    console.log(`  ${file.slice(SRC.length)}`);
  }
}

console.log(`\nArchivos: ${files}`);
console.log(`  neutros -> token    : ${STATS.mapped}`);
console.log(`  'dark:' colapsados  : ${STATS.dark}`);
