import React, { useState } from "react";
import { Search, Grid, List, Eye, ShoppingBag, SlidersHorizontal, AlertCircle, Sparkles } from "lucide-react";
import { Product } from "../types";

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
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, código SKU o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-700/50 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-sky-500 text-white" : "text-gray-500 hover:text-gray-300"} transition-all cursor-pointer`}
                title="Vista Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-sky-500 text-white" : "text-gray-500 hover:text-gray-300"} transition-all cursor-pointer`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Horizontal scroll */}
        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 shrink-0 flex items-center gap-1 mr-2">
            <SlidersHorizontal className="w-3 h-3" />
            Categoría:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-sky-500/10 border border-sky-500/30 text-sky-400 font-semibold"
                  : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl py-12 px-4 text-center">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-300 font-display">No se encontraron productos</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otra categoría en la barra de filtros.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const outOfStock = product.stock === 0;
            return (
              <div
                key={product.sku}
                id={`catalog-product-card-${product.sku}`}
                className="bg-[#1E293B] border border-slate-700/50 hover:border-slate-600 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden shadow-md hover:shadow-xl"
              >
                {/* Image panel */}
                <div>
                  <div className="relative aspect-square bg-[#0F172A] rounded-xl flex items-center justify-center p-3 mb-4 overflow-hidden">
                    <img
                      src={product.img || "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300"}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />

                    {product.tags && product.tags.includes("Best Seller") && (
                      <span className="absolute top-2.5 left-2.5 bg-sky-500 text-[9px] font-bold text-white uppercase px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 fill-white" />
                        Best Seller
                      </span>
                    )}

                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-sky-400 font-bold text-xs font-display">
                        SIN STOCK
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                        {product.category}
                      </span>
                      <span className="text-[9.5px] font-mono text-gray-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {product.sku}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-gray-200 line-clamp-1 group-hover:text-white transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed min-h-[32px]">
                      {product.description || "Componente oficial CHOHO de alta fricción para máxima transferencia de fuerza motriz."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-gray-500 block">PRECIO BASE</span>
                    <span className="text-sm font-bold font-mono text-sky-400">
                      S/ {product.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                      title="Ver Detalles Completos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button
                        onClick={() => onQuickAdd(product)}
                        className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all shadow cursor-pointer"
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
                  <div className="w-12 h-12 bg-[#0F172A] rounded-lg shrink-0 flex items-center justify-center p-1 border border-slate-850 overflow-hidden">
                    <img
                      src={product.img || "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=100"}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

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
