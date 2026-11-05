/**
 * Restaura los espacios de los mensajes de texto.
 *
 * `collapse-dark-neutrals.mjs` en su primera version normalizo todas las
 * cadenas del archivo, no solo las de className. En los template literals de
 * texto corrido eso se tradujo en mensajes al usuario sin espacios:
 *
 *   `Emisor RUC ${ruc}`  ->  `Emisor RUC${ruc}`
 *
 * Son seis frases y se restauran una a una contra el texto conocido, en lugar
 * de intentar inferir donde va cada espacio (imposible de forma fiable: un
 * template literal no distingue "texto" de "clases").
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/** [archivo, roto, correcto] */
const FIXES = [
  ['components/ExpensesManager.tsx',
   '`Emisor RUC${rucIssuer}`',
   '`Emisor RUC ${rucIssuer}`'],

  ['components/InventoryManager.tsx',
   '`Procesando y optimizando${files.length}imagen(es)...`',
   '`Procesando y optimizando ${files.length} imagen(es)...`'],

  ['components/InventoryManager.tsx',
   '`¡Producto${productPayload.sku}registrado exitosamente con ${allImages.length} foto(s)!`',
   '`¡Producto ${productPayload.sku} registrado exitosamente con ${allImages.length} foto(s)!`'],

  ['components/InventoryManager.tsx',
   '`¡Producto${editSku}actualizado completamente!`',
   '`¡Producto ${editSku} actualizado completamente!`'],

  ['components/SyncCenter.tsx',
   'manual completada a las${nowStr}(${syncCount}registros sincronizados)`',
   'manual completada a las ${nowStr} (${syncCount} registros sincronizados)`'],

  ['components/SyncCenter.tsx',
   '`Auto-Sync periódica a las${nowStr}(${syncCount}registros)`',
   '`Auto-Sync periódica a las ${nowStr} (${syncCount} registros)`'],
];

let total = 0;

for (const [rel, broken, correct] of FIXES) {
  const file = join(ROOT, rel);
  const before = readFileSync(file, 'utf8');

  if (!before.includes(broken)) {
    console.log(`  [omitido] ${rel}: no coincide (texto ya distinto)`);
    continue;
  }

  writeFileSync(file, before.split(broken).join(correct), 'utf8');
  total++;
  console.log(`  corregido ${rel}`);
}

console.log(`\nMensajes restaurados: ${total} de ${FIXES.length}`);
