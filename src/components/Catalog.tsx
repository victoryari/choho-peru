import React, { useState } from "react";
import { Search, Grid, List, Eye, ShoppingBag, SlidersHorizontal, AlertCircle, Sparkles, Camera } from "lucide-react";
import { Product } from "../types";
import { ProtectedImage } from "./ProtectedImage";

interface CatalogProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function Catalog({ products, onSelectProduct, onQuickAdd }: CatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = ["Todos", "Cadenas", "Piñones", "Kits de Arrastre", "Frenos", "Motor", "Accesorios"];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Section */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría de transmisión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-700/60 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"} transition-all cursor-pointer`}
                title="Vista Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"} transition-all cursor-pointer`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Horizontal scroll */}
        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-2">
            <SlidersHorizontal className="w-3 h-3" />
            Categoría:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-sm"
                  : "bg-slate-900/40 border border-slate-700/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Display */}
      {filteredProducts.length === 0 ? (
        <div className="glass-panel rounded-2xl py-12 px-4 text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300 font-display">No se encontraron productos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otra categoría en la barra de filtros.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const outOfStock = product.stock === 0;
            const lowStock = product.stock > 0 && product.stock < 10;
            const photoCount = product.images?.length || (product.img ? 1 : 0);

            return (
              <div
                key={product.sku}
                id={`catalog-product-card-${product.sku}`}
                className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group relative overflow-hidden shadow-md"
              >
                {/* Image panel */}
                <div>
                  <div className="relative aspect-square bg-slate-950/80 rounded-xl flex items-center justify-center p-3 mb-4 overflow-hidden border border-slate-800">
                    <ProtectedImage
                      src={product.img}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Stock badge */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                      {product.tags && product.tags.includes("Best Seller") && (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-bold text-slate-950 uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                          Best Seller
                        </span>
                      )}
                      {outOfStock ? (
                        <span className="bg-red-500/90 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Sin Stock
                        </span>
                      ) : lowStock ? (
                        <span className="bg-amber-500/90 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider badge-glow-amber">
                          Stock Bajo ({product.stock})
                        </span>
                      ) : (
                        <span className="bg-emerald-500/90 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>

                    {photoCount > 1 && (
                      <span className="absolute top-2.5 right-2.5 bg-slate-900/90 text-cyan-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {photoCount} fotos
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                        {product.category}
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/60">
                        {product.sku}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">
                      {product.description || "Componente oficial CHOHO de alta fricción para máxima transferencia de fuerza motriz."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 block font-mono uppercase">PRECIO BASE</span>
                    <span className="text-sm font-extrabold font-mono text-amber-400">
                      S/ {product.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
                      title="Ver Detalles Completos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button
                        onClick={() => onQuickAdd(product)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-extrabold px-3 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                        title="Agregar Rápido al Presupuesto"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Añadir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode Display */
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const outOfStock = product.stock === 0;
            return (
              <div
                key={product.sku}
                id={`catalog-product-list-${product.sku}`}
                className="bg-[#1E293B] border border-slate-700/50 hover:border-slate-600 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <ProtectedImage
                    src={product.img}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-12 h-12 bg-[#0F172A] rounded-lg shrink-0 overflow-hidden border border-slate-850"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-sky-400 font-bold">{product.sku}</span>
                      <span className="text-[9px] bg-slate-900 text-gray-400 px-1.5 py-0.2 rounded border border-slate-800">{product.category}</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-200 truncate mt-0.5">{product.name}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/50">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] text-gray-500 block">BASE (U.N.)</span>
                    <span className="text-xs font-mono font-bold text-sky-400">
                      S/ {product.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-left sm:text-right min-w-[70px]">
                    <span className="text-[9px] text-gray-500 block">STOCK</span>
                    <span className={`text-xs font-mono font-bold ${outOfStock ? "text-sky-400" : "text-gray-300"}`}>
                      {outOfStock ? "Agotado" : `${product.stock} und`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button
                        onClick={() => onQuickAdd(product)}
                        className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
