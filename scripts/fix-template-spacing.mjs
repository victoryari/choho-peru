/**
 * Repara el espacio perdido antes de `${...}` en los className concatenados.
 *
 * `collapse-dark-neutrals.mjs` en su primera version reconstruia cada segmento
 * de clase con `.join(' ')`, lo que se comia el espacio final antes de una
 * interpolacion. En un template literal eso concatena dos clases sin
 * separador: `rounded-full` + `bg-success-soft/30` ->
 * `rounded-fullbg-success-soft/30`, una clase que no existe y por tanto
 * invisible. `tsc` no lo detecta porque sigue siendo un string valido.
 *
 * Se procesa linea a linea porque en JSX el atributo y su contenido suelen
 * estar en lineas distintas (`className={` en una, contenido en la siguiente),
 * de modo que hay que arrastrar el estado "estamos dentro de un className" de
 * una linea a la siguiente. El estado se reinicia en cuanto se cierra el
 * template literal.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const DOLLAR_BRACE = String.fromCharCode(36) + String.fromCharCode(123);
const BACKTICK = String.fromCharCode(96);
const ATTR = /class(?:Name)?\s*=/;

/**
 * En el constructor de RegExp el `$` sin escapar actsua como ancla de fin de
 * linea, no como el caracter literal, y por eso el patron nunca encontraba nada.
 * Se construye escapado.
 */
const LITERAL_INTERP = '\\' + DOLLAR_BRACE;

/** Ultima utilidad de una clase: palabra con guiones, sin espacios. */
const CLASS_END = '[a-z0-9][a-z0-9-]*(?:/[0-9]+)?';
const BROKEN = new RegExp('(' + CLASS_END + ')' + LITERAL_INTERP, 'g');

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
let files = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');

  let enClass = false;
  const after = before
    .split('\n')
    .map((line) => {
      const abre = ATTR.test(line);
      let salida = line;

      if (abre || enClass) {
        salida = line.replace(BROKEN, (full, head) => {
          total++;
          return `${head} ${DOLLAR_BRACE}`;
        });
      }

      // Estado para la linea siguiente.
      if (abre) enClass = true;
      if (abre || enClass) {
        const ticks = (line.match(new RegExp(BACKTICK, 'g')) || []).length;
        if (ticks >= 2) enClass = false;
      }

      return salida;
    })
    .join('\n');

  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    files++;
    console.log(`  ${file.slice(SRC.length)}`);
  }
}

console.log(`\nInterpolaciones reparadas: ${total} en ${files} archivos`);
