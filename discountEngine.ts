/**
 * Motor de reglas de descuento.
 *
 * Fuente unica de verdad del precio de venta. Se ejecuta en el servidor para
 * que el navegador no pueda inventar precios: el cliente pide el calculo y
 * recibe el precio autorizado junto con la regla que lo origino.
 *
 * Precedencia: la regla mas especifica gana.
 *   1. PRODUCTO      (SKU exacto)
 *   2. CATEGORIA     Linea > Sub-familia > Familia
 *   3. ESCALA_MONTO  (rango de monto de la linea)
 * Losatriz SUBSIDIO_FLETE no compite: se suma al descuento de la reglaganadora.
 *
 * Semantica de `discountType` (definida aqui porque nunca estuvo implementada):
 *   PORCENTAJE      -> el valor es un porcentaje (0-100)
 *   MONTO_FIJO      -> el valor es soles por UNIDAD
 *   PRECIO_ESPECIAL -> el valor es el precio unitario final y reemplaza al porcentaje
 */

export type DiscountType = "PORCENTAJE" | "MONTO_FIJO" | "PRECIO_ESPECIAL";
export type DiscountScope = "PRODUCTO" | "CATEGORIA" | "ESCALA_MONTO" | "SUBSIDIO_FLETE";
export type MetodoPago = "CONTADO" | "CREDITO";

/** mysql2 devuelve los DECIMAL como string, de ahi el tipo union. */
export type Numerico = number | string | null | undefined;

export interface ReglaDescuento {
  id: string;
  scope?: string;
  role?: string | null;
  sku?: string | null;
  productName?: string | null;
  category?: string | null;
  categoriaId?: string | null;
  region?: string | null;
  maxDiscount?: Numerico;
  minAmount?: Numerico;
  maxAmount?: Numerico;
  minQty?: Numerico;
  discountCash?: Numerico;
  discountCredit?: Numerico;
  priceOfferCash?: Numerico;
  priceOfferCredit?: Numerico;
  discountType?: string | null;
  notes?: string | null;
  status?: string | null;
}

export interface ContextoCalculo {
  sku: string;
  productName?: string | null;
  basePrice: number;
  qty: number;
  metodoPago: MetodoPago;
  region?: string | null;
  role?: string | null;
  /** Ruta de la taxonomia del producto, de la linea hacia la familia. */
  familiaId?: string | null;
  subFamiliaId?: string | null;
  lineaId?: string | null;
  categoriaId?: string | null;
  /** Monto total acumulado del pedido/cotización (para evaluar escalas globales de pedido). */
  montoTotalPedido?: number | null;
}

