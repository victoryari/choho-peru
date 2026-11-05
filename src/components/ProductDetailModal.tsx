import React, { useState, useEffect } from "react";
import { X, Check, ShoppingCart, Percent, Shield, Star, AlertCircle, MapPin, Loader2, Tag } from "lucide-react";
import { Product, QuoteItem, PrecioAutorizado } from "../types";
import { ProtectedImage } from "./ProtectedImage";
import { etiquetaClasificacion } from "../utils/categorias";

interface ProductDetailModalProps {
  product: Product;
  advisorRole?: string;
  region?: "LIMA" | "PROVINCIA";
  onClose: () => void;
  onAddToBudget: (item: QuoteItem) => void;
}

export function ProductDetailModal({ product, advisorRole, region, onClose, onAddToBudget }: ProductDetailModalProps) {
  const [qty, setQty] = useState(1);
  const [successMsg, setSuccessMsg] = useState(false);
  // El precio lo autoriza el servidor segun las reglas vigentes. El asesor ya no
  // edita el porcentaje: antes podia aplicarlo libremente con un slider suelto.
  const [precio, setPrecio] = useState<PrecioAutorizado | null>(null);
  const [calculando, setCalculando] = useState(true);
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);

  // Gallery image setup
  let galleryImages: string[] = [];
  try {
    if (Array.isArray(product.images)) {
      galleryImages = product.images;
    } else if (typeof product.images === "string") {
      galleryImages = JSON.parse(product.images);
    }
  } catch (e) {
    galleryImages = [];
  }
  if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
    galleryImages = product.img ? [product.img] : [];
  }

  // Tags setup
  let tagsList: string[] = [];
  try {
    if (Array.isArray(product.tags)) {
      tagsList = product.tags;
    } else if (typeof product.tags === "string") {
      tagsList = JSON.parse(product.tags);
    }
  } catch (e) {
    tagsList = [];
  }
  if (!Array.isArray(tagsList)) tagsList = [];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const activeImageSrc = galleryImages[activeImageIndex] || product.img;
  const basePriceNum = typeof product.basePrice === 'number' ? product.basePrice : Number(product.basePrice || 0);
  const clasificacion = etiquetaClasificacion(product);

  useEffect(() => {
    let vigente = true;
    setCalculando(true);
    setErrorPrecio(null);

    fetch("/api/discounts/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: product.sku, qty, metodoPago: "CONTADO", region, role: advisorRole })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo consultar la politica de descuentos.");
        if (vigente) setPrecio(data);
      })
      .catch((err) => {
        if (vigente) {
          setErrorPrecio(err.message);
          setPrecio(null);
        }
      })
      .finally(() => {
        if (vigente) setCalculando(false);
      });

    return () => { vigente = false; };
  }, [product.sku, qty, advisorRole, region]);

  const precioUnitario = precio ? precio.precioUnitario : basePriceNum;

  const handleAdd = () => {
    // Si el servidor no autorizo un precio, no se permite agregar al carrito.
    if (!precio) return;
    onAddToBudget({
      sku: product.sku,
      name: product.name,
      qty,
      price: Number(precioUnitario.toFixed(2))
    });
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1200);
  };

  const isOutOfStock = product.stock === 0;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Ficha de Producto"
        id="product-detail-modal-container"
        className="relative bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row"
      >
        <button type="button"
          onClick={onClose}
          aria-label="Cerrar detalle del producto"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface-2 text-ink-muted hover:text-ink transition-all cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Product Image Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-surface-2 dark:bg-surface-2/40 border-b md:border-b-0 md:border-r border-line">
          <div>
            <div className="relative aspect-video md:aspect-square flex items-center justify-center bg-surface rounded-2xl border border-line overflow-hidden p-4">
              <ProtectedImage
                src={activeImageSrc}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform hover:scale-105 duration-300"
              />
              {tagsList.map((tag, idx) => (
                <span
                  key={idx}
                  className="absolute top-3 left-3 bg-brand text-brand-contrast text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Gallery Thumbnails Carousel */}
            {galleryImages.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                {galleryImages.map((imgUrl, idx) => (
                  <button type="button"
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl bg-surface border p-1 shrink-0 transition-all cursor-pointer overflow-hidden ${
                      activeImageIndex === idx
                        ? "border-brand ring-2 ring-danger/ring shadow-md scale-105"
                        : "border-line opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Vista ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 text-left">
            <div className="flex items-center gap-1.5 text-xs text-warning-fg">
              <Star className="w-4 h-4 fill-warning" />
              <Star className="w-4 h-4 fill-warning" />
              <Star className="w-4 h-4 fill-warning" />
              <Star className="w-4 h-4 fill-warning" />
              <Star className="w-4 h-4 fill-warning" />
              <span className="text-ink-subtle ml-1 font-medium">(4.9 • 86 opiniones)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted bg-surface p-3 rounded-xl border border-line">
              <Shield className="w-4 h-4 text-success-fg shrink-0" />
              <span>Garantía oficial CHOHO Premium de 15,000 kilómetros.</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between text-left">
          <div>
            <div className="text-xs font-mono tracking-wider text-brand-fg uppercase font-bold">
              SKU: {product.sku}
            </div>
            <h2 className="text-xl font-extrabold font-display text-ink mt-1 leading-snug">
              {product.name}
            </h2>
            <div className="inline-block mt-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-surface-2 text-ink-muted">
              Clasificación: {clasificacion || "Sin clasificar"}
            </div>

            <p className="text-xs text-ink-muted mt-4 leading-relaxed bg-surface-2 dark:bg-surface-2/60 p-3.5 rounded-2xl border border-line">
              {product.description || "Componente de alta gama para transmisión motocicletas. Cumple con los más altos estándares calidad internacional ISO 9001. Estructura aleación reforzada que disminuye la fricción y el desgaste catalinas."}
            </p>

            {/* Inventory Single Warehouse Details */}
            <div className="mt-5 space-y-2">
              <div className="text-xs font-bold text-ink font-display">Disponibilidad en Almacén</div>
              <div className="p-3 bg-surface-2 dark:bg-surface-2/60 rounded-2xl border border-line flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-ink dark:text-ink-muted">
                  <MapPin className="w-4 h-4 text-brand-fg shrink-0" />
                  <span className="font-semibold">Almacén Central CHOHO Perú</span>
                </div>
                <span className={`text-xs font-extrabold font-mono ${product.stock > 10 ? 'text-success-fg' : product.stock > 0 ? 'text-warning-fg' : 'text-danger-fg'}`}>
                  {product.stock === 0 ? "Agotado (0 Unid)" : `${product.stock}Unidades`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-line space-y-4">
            {/* Precio autorizado por el servidor */}
            <div className="flex items-end justify-between bg-surface-2 dark:bg-surface-2/60 p-3.5 rounded-2xl border border-line">
              <div>
                <span className="text-xs text-ink-subtle uppercase font-mono tracking-wider block font-medium">Precio Base Unitario</span>
                <span className="text-lg font-bold font-mono text-ink-subtle line-through">
                  S/ {basePriceNum.toFixed(2)}
                </span>
              </div>

              <div className="text-right">
                {calculando ? (
                  <span className="text-xs text-ink-subtle font-mono flex items-center gap-1 justify-end">
                    <Loader2 className="w-3 h-3 animate-spin" /> Consultando politica
                  </span>
                ) : errorPrecio ? (
                  <span className="text-xs text-danger-fg font-bold font-mono block">{errorPrecio}</span>
                ) : (
                  <>
                    <span className="text-xs text-brand-fg font-bold font-mono block">
                      {precio && precio.descuentoUnitario > 0
                        ? `AHORRAS S/${precio.descuentoUnitario.toFixed(2)}(${precio.descuentoPorcentaje}%)`
                        : "Precio Regular"}
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-brand-fg">
                      S/ {precioUnitario.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Regla que autoriza el precio: el asesor solo consulta, no edita */}
            {precio && !calculando && !errorPrecio && (
              <div className="flex items-start gap-2 text-xs text-ink-muted bg-surface-2 dark:bg-surface-2/60 border border-line rounded-2xl px-3.5 py-2.5">
                {precio.descuentoUnitario > 0
                  ? <Percent className="w-3.5 h-3.5 text-brand-fg shrink-0 mt-0.5" />
                  : <Shield className="w-3.5 h-3.5 text-success-fg shrink-0 mt-0.5" />}
                <div className="space-y-0.5">
                  <span className="font-semibold block">
                    {precio.descuentoUnitario > 0 ? "Descuento aplicado:" : "Sin descuento aplicable."}
                    {precio.mensaje}
                  </span>
                  {precio.reglaAplicada && (
                    <span className="font-mono text-micro text-ink-subtle block">
                      Regla {precio.reglaAplicada.id}
                      {precio.reglaAplicada.notes ? `—${precio.reglaAplicada.notes}` : ""}
                    </span>
                  )}
                </div>
              </div>
            )}

            {clasificacion && (
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Tag className="w-3 h-3 text-ink-subtle shrink-0" />
                <span className="font-semibold">Clasificación: {clasificacion}</span>
              </div>
            )}

            {/* Controls */}
            {!isOutOfStock ? (
              <div className="space-y-3">

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-line bg-surface-2 rounded-xl">
                    <button type="button"
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="px-3 py-2 text-ink-muted hover:text-brand-fg font-bold transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={qty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setQty(Math.min(product.stock, Math.max(1, val)));
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-12 text-center bg-transparent border-0 font-bold font-mono text-xs text-ink focus-visible:ring-0 focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button type="button"
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 text-ink-muted hover:text-brand-fg font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button type="button"
                    onClick={handleAdd}
                    disabled={!precio || calculando}
                    className="btn-primary flex-1 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {successMsg ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Agregado con éxito!</span>
                      </>
                    ) : !precio ? (
                      <span>Sin precio autorizado</span>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Añadir al Presupuesto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
 <div className="flex items-center gap-2 text-xs text-danger-fg bg-danger-soft p-3.5 rounded-2xl border border-danger/30 dark:border-danger/border">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No podemos añadir productos agotados al presupuesto de forma inmediata. Solicite un pedido de importación especial en almacén central.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
