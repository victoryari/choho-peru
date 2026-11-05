/**
 * Migracion de estilos a tokens.
 *
 * Contexto: `src/index.css` defines 10 variables que ningun componente
 * consumia; en su lugar habia 1414 hex literales y 2150 utilidades de la
 * paleta cruda de Tailwind, mas 1211 modificadores `dark:` escritos a mano.
 *
 *Este script:
 *   1. mapea hex literales -> utilidades semanticas (bg-surface, text-ink...)
 *   2. mapea la paleta cruda de Tailwind -> los mismos tokens
 *   3. sube el texto por debajo de 12px a la escala legible
 *   4. elimina el modificador `dark:` cuando el token ya cambia solo
 *
 * Es idempotente: aplicarlo dos veces no produce cambios adicionales.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/* ------------------------------------------------------------------ */
/* 1. Hex literales -> tokens                                          */
/* ------------------------------------------------------------------ */
const HEX = {
  '#4D4DFF': { text: 'brand-fg', bg: 'brand', border: 'brand', ring: 'brand', from: 'brand', via: 'brand', to: 'brand', divide: 'brand', outline: 'brand', shadow: 'brand', fill: 'brand', stroke: 'brand', accent: 'brand' },
  '#F7F8FC': { bg: 'surface-2', fill: 'surface-2' },
  '#FFFFFF': { bg: 'surface', fill: 'surface' },
  '#3D3528': { text: 'ink', bg: 'surface-2' },
  '#E5DEC9': { border: 'line' },
  '#7F735F': { text: 'ink-muted' },
  '#F2ECDE': { bg: 'surface-2' },
  '#FAF6ED': { bg: 'surface' },
  '#FDF9F1': { bg: 'surface' },
  '#FFFDF9': { bg: 'surface' },
  '#333333': { text: 'ink' },
  '#E2E8F0': { border: 'line' },
  '#F0F2FA': { bg: 'surface-2' },
  '#D97706': { text: 'warning-fg', bg: 'warning-soft' },
  '#87CEEB': { text: 'info-fg', bg: 'info-soft', shadow: 'info' },
  '#98FB98': { bg: 'success-soft' },
  '#FFB6C1': { text: 'danger-fg', bg: 'danger-soft', border: 'danger' },
  '#10B981': { text: 'success-fg', bg: 'success-soft' },
  '#DCD0FF': { bg: 'brand-soft', border: 'brand' },
  '#0A0A0A': { text: 'ink', bg: 'canvas' },
  '#3E3E3A': { border: 'line-strong' },
  '#EEEEEC': { bg: 'surface-2', border: 'line' },
  '#FFD7A0': { bg: 'warning-soft' },
  '#E6E6FA': { bg: 'brand-soft' },
  '#B45309': { text: 'warning-fg', bg: 'warning-soft' },
  '#2B261D': { from: 'surface-2', to: 'surface-2', bg: 'surface-2' },
};

