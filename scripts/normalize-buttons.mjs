/**
 * Normaliza botones a las primitivas de index.css.
 *
 * Antes habia 5 alturas distintas (py-1.5 / py-2 / py-2.5 / py-3 / py-3.5) y 10
 * combinaciones de padding. Este script solo toca los botones cuya clase
 * corresponde a una variante clara; el resto se deja como esta para no
 * arriesgar el layout de componentes complexes.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/** [expresion regular que debe coincidir, utilidad de la primitiva] */
const RULES = [
  // Primario: fondo de marca + texto blanco, sin borde ni tono de estado.
  [/\bbg-brand\b(?![^\s]*\/)(?=[^\s]*\btext-white\b)|(?=[^\s]*\bbg-brand\b)(?=[^\s]*\btext-brand-contrast\b)/, 'btn-primary'],
  // Primario con opacidad de hover incluida: mismo patron.
  [/^(?=.*\bbg-brand\b)(?=.*\bhover:bg-brand\/)(?=.*\btext-white\b)/, 'btn-primary'],
  // Secundario: superficie + tinta.
  [/^(?=.*\bbg-surface-2\b)(?=.*\btext-ink\b)(?=.*\bborder-line\b)/, 'btn-secondary'],
  [/^(?=.*\bbg-surface\b)(?=.*\btext-ink\b)(?=.*\bborder-line\b)/, 'btn-secondary'],
  // Destructivo.
  [/^(?=.*\bbg-danger\b)(?=.*\btext-white\b)/, 'btn-danger'],
  [/^(?=.*\bbg-danger-soft\b)(?=.*\btext-danger-fg\b)/, 'btn-danger-ghost'],
];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

let total = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  let hits = 0;

  const after = before.replace(
    /<button\b([^>]*?)className=\{?["`]([^"`]*)["`]?([^>]*?)>/g,
    (full, pre, cls, post) => {
      const rule = RULES.find(([re]) => re.test(cls));
      if (!rule) return full;
      const prim = rule[1];

      // No perder utilidades de layout (w-full, flex-1) ni de estado.
      const keep = cls
        .split(/\s+/)
        .filter(Boolean)
        .filter((c) =>
          /^(w-|h-|flex-1|shrink-0|grow|order-|col-|row-|m[trblxy]?-|p[trblxy]?-|gap-|hidden|sm:|md:|lg:|xl:|disabled:)/.test(c)
        );

      const next = [prim, ...new Set(keep)].join(' ');
      hits++;
      return `<button${pre}className="${next}"${post}>`;
    }
  );

  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    total += hits;
    console.log(`  ${file.slice(SRC.length)}  (${hits})`);
  }
}

console.log(`\nBotones convertidos a primitivas: ${total}`);