/**
 * Correccion semantica puntual.
 *
 * `dark:text-blue-500` (76 usos) era el indigo aclarado a mano para el modo
 * oscuro. Al mapearlo al token `brand-fg` se_WORD_ aparecio brand-fg dentro de
 * contextos de peligro, donde antes el color era rojo. Este script devuelve
 * el rojo a esos elementos:
 *   - si ya hay `text-danger-fg`, `text-brand-fg` se elimina (ganaba el azul)
 *   - si no, `text-brand-fg` pasa a ser `text-danger-fg`
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

let fixedLines = 0;
let fixedFiles = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  let hits = 0;

  const after = before
    .split('\n')
    .map((line) => {
      if (!line.includes('danger') || !line.includes('text-brand-fg')) return line;
      hits++;
      if (line.includes('text-danger-fg')) {
        // El token de marca ganaba al rojo por orden en la hoja de estilos.
        return line.replace(/\s*text-brand-fg\b/g, '').replace(/ {2,}/g, ' ');
      }
      return line.replace(/\btext-brand-fg\b/g, 'text-danger-fg');
    })
    .join('\n');

  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    fixedLines += hits;
    fixedFiles++;
    console.log(`  ${file.slice(SRC.length)}  (${hits})`);
  }
}

console.log(`\nLineas corregidas: ${fixedLines} en ${fixedFiles} archivos`);