import React, { useState } from "react";
import { X, Check, ShoppingCart, Percent, Shield, Star, AlertCircle, MapPin } from "lucide-react";
import { Product } from "../types";
import { ProtectedImage } from "./ProtectedImage";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToBudget: (product: Product, qty: number, customPrice: number) => void;
}

export function ProductDetailModal({ product, onClose, onAddToBudget }: ProductDetailModalProps) {
  const [qty, setQty] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [successMsg, setSuccessMsg] = useState(false);

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
  const discountedPrice = Math.max(0, basePriceNum * (1 - discountPercent / 100));

  const handleAdd = () => {
    onAddToBudget(product, qty, Number(discountedPrice.toFixed(2)));
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1200);
  };

  const isOutOfStock = product.stock === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="product-detail-modal-container"
        className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/40 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
          <div>
            <div className="relative aspect-video md:aspect-square flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden p-4">
              <ProtectedImage
                src={activeImageSrc}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform hover:scale-105 duration-300"
              />
              {tagsList.map((tag, idx) => (
                <span
                  key={idx}
                  className="absolute top-3 left-3 bg-[#E51920] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Gallery Thumbnails Carousel */}
            {galleryImages.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl bg-white dark:bg-slate-900 border p-1 shrink-0 transition-all cursor-pointer overflow-hidden ${
                      activeImageIndex === idx
                        ? "border-[#E51920] ring-2 ring-red-500/20 shadow-md scale-105"
                        : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Vista ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 text-left">
            <div className="flex items-center gap-1.5 text-xs text-amber-500">
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <span className="text-slate-400 ml-1 font-medium">(4.9 • 86 opiniones)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Garantía oficial CHOHO Premium de 15,000 kilómetros.</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between text-left">
          <div>
            <div className="text-[11px] font-mono tracking-wider text-[#E51920] dark:text-red-400 uppercase font-bold">
              SKU: {product.sku}
            </div>
            <h2 className="text-xl font-extrabold font-display text-slate-900 dark:text-white mt-1 leading-snug">
              {product.name}
            </h2>
            <div className="inline-block mt-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Categoría: {product.category}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {product.description || "Componente de alta gama para transmisión de motocicletas. Cumple con los más altos estándares de calidad internacional ISO 9001. Estructura de aleación reforzada que disminuye la fricción y el desgaste de catalinas."}
            </p>

            {/* Inventory Single Warehouse Details */}
            <div className="mt-5 space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white font-display">Disponibilidad en Almacén</div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-[#E51920] shrink-0" />
                  <span className="font-semibold">Almacén Central CHOHO Perú</span>
                </div>
                <span className={`text-xs font-extrabold font-mono ${product.stock > 10 ? 'text-emerald-600' : product.stock > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                  {product.stock === 0 ? "Agotado (0 Unid)" : `${product.stock} Unidades`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {/* Price dynamic modifier */}
            <div className="flex items-end justify-between bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block font-medium">Precio Base Unitario</span>
                <span className="text-lg font-bold font-mono text-slate-400 line-through">
                  S/ {basePriceNum.toFixed(2)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#E51920] dark:text-red-400 font-bold font-mono block">
                  {discountPercent > 0 ? `AHORRAS S/ ${(basePriceNum * discountPercent / 100).toFixed(2)} (${discountPercent}%)` : "Precio Regular"}
                </span>
                <span className="text-2xl font-extrabold font-mono text-[#E51920] dark:text-red-400">
                  S/ {discountedPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Controls */}
            {!isOutOfStock ? (
              <div className="space-y-3">
                {/* Advisor custom discount slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-[#E51920]" />
                      <span>Descuento de Asesor autorizado:</span>
                    </span>
                    <span className="font-bold text-[#E51920] dark:text-red-400">{discountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full accent-[#E51920] bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                  <span className="text-[9px] text-slate-400 italic block text-right">
                    *Margen máximo permitido para cotizaciones de campo es 15%
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-[#E51920] font-bold transition-colors cursor-pointer"
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
                      className="w-12 text-center bg-transparent border-0 font-bold font-mono text-xs text-slate-900 dark:text-white focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-[#E51920] font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAdd}
                    className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-150 shadow-md shadow-red-600/25 cursor-pointer"
                  >
                    {successMsg ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Agregado con éxito!</span>
                      </>
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
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3.5 rounded-2xl border border-red-200 dark:border-red-800/60">
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
