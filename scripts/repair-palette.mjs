/**
 * Reparacion de los danos que dejo el normalizador de paleta.
 *
 * Todos los cambios son acotados y con un criterio explicito. Se procesa cada
 * cadena de `className` segmento a segmento, partiendo en `${...}` y respetando
 * el espacio inicial y final byte a byte, porque reconstruir una cadena sin
 * cuidado ya rompio dos veces texto de la interfaz.
 *
 * 1. `/A/B` -> un solo valor.
 *    El normalizador emitia su atenuacion por defecto (`/30` en sombra baja,
 *    `/60` en alta) delante de la que habia escrito el autor, produciendo
 *    `border-success/60/30`. Esa clase no existe: el navegador la descarta y el
 *    borde no se dibuja. La opaciodad del autor es la que se conserva, y se
 *    reconoce porque no es una de las dos por defecto.
 *
 * 2. `text-white` sobre relleno de tinta -> `text-ink-inverse`.
 *    `--ink` es casi blanco en oscuro, asi que `bg-ink` + `text-white` deja
 *    texto blanco sobre blanco. `--ink-inverse` ya existe y se invierte por
 *    tema, que es justo lo que necesita un panel invertido.
 *
 * 3. `text-white` sobre degradado de superficie -> `text-ink`.
 *    Mismo fallo en los banners de DiscountManager: degradado `--surface-2`
 *    con el texto del encabezado en blanco.
 *
 * 4. `hover:text-white` sin guarda `dark:` -> `hover:text-ink`.
 *    En claro, `hover:text-white` pone el texto blanco sobre fondo claro. Solo
 *    se toca cuando el elemento no es un panel invertido (no lleva `text-white`)
 *    y no tiene ya su propia variante oscura.
 *
 * 5. `hover:text-ink dark:hover:text-white` -> `hover:text-ink`.
 *    `--ink` ya es la tinta mas fuerte en ambos temas; la variante oscura solo
 *    anade ruido.
 *
 * 6. `bg-brand` + `text-white` -> `text-brand-contrast`.
 *    Mismo color, pero deja de depender de la palabra `white`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const STATS = {};
const cuenta = (k) => (STATS[k] = (STATS[k] ?? 0) + 1);

/** Atenuaciones por defecto del normalizador; las que este puede haber colado. */
const MIOS = new Set(['30', '60']);

const UTIL = '(text|bg|border|ring|shadow|fill|stroke|from|via|to|divide|outline|decoration|accent|caret)-';
const DOBLE = new RegExp(`\\b(${UTIL}[a-z0-9-]+)/(\\d{1,3})/(\\d{1,3})\\b`, 'g');
const SOMBRA_CRUDA = /\bshadow-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})(\/\d{1,3})?/g;
const SOMBRA_TOKEN = { emerald: 'success', green: 'success', red: 'danger', rose: 'danger', amber: 'warning', orange: 'warning', yellow: 'warning', blue: 'brand', cyan: 'brand', sky: 'brand', indigo: 'brand', violet: 'brand', purple: 'brand' };

/** Una sola opacidad: la del autor, que no es una de las mias por defecto. */
function colapsar(_full, clase, a, b) {
  let alpha;
  if (a === b) alpha = a;
  else if (MIOS.has(a)) alpha = b;
  else if (MIOS.has(b)) alpha = a;
  else alpha = a;
  cuenta('doble opacidad');
  return `${clase}/${alpha}`;
}

function repararSegmento(seg) {
  const original = seg;
  const recorte = seg.trim();
  if (recorte === '') return seg;
  if (recorte !== seg) {
    const lead = seg.slice(0, seg.length - seg.trimStart().length);
    const trail = seg.slice(seg.trimEnd().length);
    return lead + repararSegmento(recorte) + trail;
  }

  let u = seg.replace(DOBLE, colapsar);
  u = u.replace(SOMBRA_CRUDA, (full, fam, shade, op) => {
    const token = SOMBRA_TOKEN[fam];
    if (!token) return full;
    cuenta('sombra de color crudo');
    return `shadow-${token}${op ?? '/30'}`;
  });

  const clases = u.split(/\s+/);
  const tiene = (re) => clases.some((c) => re.test(c));

  // 2: relleno de tinta con texto blanco.
  if (tiene(/^hover:bg-ink(-muted)?$|^bg-ink(-muted)?$/) && u.includes(' text-white')) {
    u = u.replace(/\btext-white\b/g, 'text-ink-inverse');
    cuenta('texto blanco sobre tinta -> ink-inverse');
  }

  // 3: degradado de superficie con texto blanco.
  if (tiene(/^from-surface(-2)?$/) && u.includes(' text-white')) {
    u = u.replace(/\btext-white\b/g, 'text-ink');
    cuenta('texto blanco sobre degradado de superficie -> ink');
  }

  // 6: relleno de marca con la palabra white.
  if (tiene(/^hover:bg-brand(\/90)?$|^bg-brand$/) && u.includes(' text-white')) {
    u = u.replace(/\btext-white\b/g, 'text-brand-contrast');
    cuenta('texto blanco sobre marca -> brand-contrast');
  }

  // 4: hover a blanco sin guarda oscura.
  if (tiene(/^hover:text-white$/) && !tiene(/^text-white$|^dark:hover:text-white$/)) {
    u = u.replace(/\bhover:text-white\b/g, 'hover:text-ink');
    cuenta('hover a blanco sin guarda -> hover:text-ink');
  }

  // 5: hover a ink con variante oscura redundante.
  if (u.includes('hover:text-ink dark:hover:text-white')) {
    u = u.replace(/\bhover:text-ink dark:hover:text-white\b/g, 'hover:text-ink');
    cuenta('variante oscura de hover redundante');
  }

  return u === original ? seg : u;
}

/** Recorre una cadena separando los huecos que surrounds interpolaciones. */
function porInterpolaciones(content) {
  const D = '$' + '{';
  let salida = '', buf = '', i = 0;
  while (i < content.length) {
    if (content.startsWith(D, i)) {
      salida += repararSegmento(buf); buf = '';
      let depth = 1, j = i + 2;
      while (j < content.length && depth > 0) {
        if (content[j] === '{') depth++;
        else if (content[j] === '}') depth--;
        if (depth === 0) break;
        j++;
      }
      const expr = content.slice(i, j + 1);
      salida += expr.replace(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g,
        (f, q, body) => q + repararSegmento(body) + q);
      i = j + 1;
    } else { buf += content[i]; i++; }
  }
  return salida + repararSegmento(buf);
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

const CADENA = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

let archivos = 0;
for (const file of walk(SRC)) {
  const antes = readFileSync(file, 'utf8');
  const despues = antes.replace(CADENA, (full, q, body) => {
    const next = porInterpolaciones(body);
    return next === body ? full : q + next + q;
  });
  if (despues !== antes) {
    writeFileSync(file, despues, 'utf8');
    archivos++;
    console.log(`  ${file.slice(SRC.length)}`);
  }
}

console.log(`\nArchivos: ${archivos}`);
for (const [k, v] of Object.entries(STATS)) console.log(`  ${k}: ${v}`);
if (Object.keys(STATS).length === 0) console.log('  sin cambios');