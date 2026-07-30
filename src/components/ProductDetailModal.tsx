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
  const galleryImages = (product.images && product.images.length > 0) 
    ? product.images 
    : (product.img ? [product.img] : []);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="product-detail-modal-container"
        className="relative bg-[#1E293B] border border-slate-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 border border-slate-700/50 text-gray-400 hover:text-white hover:bg-sky-500/80 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-black/25 border-b md:border-b-0 md:border-r border-slate-700/50">
          <div>
            <div className="relative aspect-video md:aspect-square flex items-center justify-center bg-slate-900/50 rounded-xl overflow-hidden p-4">
              <ProtectedImage
                src={activeImageSrc}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform hover:scale-105 duration-300"
              />
              {product.tags && product.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="absolute top-3 left-3 bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow"
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
                    className={`w-14 h-14 rounded-lg bg-slate-900 border p-1 shrink-0 transition-all cursor-pointer overflow-hidden ${
                      activeImageIndex === idx
                        ? "border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-105"
                        : "border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Vista ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-amber-500">
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <Star className="w-4 h-4 fill-amber-500" />
              <span className="text-gray-400 ml-1">(4.9 • 86 opiniones)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Garantía oficial CHOHO Premium de 15,000 kilómetros.</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono tracking-wider text-sky-400 uppercase font-bold">
              SKU: {product.sku}
            </div>
            <h2 className="text-xl font-bold font-display text-white mt-1 leading-snug">
              {product.name}
            </h2>
            <div className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
              Categoría: {product.category}
            </div>

            <p className="text-xs text-gray-400 mt-4 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/40">
              {product.description || "Componente de alta gama para transmisión de motocicletas. Cumple con los más altos estándares de calidad internacional ISO 9001. Estructura de aleación reforzada que disminuye la fricción y el desgaste de catalinas."}
            </p>

            {/* Inventory Single Warehouse Details */}
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold text-gray-300 font-display">Disponibilidad en Almacén</div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold">Almacén Central CHOHO Perú</span>
                </div>
                <span className={`text-xs font-extrabold font-mono ${product.stock > 10 ? 'text-emerald-400' : product.stock > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {product.stock === 0 ? "Agotado (0 Unid)" : `${product.stock} Unidades`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-700/50 space-y-4">
            {/* Price dynamic modifier */}
            <div className="flex items-end justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Precio Base Unitario</span>
                <span className="text-lg font-bold font-mono text-gray-400 line-through">
                  S/ {basePriceNum.toFixed(2)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-sky-400 font-bold font-mono block">
                  {discountPercent > 0 ? `AHORRAS S/ ${(basePriceNum * discountPercent / 100).toFixed(2)} (${discountPercent}%)` : "Precio Regular"}
                </span>
                <span className="text-2xl font-bold font-mono text-sky-400">
                  S/ {discountedPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Controls */}
            {!isOutOfStock ? (
              <div className="space-y-3">
                {/* Advisor custom discount slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-sky-400" />
                      <span>Descuento de Asesor autorizado:</span>
                    </span>
                    <span className="font-bold text-sky-400">{discountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full accent-sky-500 bg-slate-850 rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                  <span className="text-[9px] text-gray-500 italic block text-right">
                    *Margen máximo permitido para cotizaciones de campo es 15%
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-slate-700/50 bg-[#0F172A] rounded-lg">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={qty}
                      onChange={(e) => setQty(Math.min(product.stock, Math.max(1, Number(e.target.value))))}
                      className="w-12 text-center bg-transparent border-0 font-bold font-mono text-xs text-white focus:ring-0 focus:outline-none"
                    />
                    <button
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAdd}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-all duration-150 shadow-lg cursor-pointer"
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
              <div className="flex items-center gap-2 text-xs text-sky-400 bg-sky-950/25 p-3 rounded-lg border border-sky-900/50">
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
