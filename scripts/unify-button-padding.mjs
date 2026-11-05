/**
 * Quita el padding que sobrescribe a las primitivas.
 * `.btn-primary` ya define `px-4 py-2.5`; los botones que convertidos conservaban
 * su `py-2` / `py-3` original seguian teniendo 3 alturas distintas. El objetivo
 * de la normalizacion es exactamente que todos los botones midan lo mismo.
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

  const after = before.replace(/className="(btn-[a-z-]+)([^"]*)"/g, (full, prim, rest) => {
    const keep = rest
      .split(/\s+/)
      .filter(Boolean)
      .filter((c) => !/^p[xy]-/.test(c))
      .join(' ');
    if (keep === rest.trim()) return full;
    total++;
    return `className="${prim}${keep ? ' ' + keep : ''}"`;
  });

  if (after !== before) writeFileSync(file, after, 'utf8');
}

console.log(`Botones con padding unificado: ${total}`);