export interface ResultadoCalculo {
  sku: string;
  qty: number;
  precioBase: number;
  precioUnitario: number;
  precioUnitarioBase: number;
  descuentoUnitario: number;
  descuentoTotal: number;
  totalLinea: number;
  descuentoPorcentaje: number;
  reglaAplicada: ReglaDescuento | null;
  reglaSubsidio: ReglaDescuento | null;
  combinado: boolean;
  mensaje: string;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

const valorPago = (regla: ReglaDescuento, metodoPago: MetodoPago): number | null => {
  const v = metodoPago === "CONTADO" ? regla.discountCash : regla.discountCredit;
  return v === null || v === undefined || v === "" ? null : Number(v);
};

const valorPrecioOferta = (regla: ReglaDescuento, metodoPago: MetodoPago): number | null => {
  const v = metodoPago === "CONTADO" ? regla.priceOfferCash : regla.priceOfferCredit;
  return v === null || v === undefined || v === "" ? null : Number(v);
};

const estaActiva = (r: ReglaDescuento) => (r.status || "Activo") === "Activo";

/** El monto de la linea cae dentro del rango [minAmount, maxAmount). */
const cumpleRango = (r: ReglaDescuento, monto: number) => {
  if (r.minAmount !== null && r.minAmount !== undefined && monto < Number(r.minAmount)) return false;
  if (r.maxAmount !== null && r.maxAmount !== undefined && monto >= Number(r.maxAmount)) return false;
  return true;
};

const cumpleCantidad = (r: ReglaDescuento, qty: number) =>
  r.minQty === null || r.minQty === undefined || qty >= Number(r.minQty);

/** El rol restringe la regla; si la regla no define rol, aplica a todos. */
const cumpleRol = (r: ReglaDescuento, rol?: string | null) => {
  if (!r.role) return true;
  if (!rol) return false;
  return r.role.trim().toLowerCase() === rol.trim().toLowerCase();
};

/** Un mismo nivel de especificidad gana el mayor beneficio para el cliente. */
const beneficioDe = (regla: ReglaDescuento, metodoPago: MetodoPago, basePrice: number, qty: number): number => {
  if (regla.discountType === "PRECIO_ESPECIAL") {
    const oferta = valorPrecioOferta(regla, metodoPago);
    if (oferta !== null) return Math.max(0, (basePrice - oferta) * qty);
  }
  const valor = valorPago(regla, metodoPago);
  if (valor === null) return 0;
  if (regla.discountType === "MONTO_FIJO") return Math.max(0, valor) * qty;
  return Math.max(0, (basePrice * qty * valor) / 100);
};

const aplicaTope = (regla: ReglaDescuento, descuentoUnitario: number, basePrice: number) => {
  if (regla.maxDiscount === null || regla.maxDiscount === undefined || regla.maxDiscount === "") return descuentoUnitario;
  const tope = Number(regla.maxDiscount);
  if (!Number.isFinite(tope)) return descuentoUnitario;
  if (regla.discountType === "MONTO_FIJO") return Math.min(descuentoUnitario, tope);
  // Para porcentaje, maxDiscount es el techo de porcentaje sobre la base.
  return Math.min(descuentoUnitario, (basePrice * tope) / 100);
};

/**
 * Resuelve el precio autorizado de una linea de cotizacion.
 */
export function calcularPrecioLinea(reglas: ReglaDescuento[], ctx: ContextoCalculo): ResultadoCalculo {
  const basePrice = Number(ctx.basePrice) || 0;
  const qty = Number(ctx.qty) || 0;
  const montoLinea = basePrice * qty;
  // Si se provee montoTotalPedido (monto global de la cotización), se evalúa la escala del pedido; de lo contrario, por línea.
  const montoEscala = ctx.montoTotalPedido !== undefined && ctx.montoTotalPedido !== null
    ? Number(ctx.montoTotalPedido)
    : montoLinea;
  const candidatas = (reglas || []).filter(estaActiva);

  // --- 1. Regla de producto (SKU exacto o grupo de producto por coincidencia de nombre) ---
  const rProductoExacto = candidatas
    .filter(r => (r.scope || "PRODUCTO") === "PRODUCTO" && r.sku === ctx.sku && cumpleRol(r, ctx.role) && cumpleCantidad(r, qty))
    .sort((a, b) => Number(b.minQty || 0) - Number(a.minQty || 0))[0];

  const rProductoGrupo = !rProductoExacto && ctx.productName ? candidatas
    .filter(r => {
      if ((r.scope || "PRODUCTO") !== "PRODUCTO" || r.sku) return false;
      if (!r.productName) return false;
      const target = r.productName.trim().toUpperCase();
      const pName = ctx.productName!.toUpperCase();
      return pName.includes(target) && cumpleRol(r, ctx.role) && cumpleCantidad(r, qty);
    })
    .sort((a, b) => Number(b.minQty || 0) - Number(a.minQty || 0))[0] : undefined;

  const rProducto = rProductoExacto || rProductoGrupo;

  // --- 2. Regla de categoria, de la linea mas cercana a la familia o categoria directa ---
  let rCategoria: ReglaDescuento | undefined;
  const idsCategoria = [ctx.lineaId, ctx.subFamiliaId, ctx.familiaId, ctx.categoriaId].filter(Boolean);
  for (const catId of idsCategoria) {
    rCategoria = candidatas.find(
      r => r.scope === "CATEGORIA" && r.categoriaId === catId && cumpleRol(r, ctx.role) && cumpleCantidad(r, qty)
    );
    if (rCategoria) break;
  }

  // --- 3. Escala por monto del pedido o de la linea ---
  const escala = candidatas
    .filter(r => r.scope === "ESCALA_MONTO" && cumpleRol(r, ctx.role) && cumpleRango(r, montoEscala))
    .sort((a, b) => {
      const ma = Number(a.minAmount || 0);
      const mb = Number(b.minAmount || 0);
      if (mb !== ma) return mb - ma; // el umbral mas alto es mas especifico
      return beneficioDe(b, ctx.metodoPago, basePrice, qty) - beneficioDe(a, ctx.metodoPago, basePrice, qty);
    })[0];

  // La mas especifica gana; la escala solo entra si no hay regla de producto/categoria.
  const rGanadora = rProducto || rCategoria || escala || null;

  let precioUnitarioBase = basePrice;
  let descuentoUnitario = 0;
  let descuentoPorcentaje = 0;

  if (rGanadora) {
    if (rGanadora.discountType === "PRECIO_ESPECIAL") {
      const oferta = valorPrecioOferta(rGanadora, ctx.metodoPago);
      if (oferta !== null) {
        precioUnitarioBase = Math.min(oferta, basePrice);
        descuentoUnitario = Math.max(0, basePrice - precioUnitarioBase);
      }
    } else {
      const valor = valorPago(rGanadora, ctx.metodoPago);
      if (valor !== null) {
        if (rGanadora.discountType === "MONTO_FIJO") {
          descuentoUnitario = Math.max(0, valor);
        } else {
          const pct = Math.max(0, valor);
          descuentoUnitario = (basePrice * pct) / 100;
          descuentoPorcentaje = pct;
        }
      }
    }
    descuentoUnitario = Math.min(aplicaTope(rGanadora, descuentoUnitario, basePrice), basePrice);
  }

  // --- Subsidio de flete: se suma, no compite ---
  const region = (ctx.region || "").toUpperCase();
  let rSubsidio: ReglaDescuento | null = null;
  let subsidUnitario = 0;
  if (region && region !== "LIMA") {
    const candidatosSubsidio = candidatas
      .filter(
        r =>
          r.scope === "SUBSIDIO_FLETE" &&
          (r.region || "").toUpperCase() === region &&
          cumpleRol(r, ctx.role) &&
          cumpleRango(r, montoEscala)
      )
      .sort((a, b) => {
        const ma = Number(a.minAmount || 0);
        const mb = Number(b.minAmount || 0);
        if (mb !== ma) return mb - ma;
        return Number(valorPago(b, ctx.metodoPago) || 0) - Number(valorPago(a, ctx.metodoPago) || 0);
      });

    rSubsidio = candidatosSubsidio[0] || null;
    if (rSubsidio) {
      const valor = valorPago(rSubsidio, ctx.metodoPago);
      if (valor !== null) subsidUnitario = (basePrice * Math.max(0, valor)) / 100;
    }
  }

  const descuentoTotalUnitario = Math.min(basePrice, descuentoUnitario + subsidUnitario);
  const precioUnitario = redondear(Math.max(0, basePrice - descuentoTotalUnitario));
  const descuentoTotal = redondear(descuentoTotalUnitario * qty);

  let mensaje = "Precio de lista, sin descuento aplicable";
  if (rGanadora && rSubsidio) {
    const etiquetaPago = ctx.metodoPago === "CONTADO" ? "Contado" : "Credito";
    mensaje = `${descuentoPorcentaje > 0 ? `${redondear(descuentoPorcentaje)}%` : `S/ ${redondear(descuentoUnitario)} por unidad`} (${etiquetaPago}) + ${redondear((subsidUnitario / basePrice) * 100 || 0)}% de flete`;
  } else if (rGanadora) {
    const etiquetaPago = ctx.metodoPago === "CONTADO" ? "Contado" : "Credito";
    if (rGanadora.discountType === "PRECIO_ESPECIAL") {
      mensaje = `Precio especial ${etiquetaPago}`;
    } else if (rGanadora.discountType === "MONTO_FIJO") {
      mensaje = `S/ ${redondear(descuentoUnitario)} por unidad (${etiquetaPago})`;
    } else {
      mensaje = `${redondear(descuentoPorcentaje)}% de descuento (${etiquetaPago})`;
    }
  } else if (rSubsidio) {
    mensaje = `Subsidio de flete ${redondear((subsidUnitario / basePrice) * 100 || 0)}%`;
  }

  return {
    sku: ctx.sku,
    qty,
    precioBase: redondear(basePrice),
    precioUnitarioBase: redondear(precioUnitarioBase),
    precioUnitario,
    descuentoUnitario: redondear(descuentoTotalUnitario),
    descuentoTotal,
    totalLinea: redondear(precioUnitario * qty),
    descuentoPorcentaje: basePrice > 0 ? redondear((descuentoTotalUnitario / basePrice) * 100) : 0,
    reglaAplicada: rGanadora,
    reglaSubsidio: rSubsidio,
    combinado: Boolean(rGanadora && rSubsidio),
    mensaje
  };
}