/* ------------------------------------------------------------------ */
/* 2. Paleta cruda de Tailwind -> tokens                               */
/* ------------------------------------------------------------------ */
const PAL = {
  // --- neutros ---
  'text-slate-900': 'text-ink', 'text-slate-800': 'text-ink', 'text-slate-700': 'text-ink',
  'text-slate-600': 'text-ink-muted', 'text-slate-500': 'text-ink-muted',
  'text-slate-400': 'text-ink-subtle', 'text-slate-300': 'text-ink-subtle',
  'hover:text-slate-900': 'hover:text-ink',
  'bg-white': 'bg-surface',
  'bg-slate-50': 'bg-surface-2', 'bg-slate-100': 'bg-surface-2',
  'hover:bg-slate-100': 'hover:bg-field-hover', 'hover:bg-slate-200': 'hover:bg-field-hover',
  'dark:hover:bg-slate-700': 'hover:bg-field-hover',
  'bg-slate-200': 'bg-line',
  'bg-slate-800': 'bg-ink-muted',
  'bg-slate-800/20': 'bg-ink/10',
  'bg-slate-900': 'bg-ink',
  'bg-slate-900/60': 'bg-ink/60',
  'bg-slate-50/50': 'bg-surface-2/50',
  'border-slate-100': 'border-line', 'border-slate-200': 'border-line',
  'border-slate-50': 'border-line', 'border-slate-100/50': 'border-line/50',
  'border-slate-300': 'border-line-strong', 'border-slate-800': 'border-line-strong',
  'dark:border-slate-50': 'border-line',
  'text-slate-200': 'text-ink',
  'placeholder-slate-400': 'placeholder:text-ink-subtle',
  'placeholder-slate-500': 'placeholder:text-ink-subtle',

  // --- exito ---
  'text-emerald-600': 'text-success-fg', 'text-emerald-700': 'text-success-fg',
  'text-emerald-500': 'text-success-fg', 'dark:text-emerald-400': 'text-success-fg',
  'bg-emerald-50': 'bg-success-soft', 'bg-emerald-100': 'bg-success-soft',
  'bg-emerald-500': 'bg-success',
  'bg-emerald-950': 'bg-success-soft', 'bg-emerald-950/20': 'bg-success-soft',
  'bg-emerald-950/30': 'bg-success-soft', 'bg-emerald-950/40': 'bg-success-soft',
  'border-emerald-100': 'border-success/30',
  'border-emerald-200': 'border-success/30', 'border-emerald-300': 'border-success/30',
  'border-emerald-500': 'border-success/30', 'border-emerald-900/50': 'border-success/30',
  'dark:border-emerald-800': 'border-success/30',

  // --- peligro ---
  'text-red-600': 'text-danger-fg', 'text-red-500': 'text-danger-fg',
  'text-red-700': 'text-danger-fg', 'text-rose-700': 'text-danger-fg',
  'text-rose-600': 'text-danger-fg',
  'bg-red-50': 'bg-danger-soft', 'bg-rose-50': 'bg-danger-soft',
  'bg-red-100': 'bg-danger-soft', 'bg-red-500': 'bg-danger',
  'bg-red-950': 'bg-danger-soft', 'bg-red-950/20': 'bg-danger-soft',
  'bg-red-950/30': 'bg-danger-soft', 'bg-red-950/40': 'bg-danger-soft',
  'bg-red-950/60': 'bg-danger-soft',
  'border-red-200': 'border-danger/30', 'border-red-300': 'border-danger/30',
  'border-red-100': 'border-danger/30', 'border-red-900/50': 'border-danger/30',
  'border-red-800': 'border-danger/30', 'dark:border-red-800': 'border-danger/30',

  // --- advertencia ---
  'text-amber-600': 'text-warning-fg', 'text-amber-700': 'text-warning-fg',
  'dark:text-amber-400': 'text-warning-fg',
  'bg-amber-50': 'bg-warning-soft', 'bg-amber-100': 'bg-warning-soft',
  'border-amber-200': 'border-warning/30', 'border-amber-300': 'border-warning/30',

  // Familia de marca. `dark:text-blue-500` (76 usos) era el indigo aclarado a
  // mano para modo oscuro; el token `brand-fg` lo resuelve correctamente.
  'text-blue-600': 'text-brand-fg', 'text-blue-500': 'text-brand-fg',
  'dark:text-blue-500': 'text-brand-fg',
  'text-purple-600': 'text-brand-fg', 'text-purple-500': 'text-brand-fg',
  'text-purple-700': 'text-brand-fg',
  'bg-purple-50': 'bg-brand-soft', 'bg-purple-100': 'bg-brand-soft',
  'bg-blue-600': 'bg-brand', 'bg-blue-500': 'bg-brand',
  'bg-indigo-600': 'bg-brand', 'bg-indigo-500': 'bg-brand',
  'hover:bg-blue-600': 'hover:bg-brand/90', 'hover:bg-blue-700': 'hover:bg-brand/90',
  // Cian e indigo quedaron como adoption provisional de la marca antes de que
  // existiera `--brand-fg`. El estado activo del dock movil salia cian.
  'text-cyan-400': 'text-brand-fg', 'text-cyan-300': 'text-brand-fg',
  'text-indigo-600': 'text-brand-fg', 'text-indigo-700': 'text-brand-fg',
  'text-indigo-500': 'text-brand-fg',
  'bg-cyan-600/10': 'bg-brand/10', 'bg-cyan-400/10': 'bg-brand/10',
  'border-cyan-400': 'border-brand', 'border-cyan-500': 'border-brand',
};

