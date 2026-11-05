/**
 * Anade `type="button"` a los <button> que no declaran `type`.
 *
 * Un <button> sin `type` vale `submit` por defecto. El proyecto tiene 19
 * formularios y 19 `type="submit"` explicitos, o sea que cada formulario tiene
 * su boton de envio, pero los otros 96 botones (pestanas, toggles de permiso,
 * cerrar modal, iconos) quedan como submit implicito: al pulsarlos se dispara
 * el formulario. No es cosmético, es un fallo de comportamiento.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

let total = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  let hits = 0;

  const after = before.replace(/<button\b([^>]*)>/g, (full, attrs) => {
    if (/\btype\s*=/.test(attrs)) return full;
    hits++;
    return `<button type="button"${attrs}>`;
  });

  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    total += hits;
    console.log(`  ${file.slice(SRC.length)}  (${hits})`);
  }
}

console.log(`\nBotones con type="button" anadido: ${total}`);