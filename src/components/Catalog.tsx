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

  const productList = Array.isArray(products) ? products : [];
  const filteredProducts = productList.filter((product) => {
    if (!product) return false;
    const name = (product.name || "").toLowerCase();
    const sku = (product.sku || "").toLowerCase();
    const search = (searchTerm || "").toLowerCase();
    const matchesSearch = name.includes(search) || sku.includes(search);
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Section */}
      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría de transmisión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-[#3D3528] placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#FDF9F1]/60 border border-slate-200 dark:border-[#E5DEC9] p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-[#4D4DFF] text-white font-bold shadow-xs" : "text-slate-500 hover:text-slate-900 dark:text-[#7F735F]"} transition-all cursor-pointer`}
                title="Vista Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-[#4D4DFF] text-white font-bold shadow-xs" : "text-slate-500 hover:text-slate-900 dark:text-[#7F735F]"} transition-all cursor-pointer`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Horizontal scroll */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#E5DEC9] flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-2 font-semibold">
            <SlidersHorizontal className="w-3 h-3" />
            Categoría:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#4D4DFF] text-white shadow-md shadow-[#4D4DFF]/30"
                  : "bg-white dark:bg-[#F7F8FC] border border-slate-200/60 dark:border-slate-100 text-slate-600 dark:text-[#7F735F] hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl py-12 px-4 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-[#7F735F] font-display">No se encontraron productos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otra categoría en la barra de filtros.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filteredProducts.map((product) => {
            const outOfStock = product.stock === 0;
            const lowStock = product.stock > 0 && product.stock < 10;
            const photoCount = product.images?.length || (product.img ? 1 : 0);

            return (
              <div
                key={product.sku}
                id={`catalog-product-card-${product.sku}`}
                className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 hover:border-blue-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 group relative overflow-hidden text-left"
              >
                {/* Image panel */}
                <div>
                  <div className="relative aspect-[4/3] max-h-32 bg-[#F7F8FC] dark:bg-[#F7F8FC] rounded-xl flex items-center justify-center p-2 mb-2.5 overflow-hidden border-none">
                    <ProtectedImage
                      src={product.img}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Stock badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.tags && product.tags.includes("Best Seller") && (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-[8.5px] font-bold text-white uppercase px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 fill-white" />
                          Best Seller
                        </span>
                      )}
                      {outOfStock ? (
                        <span className="bg-[#FFB6C1] text-rose-800 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Sin Stock
                        </span>
                      ) : lowStock ? (
                        <span className="bg-[#FFD7A0] text-[#D97706] text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Stock Bajo ({product.stock})
                        </span>
                      ) : (
                        <span className="bg-[#98FB98] text-emerald-800 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>

                    {photoCount > 1 && (
                      <span className="absolute top-2 right-2 bg-slate-900/90 text-blue-500 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                        <Camera className="w-2.5 h-2.5" />
                        {photoCount}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-[#4D4DFF] dark:text-blue-500 uppercase tracking-wider font-bold">
                        {product.category}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-[#7F735F] font-bold bg-slate-100 dark:bg-[#F2ECDE] px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-[#E5DEC9]/60">
                        {product.sku}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#3D3528] truncate group-hover:text-[#4D4DFF] transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-[#7F735F] truncate leading-relaxed">
                      {product.description || "Componente oficial CHOHO de alta fricción para máxima transferencia de fuerza motriz."}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#E5DEC9] flex items-center justify-between">
                  <div>
                    <span className="text-[8.5px] text-slate-400 block font-mono uppercase font-medium">PRECIO BASE</span>
                    <span className="text-xs font-extrabold font-mono text-[#4D4DFF] dark:text-blue-500">
                      S/ {Number(product.basePrice || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="p-1.5 bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none rounded-xl text-[#4D4DFF] hover:text-[#4D4DFF] transition-all cursor-pointer"
                      title="Ver Detalles Completos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button
                        onClick={() => onQuickAdd(product)}
                        className="flex items-center gap-1 bg-[#4D4DFF] hover:bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm shadow-[#4D4DFF]/30 cursor-pointer"
                        title="Agregar Rápido al Presupuesto"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Añadir</span>
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
                className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 hover:border-blue-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <ProtectedImage
                    src={product.img}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-12 h-12 bg-[#F7F8FC] dark:bg-[#F7F8FC] rounded-xl shrink-0 overflow-hidden border border-slate-100 dark:border-[#E5DEC9]"
                  />

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-[#4D4DFF] dark:text-blue-500 font-bold">{product.sku}</span>
                      <span className="text-[9px] bg-slate-100 dark:bg-[#F2ECDE] text-slate-500 px-1.5 py-0.2 rounded font-semibold">{product.category}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#3D3528] truncate mt-0.5">{product.name}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-[#E5DEC9]">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] text-slate-400 block font-medium">BASE (U.N.)</span>
                    <span className="text-xs font-mono font-bold text-[#4D4DFF] dark:text-blue-500">
                      S/ {Number(product.basePrice || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-left sm:text-right min-w-[70px]">
                    <span className="text-[9px] text-slate-400 block font-medium">STOCK</span>
                    <span className={`text-xs font-mono font-bold ${outOfStock ? "text-red-500" : "text-slate-700 dark:text-[#7F735F]"}`}>
                      {outOfStock ? "Agotado" : `${product.stock} und`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="p-1.5 bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none rounded-xl text-slate-500 hover:text-[#4D4DFF] transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button
                        onClick={() => onQuickAdd(product)}
                        className="bg-[#4D4DFF] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
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