const VARIANTS = [
  'dark', 'hover', 'focus', 'focus-visible', 'active', 'disabled', 'group-hover',
  'group-focus', 'peer-focus', 'first', 'last', 'odd', 'even', 'sm', 'md',
  'lg', 'xl', '2xl', 'print', 'motion-safe', 'motion-reduce',
];

/**
 * Sin esto, `dark:bg-emerald-950/30` no encuentra su clave base
 * `bg-emerald-950/30` y se queda sin migrar: habria 342 modificadores `dark:`
 * colgados. Las claves que ya traen variante tienen prioridad.
 */
for (const [key, val] of Object.entries(PAL)) {
  if (key.includes(':')) continue;
  for (const v of VARIANTS) {
    const variantKey = `${v}:${key}`;
    if (!(variantKey in PAL)) PAL[variantKey] = `${v}:${val}`;
  }
}

/* ------------------------------------------------------------------ */
/* 3. Escala tipografica: nada por debajo de 11px, cuerpo >= 12px        */
/* ------------------------------------------------------------------ */
const TYPE = {
  '7.5px': 'text-micro', '8px': 'text-micro', '8.5px': 'text-micro',
  '9px': 'text-micro', '9.5px': 'text-micro',
  '10px': 'text-xs', '11px': 'text-xs',
  '13px': 'text-sm',
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

/** Divide una clase en variantes + base, respetando `[]` y `()`. */
function splitVariants(u) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < u.length; i++) {
    const c = u[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) {
      parts.push(u.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(u.slice(start));
  return [parts.slice(0, -1), parts[parts.length - 1]];
}

/** `bg-[#4D4DFF]/30` -> { prop:'bg', value:'#4D4DFF', op:'/30' } */
function parseArbitrary(base) {
  const m = base.match(/^([a-z-]+)-\[([^\]]*)\](\/[0-9]{1,3})?$/);
  if (!m) return null;
  return { prop: m[1], value: m[2], op: m[3] ?? '' };
}

const STATS = { hex: 0, pal: 0, type: 0, dark: 0, dup: 0 };

function mapUtility(util) {
  let out = util;

  // --- hex arbitrarios ---
  const arb = parseArbitrary(splitVariants(util)[1]);
  if (arb && arb.value.startsWith('#')) {
    const entry = HEX[arb.value.toUpperCase()];
    if (entry) {
      const token = entry[arb.prop];
      if (token) {
        const [variants] = splitVariants(util);
        out = [...variants, `${arb.prop}-${token}${arb.op}`].join(':');
        STATS.hex++;
      }
    }
  }

  // --- paleta cruda de Tailwind ---
  const key = out;
  if (PAL[key]) {
    STATS.pal++;
    return PAL[key];
  }

  // --- tamano de texto arbitrario ---
  const arb2 = parseArbitrary(splitVariants(out)[1]);
  if (arb2 && arb2.prop === 'text' && TYPE[arb2.value]) {
    const [variants] = splitVariants(out);
    STATS.type++;
    return [...variants, TYPE[arb2.value]].join(':');
  }

  return out;
}

/**
 * Colapsa modificadores `dark:` cuyo token ya cambia por tema, y quita
 * duplicados exactos. Se hace por segmento literal del className para no
 * romper las expresiones `${cond ? 'a' : 'b'}` de los template literals.
 *
 * Si nada cambio devuelve el segmento ORIGINAL sin tocar sus espacios: una
 * cadena que no es de clases (p. ej. el template `` `Bearer ${token}` ``) debe
 * salir byte a byte igual, o romperia la cabecera de autenticacion.
 */
function dedupeSegment(seg) {
  const trimmed = seg.trim();
  if (trimmed !== seg) {
    const lead = seg.slice(0, seg.length - seg.trimStart().length);
    const trail = seg.slice(seg.trimEnd().length);
    return lead + dedupeSegment(trimmed) + trail;
  }

  const utils = seg.split(/\s+/).filter(Boolean).map(mapUtility);
  const bare = new Set(utils.filter((u) => !u.includes(':')));
  const out = [];
  const seen = new Set();
  let changed = false;

  for (let i = 0; i < utils.length; i++) {
    const u = utils[i];
    if (u !== seg.split(/\s+/).filter(Boolean)[i]) changed = true;
    if (seen.has(u)) { STATS.dup++; changed = true; continue; }
    const [variants, base] = splitVariants(u);
    if (variants.length === 1 && variants[0] === 'dark' && bare.has(base)) {
      STATS.dark++;
      changed = true;
      continue;
    }
    seen.add(u);
    out.push(u);
  }

  if (!changed) return seg;
  return out.join(' ');
}

/**
 * Mapea las utilidades dentro de las cadenas de un `${...}`.
 * Cubre las ramas de los ternarios (`cond ? 'bg-brand' : 'bg-surface'`), que son
 * la mayor parte de los colores que sobreviven fuera del literal principal.
 * Es seguro porque `dedupeSegment` solo altera cadenas con sintaxis de clase.
 */
function mapStringsInExpr(expr) {
  return expr.replace(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g, (full, q, body) =>
    q + dedupeSegment(body) + q
  );
}

/** Procesa el contenido de un className respetando `${...}`. */
function processClassContent(content) {
  let result = '';
  let buf = '';
  let i = 0;

  while (i < content.length) {
    if (content[i] === '$' && content[i + 1] === '{') {
      result += dedupeSegment(buf);
      buf = '';
      let depth = 1;
      let j = i + 2;
      while (j < content.length && depth > 0) {
        if (content[j] === '{') depth++;
        else if (content[j] === '}') depth--;
        if (depth === 0) break;
        j++;
      }
      result += mapStringsInExpr(content.slice(i, j + 1));
      i = j + 1;
    } else {
      buf += content[i];
      i++;
    }
  }
  result += dedupeSegment(buf);
  return result;
}

/**
 * Escanea todas las cadenas del archivo, no solo los atributos `className`.
 * Hace falta porque hay clases en `containerClassName=` (Catalog,
 * InventoryManager) y en constantes tipo `const selectClase = "..."`.
 * Es seguro: `mapUtility` solo reescribe tokens que existen en los mapas, y un
 * valor de atributo como `fill="#4D4DFF"` no tiene forma de clase y no cambia.
 */
const STRING = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

function migrateFile(text) {
  return text.replace(STRING, (full, q, body) => {
    const next = processClassContent(body);
    return next === body ? full : q + next + q;
  });
}

/* ------------------------------------------------------------------ */
/* Recorrido                                                            */
/* ------------------------------------------------------------------ */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

let changedFiles = 0;
for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  const after = migrateFile(before);
  if (before !== after) {
    writeFileSync(file, after, 'utf8');
    changedFiles++;
    console.log(`  ${file.slice(SRC.length)}`);
  }
}

console.log(`\nArchivos modificados: ${changedFiles}`);
console.log(`  hex -> token      : ${STATS.hex}`);
console.log(`  paleta -> token   : ${STATS.pal}`);
console.log(`  texto < 12px -> xs: ${STATS.type}`);
console.log(`  'dark:' redundante: ${STATS.dark}`);
console.log(`  duplicados fuera : ${STATS.dup}`);