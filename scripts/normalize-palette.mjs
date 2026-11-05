/**
 * Normalizacion final de la paleta cruda de Tailwind por familia.
 *
 * Los codemods anteriores usaban una tabla de claves exactas, asi que las
 * sombras menos frecuentes se quedaron fuera: 257 utilidades del tipo
 * `text-emerald-400`, `dark:bg-amber-950/30`, `border-slate-200/60`.
 *
 * En vez de seguir enumerando, aqui se decide por FAMILIA y sombra:
 *
 *   - `bg-*` con sombra >= 500  -> relleno solido del token (`bg-success`)
 *   - `bg-*` con sombra <= 200  -> tinte de fondo (`bg-success-soft`)
 *   - `text-*` de cualquier sombra -> el token de texto (`text-success-fg`),
 *     porque el token ya se invierte entre temas y por eso no hace falta
 *     distinguir el tono claro del oscuro
 *   - `border-*` sombra >= 500 -> borde solido; < 500 -> borde atenuado
 *   - `fill-*` / `stroke-*` / `from-*` / `via-*` / `to-*` / `divide-*` /
 *     `outline-*` -> relleno correspondiente
 *
 * Anyade ademas el prefijo de variante que ya exista en la utilidad, de modo
 * que `dark:bg-amber-950/30` se convierte en `dark:bg-warning-soft` y luego el
 * paso de deduplicacion lo retira si el token ya cambia solo.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/** familia de Tailwind -> token semantico */
const FAMILY = {
  emerald: 'success', green: 'success',
  red: 'danger', rose: 'danger',
  amber: 'warning', orange: 'warning', yellow: 'warning',
  blue: 'brand', cyan: 'brand', sky: 'brand', indigo: 'brand',
  violet: 'brand', purple: 'brand',
  slate: null, gray: null, zinc: null, neutral: null, stone: null,
};

const UTIL = /((?:[a-z-]+:)*)(text|bg|border|ring|fill|stroke|from|via|to|divide|outline|decoration|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})(\/\d{1,3})?/g;

const STATS = { mapped: 0, dobleOpacidad: 0 };

/**
 * Devuelve el token para una utilidad, o null si no aplica.
 *
 * Regla de opacidad: la del autor gana siempre. Cuando no trae, se usa la
 * atenuacion por defecto de la rama. Nunca se emiten las dos, porque
 * `border-success/60/30` no es una clase valida: el navegador la descarta
 * entera y el borde se queda sin dibujar. Por eso `alpha()` centraliza el
 * criterio en un solo sitio.
 */
function alpha(prop, fallback, authorAlpha) {
  if (authorAlpha) {
    // El autor escribio /NN en la clase original: se respeta su valor.
    STATS.dobleOpacidad += fallback ? 1 : 0;
    return `/${authorAlpha.slice(1)}`;
  }
  return fallback ? `/${fallback}` : '';
}

function resolve(variants, prop, family, shade, opacity) {
  const token = FAMILY[family];
  if (!token) return null; // neutros: los maneja la tabla por clave exacta
  const n = parseInt(shade, 10);

  switch (prop) {
    case 'text':
      return `${variants}text-${token}-fg${alpha(prop, 0, opacity)}`;
    case 'bg':
      if (n >= 500) return `${variants}bg-${token}${alpha(prop, 0, opacity)}`;
      if (n >= 300) return `${variants}bg-${token}${alpha(prop, 30, opacity)}`;
      return `${variants}bg-${token}-soft${alpha(prop, 0, opacity)}`;
    case 'border':
      return n >= 500
        ? `${variants}border-${token}${alpha(prop, 60, opacity)}`
        : `${variants}border-${token}${alpha(prop, 30, opacity)}`;
    case 'ring':
    case 'outline':
      return `${variants}${prop}-${token}${alpha(prop, 30, opacity)}`;
    case 'fill':
    case 'stroke':
    case 'from':
    case 'via':
    case 'to':
    case 'divide':
    case 'decoration':
    case 'accent':
    case 'caret':
      return `${variants}${prop}-${token}${alpha(prop, 0, opacity)}`;
    default:
      return null;
  }
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

let files = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');

  const after = before.replace(UTIL, (full, variants, prop, family, shade, opacity) => {
    const token = resolve(variants, prop, family, shade, opacity);
    if (!token) return full;
    STATS.mapped++;
    return token;
  });

  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    files++;
    console.log(`  ${file.slice(SRC.length)}`);
  }
}

console.log(`\nArchivos: ${files}`);
console.log(`Utilidades de paleta normalizadas por familia: ${STATS.mapped}`);
console.log(`  con opacidad del autor respetada: ${STATS.dobleOpacidad}`);
