/**
 * Inventario de botones sin nombre accesible.
 *
 * Devuelve cada `<button>` cuyo contenido no tiene texto visible (solo iconos)
 * y que ademas lacks `aria-label`. Sirve de entrada para el paso manual: el
 * nombre tiene que describir la accion, no el icono ("Eliminar categoria",
 * no "boton de papelera").
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

let total = 0;

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  for (const m of text.matchAll(/<button\b([\s\S]*?)<\/button>/g)) {
    const openTag = m[0].slice(0, m[0].indexOf('>') + 1);
    const inner = m[0].slice(m[0].indexOf('>') + 1, m[0].lastIndexOf('</button>'));

    if (/aria-label|\btitle=/.test(openTag + inner)) continue;

    const visible = inner
      .replace(/\{[^{}]*\}/g, ' ')   // expresiones: puede contener texto o no
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, '')
      .trim();

    const soloIcono = visible === '';
    const tieneExpresion = /\{[^}]+\}/.test(inner);

    // Un boton cuyo unico contenido es una expresion puede renderizar texto.
    // Solo se marcan los inequivocos: sin texto y sin expresion de texto.
    if (!soloIcono || tieneExpresion) continue;

    const line = text.slice(0, m.index).split('\n').length;
    const icons = [...inner.matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((x) => x[1]);
    const cls = (openTag.match(/className=[\{"`]+([^"`}]*)/) || [, ''])[1];

    console.log(`  ${file.slice(SRC.length)}:${line}`);
    console.log(`      iconos: ${icons.join(', ') || '(ninguno)'}`);
    console.log(`      clase : ${cls.slice(0, 90)}`);
    total++;
  }
}

console.log(`\nBotones sin nombre accesible (inequivocos): ${total}`);
