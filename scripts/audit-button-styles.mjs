/**
 * Inventario de estilos de boton, para decidir si las primitivas se adopción.
 *
 * Las primitivas `.btn-*` existen en index.css pero solo 14 sitios las usan; el
 * resto de los botones se estiliza con utilidades sueltas. Este script agrupa
 * esas utilidades para ver cuantos patrones distintos quedan y si alguno
 * corresponde de forma obvia a una primitiva que todavia no se usa
 * (`.btn-danger`, `.btn-ghost`, `.btn-secondary`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

/** Clases del boton, normalizando a un patron comparable. */
function firma(clases) {
  return clases
    .filter((c) => !c.startsWith('md:') && !c.startsWith('lg:') && !c.startsWith('sm:'))
    .filter((c) => /^(bg-|text-|border-|rounded|shadow|font-|px-|py-|p-|w-|h-)/.test(c))
    .filter((c) => !/^(w-|h-)\[/.test(c))
    .join(' ');
}

const patrones = new Map();
let total = 0;

for (const file of walk(SRC)) {
  const texto = readFileSync(file, 'utf8').replace(/\n\s*/g, ' ');

  for (const m of texto.matchAll(/<button\b([^>]*)>/g)) {
    const attr = m[1];
    const cm = attr.match(/className\s*=\s*"([^"]*)"/);
    if (!cm) continue;
    total++;
    const f = firma(cm[1].split(/\s+/));
    if (!patrones.has(f)) patrones.set(f, []);
    patrones.get(f).push(file.slice(SRC.length));
  }
}

const filas = [...patrones.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`Botones totales: ${total}`);
console.log(`Patrones de estilo distintos: ${filas.length}\n`);

for (const [f, archivos] of filas.slice(0, 18)) {
  console.log(`  x${String(archivos.length).padStart(3)}  ${f}`);
  console.log(`        ${[...new Set(archivos)].slice(0, 3).join(', ')}`);
}

const exclusivamenteDestructivo = filas.filter(([f]) => /bg-danger|border-danger|text-danger/.test(f) && !/bg-brand/.test(f));
console.log(`\nPatrones solo destructivos (candidatos a .btn-danger): ${exclusivamenteDestructivo.length}, ${exclusivamenteDestructivo.reduce((s, [, a]) => s + a.length, 0)} botones`);
for (const [f, a] of exclusivamenteDestructivo.slice(0, 6)) {
  console.log(`  x${a.length}  ${f}`);
}