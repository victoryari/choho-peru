/**
 * Uso real de las primitivas de index.css dentro de atributos de clase.
 *
 * Contar la palabra suelta no sirve: "label" aparece 256 veces, pero casi todas
 * son `aria-label`, `label=` o `htmlFor=` de un campo, no la clase `.label`.
 * Aqui solo se miran las cadenas que de verdad van en `className`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const PRIMITIVES = [
  'card', 'field', 'label', 'eyebrow', 'btn', 'btn-primary', 'btn-secondary',
  'btn-ghost', 'btn-danger', 'badge', 'glass-panel',
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

/** Clases de un literal de className, sin partir interpolaciones. */
function clasesDe(content) {
  const set = new Set();
  for (const m of content.matchAll(/className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)) {
    const bruto = m[1] ?? m[2] ?? m[3] ?? '';
    // Se corta en cada `${`: lo que hay dentro es una expresion, no una clase.
    for (const trozo of bruto.split('${')) {
      for (const c of trozo.trim().split(/\s+/)) if (c) set.add(c);
    }
  }
  return set;
}

const usos = new Map(PRIMITIVES.map((p) => [p, []]));

for (const file of walk(SRC)) {
  const texto = readFileSync(file, 'utf8');
  const lineas = texto.split('\n');

  // Un className puede empezar en una linea y seguir en la siguiente.
  const joined = texto.replace(/\n\s*/g, ' ');
  for (const c of clasesDe(joined)) {
    if (usos.has(c)) usos.get(c).push(file.slice(SRC.length));
  }
  void lineas;
}

let muertos = 0;
console.log('Primitiva          usos   archivos');
for (const p of PRIMITIVES) {
  const u = usos.get(p);
  const n = u.length;
  if (n === 0) muertos++;
  const archivos = [...new Set(u)];
  console.log(
    `  .${p.padEnd(16)} ${String(n).padStart(4)}   ${archivos.slice(0, 4).join(', ') || '(sin uso)'}`
  );
}
console.log(`\nPrimitivas definidas y nunca usadas: ${muertos} de ${PRIMITIVES.length}`);