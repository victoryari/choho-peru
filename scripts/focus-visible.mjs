/**
 * `focus:ring-*` -> `focus-visible:ring-*`
 *
 * Con `focus:` el anillo de foco aparece tambien al pulsar con el raton, que
 * es ruido visual en botones y tarjetas. `focus-visible:` lo muestra solo
 * cuando el foco llega por teclado, que es cuando sirve de guia de navegacion.
 * Hay un `:focus-visible` global en index.css como red de seguridad, asi que
 * esto es la primera capa, no la unica.
 *
 * Solo se tocan las utilidades de anillo y contorno; `focus:bg-*`,
 * `focus:border-*` y `focus:opacity-*` deben seguir reacting al foco real.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

/** `focus:ring-2` | `focus:ring-offset-2` | `focus:outline-none` | `focus:ring-brand/20` */
const RING = /\bfocus:(ring(?:-offset)?-[^\s"`']+|outline-none)\b/g;

let total = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(RING, (m) => {
    total++;
    return m.replace('focus:', 'focus-visible:');
  });
  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    console.log(`  ${file.slice(SRC.length)}`);
  }
}

console.log(`\nUtilidades de anillo con focus-visible: ${total}`);
