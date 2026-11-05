import { calcularPrecioLinea, ReglaDescuento } from "./discountEngine.js";
import { SEED_DISCOUNT_POLICIES } from "./state.js";

const reglas = SEED_DISCOUNT_POLICIES as unknown as ReglaDescuento[];

const resultados: boolean[] = [];

const caso = (nombre: string, esperado: any, obtenido: any) => {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtenido);
  resultados.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${nombre}`);
  if (!ok) console.log(`      esperado: ${JSON.stringify(esperado)}\n      obtenido: ${JSON.stringify(obtenido)}`);
  return ok;
};

// 1. Escala por monto, contado (linea de S/ 20,000)
caso(
  "Escala S/15000+ contado -> 20%",
  { pct: 20, precio: 16000 },
  (() => { const r = calcularPrecioLinea(reglas, { sku: "A", basePrice: 20000, qty: 1, metodoPago: "CONTADO" });
    return { pct: r.descuentoPorcentaje, precio: r.precioUnitario }; })()
);

// 2. Escala por monto, credito
caso(
  "Escala S/15000+ credito -> 18%",
  { pct: 18, precio: 16400 },
  (() => { const r = calcularPrecioLinea(reglas, { sku: "A", basePrice: 20000, qty: 1, metodoPago: "CREDITO" });
    return { pct: r.descuentoPorcentaje, precio: r.precioUnitario }; })()
);

// 3. Rango intermedio: linea de S/ 4,000 -> 15% contado
caso(
  "Escala S/3000+ contado -> 15% (precio unitario y total de linea)",
  { pct: 15, unitario: 1700, linea: 3400 },
  (() => { const r = calcularPrecioLinea(reglas, { sku: "A", basePrice: 2000, qty: 2, metodoPago: "CONTADO" });
    return { pct: r.descuentoPorcentaje, unitario: r.precioUnitario, linea: r.totalLinea }; })()
);

// 4. monto bajo, fuera de toda escala -> sin descuento
caso(
  "Monto S/500 sin escala -> sin descuento",
  { pct: 0, precio: 500 },
  (() => { const r = calcularPrecioLinea(reglas, { sku: "A", basePrice: 500, qty: 1, metodoPago: "CONTADO" });
    return { pct: r.descuentoPorcentaje, precio: r.precioUnitario }; })()
);

// 5. Regla de producto gana sobre la escala
caso(
  "Regla de SKU (5%) gana sobre escala (20%)",
  { pct: 5 },
  (() => { const r = calcularPrecioLinea([
      ...reglas,
      { id: "SKU-1", scope: "PRODUCTO", sku: "A", discountType: "PORCENTAJE", discountCash: 5, discountCredit: 5, status: "Activo" }
    ], { sku: "A", basePrice: 20000, qty: 1, metodoPago: "CONTADO" });
    return { pct: r.descuentoPorcentaje }; })()
);

// 6. Precedencia categoria: linea > subfamilia > familia
caso(
  "Linea (7%) gana sobre familia (2%)",
  { pct: 7 },
  (() => { const r = calcularPrecioLinea([
      { id: "C-FAM", scope: "CATEGORIA", categoriaId: "FAM", discountType: "PORCENTAJE", discountCash: 2, discountCredit: 2, status: "Activo" },
      { id: "C-LIN", scope: "CATEGORIA", categoriaId: "LIN", discountType: "PORCENTAJE", discountCash: 7, discountCredit: 7, status: "Activo" }
    ], { sku: "A", basePrice: 100, qty: 1, metodoPago: "CONTADO", familiaId: "FAM", lineaId: "LIN" });
    return { pct: r.descuentoPorcentaje }; })()
);

// 7. PRECIO_ESPECIAL reemplaza al porcentaje
caso(
  "PRECIO_ESPECIAL fija precio final 700",
  { precio: 700 },
  (() => { const r = calcularPrecioLinea([
      { id: "P-1", scope: "PRODUCTO", sku: "A", discountType: "PRECIO_ESPECIAL", priceOfferCash: 700, status: "Activo" }
    ], { sku: "A", basePrice: 1000, qty: 1, metodoPago: "CONTADO" });
    return { precio: r.precioUnitario }; })()
);

// 8. MONTO_FIJO por unidad
caso(
  "MONTO_FIJO descuenta 50 por unidad",
  { precio: 950 },
  (() => { const r = calcularPrecioLinea([
      { id: "F-1", scope: "PRODUCTO", sku: "A", discountType: "MONTO_FIJO", discountCash: 50, discountCredit: 50, status: "Activo" }
    ], { sku: "A", basePrice: 1000, qty: 1, metodoPago: "CONTADO" });
    return { precio: r.precioUnitario }; })()
);

// 9. maxDiscount acota
caso(
  "maxDiscount 5% acota una regla de 20%",
  { pct: 5 },
  (() => { const r = calcularPrecioLinea([
      { id: "T-1", scope: "PRODUCTO", sku: "A", discountType: "PORCENTAJE", discountCash: 20, maxDiscount: 5, status: "Activo" }
    ], { sku: "A", basePrice: 1000, qty: 1, metodoPago: "CONTADO" });
    return { pct: r.descuentoPorcentaje }; })()
);

// 10. minQty restringe
caso(
  "minQty 5: con qty 2 no aplica, con qty 5 aplica",
  { con2: 0, con5: 10 },
  (() => {
    const rs: any[] = [{ id: "Q-1", scope: "PRODUCTO", sku: "A", discountType: "PORCENTAJE", discountCash: 10, minQty: 5, status: "Activo" }];
    return {
      con2: calcularPrecioLinea(rs, { sku: "A", basePrice: 1000, qty: 2, metodoPago: "CONTADO" }).descuentoPorcentaje,
      con5: calcularPrecioLinea(rs, { sku: "A", basePrice: 1000, qty: 5, metodoPago: "CONTADO" }).descuentoPorcentaje
    };
  })()
);

// 11. Regla inactiva no aplica
caso(
  "Regla Inactiva se ignora",
  { pct: 0 },
  (() => { const r = calcularPrecioLinea([
      { id: "I-1", scope: "PRODUCTO", sku: "A", discountType: "PORCENTAJE", discountCash: 30, status: "Inactivo" }
    ], { sku: "A", basePrice: 1000, qty: 1, metodoPago: "CONTADO" });
    return { pct: r.descuentoPorcentaje }; })()
);

// 12. Rol restringe
caso(
  "Regla de rol 'Jefe de Finanzas' no aplica a asesor",
  { asesor: 0, jefe: 12 },
  (() => {
    const rs: any[] = [{ id: "R-1", scope: "PRODUCTO", sku: "A", role: "Jefe de Finanzas", discountType: "PORCENTAJE", discountCash: 12, discountCredit: 12, status: "Activo" }];
    return {
      asesor: calcularPrecioLinea(rs, { sku: "A", basePrice: 1000, qty: 1, metodoPago: "CONTADO", role: "Asesor Comercial" }).descuentoPorcentaje,
      jefe: calcularPrecioLinea(rs, { sku: "A", basePrice: 1000, qty: 1, metodoPago: "CONTADO", role: "Jefe de Finanzas" }).descuentoPorcentaje
    };
  })()
);

// 13. Subsidio de flete se suma en Provincia
caso(
  "Provincia suma 3.5% de flete a la escala del 20%",
  { pct: 23.5 },
  (() => { const r = calcularPrecioLinea(reglas, { sku: "A", basePrice: 20000, qty: 1, metodoPago: "CONTADO", region: "PROVINCIA" });
    return { pct: r.descuentoPorcentaje }; })()
);

// 14. Lima no recibe subsidio
caso(
  "Lima no recibe subsidio de flete",
  { pct: 20 },
  (() => { const r = calcularPrecioLinea(reglas, { sku: "A", basePrice: 20000, qty: 1, metodoPago: "CONTADO", region: "LIMA" });
    return { pct: r.descuentoPorcentaje }; })()
);

// 15. El descuento nunca deja el precio en negativo
caso(
  "Descuento 100% deja precio 0, no negativo",
  { precio: 0 },
  (() => { const r = calcularPrecioLinea([
      { id: "X-1", scope: "PRODUCTO", sku: "A", discountType: "PORCENTAJE", discountCash: 100, status: "Activo" }
    ], { sku: "A", basePrice: 100, qty: 1, metodoPago: "CONTADO" });
    return { precio: r.precioUnitario }; })()
);

// 16. Escala por monto acumulado del pedido (S/ 1,528 activa escala S/ 1,500+ al 10%)
caso(
  "Escala por monto total del pedido (S/ 1,528 en dos líneas -> 10% contado)",
  { pct: 10, unitario: 112.5 },
  (() => {
    const r = calcularPrecioLinea(reglas, {
      sku: "BT-0604",
      basePrice: 125,
      qty: 11, // Línea individual = S/ 1,375 (< 1500)
      metodoPago: "CONTADO",
      montoTotalPedido: 1528 // Total pedido = 1375 + 153 = S/ 1,528
    });
    return { pct: r.descuentoPorcentaje, unitario: r.precioUnitario };
  })()
);

// 17. Alforja Spartan AC-0008 precio especial
caso(
  "Alforja Spartan AC-0008 fija S/ 303.80 al contado y S/ 345.50 a crédito",
  { contado: 303.80, credito: 345.50 },
  (() => {
    const c = calcularPrecioLinea(reglas, { sku: "AC-0008", basePrice: 434, qty: 1, metodoPago: "CONTADO" });
    const cr = calcularPrecioLinea(reglas, { sku: "AC-0008", basePrice: 434, qty: 1, metodoPago: "CREDITO" });
    return { contado: c.precioUnitario, credito: cr.precioUnitario };
  })()
);

// 18. Vedamotors / Servitec 20% OFF directo
caso(
  "Vedamotors / Servitec aplica 20% directo por nombre",
  { pct: 20, precio: 80 },
  (() => {
    const r = calcularPrecioLinea(reglas, {
      sku: "RE-1142",
      productName: "EMPAQUE VEDAMOTORS CULATA METAL",
      basePrice: 100,
      qty: 1,
      metodoPago: "CONTADO"
    });
    return { pct: r.descuentoPorcentaje, precio: r.precioUnitario };
  })()
);

// 19. Pastillas de Freno por Lotes
caso(
  "Pastillas de Freno lote de 30 u. fija S/ 4.20 y lote de 50 u. fija S/ 3.90",
  { lote30: 4.20, lote50: 3.90 },
  (() => {
    const r30 = calcularPrecioLinea(reglas, {
      sku: "RE-0393",
      productName: "PASTILLA DE FRENO CHOHO DEL. CBX 125",
      basePrice: 8.60,
      qty: 30,
      metodoPago: "CONTADO"
    });
    const r50 = calcularPrecioLinea(reglas, {
      sku: "RE-0393",
      productName: "PASTILLA DE FRENO CHOHO DEL. CBX 125",
      basePrice: 8.60,
      qty: 50,
      metodoPago: "CONTADO"
    });
    return { lote30: r30.precioUnitario, lote50: r50.precioUnitario };
  })()
);

// 20. Piñón de Arrastre lote 20 u. -> S/ 4.80 c/u
caso(
  "Piñón lote 20 u. fija S/ 4.80 c/u",
  { precio: 4.80 },
  (() => {
    const r = calcularPrecioLinea(reglas, {
      sku: "PI-0013",
      productName: "PIÑON CHOHO XTZ 125 14T",
      basePrice: 9.70,
      qty: 20,
      metodoPago: "CONTADO"
    });
    return { precio: r.precioUnitario };
  })()
);

// 21. Catalinas lote 100 u. -> 20%
caso(
  "Catalina lote 100 u. aplica 20% al contado",
  { pct: 20 },
  (() => {
    const r = calcularPrecioLinea(reglas, {
      sku: "CAT-0003",
      productName: "CATALINA CHOHO MOTOTAXI 37T",
      basePrice: 16.10,
      qty: 100,
      metodoPago: "CONTADO"
    });
    return { pct: r.descuentoPorcentaje };
  })()
);

console.log(resultados.every(Boolean) ? "\nTODAS LAS PRUEBAS PASARON" : "\nHAY PRUEBAS FALLIDAS");
process.exit(resultados.every(Boolean) ? 0 : 1);
