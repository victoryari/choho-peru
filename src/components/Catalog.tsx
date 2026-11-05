import React, { useState } from "react";
import { Search, Grid, List, Eye, ShoppingBag, SlidersHorizontal, AlertCircle, Sparkles, Camera, Tag } from "lucide-react";
import { Product, Categoria } from "../types";
import { ProtectedImage } from "./ProtectedImage";
import { construirArbol, etiquetaClasificacion } from "../utils/categorias";

interface CatalogProps {
  products: Product[];
  categorias: Categoria[];
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function Catalog({ products, categorias, onSelectProduct, onQuickAdd }: CatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  // Cascada de filtro: cada seleccion acota el nivel siguiente.
  const [famSel, setFamSel] = useState("");
  const [subSel, setSubSel] = useState("");
  const [linSel, setLinSel] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Los filtros se derivan del arbol, no de una lista fija en el codigo.
  const arbol = construirArbol(categorias);
  const subOpciones = famSel ? (arbol.find(f => f.id === famSel)?.hijos ?? []) : [];
  const linOpciones = subSel ? (subOpciones.find(s => s.id === subSel)?.hijos ?? []) : [];

  const productList = Array.isArray(products) ? products : [];

  /**
   * Ids que atraviesa el producto en la taxonomia. Un filtro de cualquier nivel
   * coincide si el producto esta en ese nodo o en un descendiente suyo.
   */
  const rutaIds = (p: Product): string[] =>
    [p.familia?.id, p.subFamilia?.id, p.linea?.id || p.categoriaId].filter(Boolean) as string[];

  const filteredProducts = productList.filter((product) => {
    if (!product) return false;
    const name = (product.name || "").toLowerCase();
    const sku = (product.sku || "").toLowerCase();
    const search = (searchTerm || "").toLowerCase();
    const matchesSearch = name.includes(search) || sku.includes(search);

    const ruta = rutaIds(product);
    const matchesFam = !famSel || ruta.includes(famSel);
    const matchesSub = !subSel || ruta.includes(subSel);
    const matchesLin = !linSel || ruta.includes(linSel);

    return matchesSearch && matchesFam && matchesSub && matchesLin;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Section */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría de transmisión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-subtle focus-visible:outline-none transition-all"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-surface-2 dark:bg-surface/60 border border-line p-1 rounded-xl">
              <button type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-brand text-brand-contrast font-bold shadow-xs" : "text-ink-muted hover:text-ink"}transition-all cursor-pointer`}
                title="Vista Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-brand text-brand-contrast font-bold shadow-xs" : "text-ink-muted hover:text-ink"}transition-all cursor-pointer`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros en cascada, derivados del árbol de categorías */}
        <div className="mt-4 pt-3 border-t border-line space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle shrink-0 flex items-center gap-1 mr-2 font-semibold">
              <SlidersHorizontal className="w-3 h-3" />
              Familia:
            </span>
            <button type="button"
              onClick={() => { setFamSel(""); setSubSel(""); setLinSel(""); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                famSel === ""
                  ? "bg-brand text-brand-contrast shadow-md shadow-brand/30"
                  : "bg-surface dark:bg-surface-2 border border-line/60 dark:border-line text-ink-muted hover:text-ink dark:hover:text-ink"
              }`}
            >
              Todas
            </button>
            {arbol.map((f) => (
              <button type="button"
                key={f.id}
                onClick={() => { setFamSel(f.id); setSubSel(""); setLinSel(""); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  famSel === f.id
                    ? "bg-brand text-brand-contrast shadow-md shadow-brand/30"
                    : "bg-surface dark:bg-surface-2 border border-line/60 dark:border-line text-ink-muted hover:text-ink dark:hover:text-ink"
                }`}
              >
                {f.nombre}
              </button>
            ))}
          </div>

          {(famSel || subSel || linSel) && (
            <div className="flex items-center gap-2 flex-wrap">
              {famSel && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/10 text-brand-fg text-xs font-bold">
                  {arbol.find(f => f.id === famSel)?.nombre}
                  <button type="button" onClick={() => { setFamSel(""); setSubSel(""); setLinSel(""); }} className="hover:text-danger-fg cursor-pointer">×</button>
                </span>
              )}
              {subOpciones.length > 0 && (
                <select
                  value={subSel}
                  onChange={(e) => { setSubSel(e.target.value); setLinSel(""); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-2 border-none text-ink focus-visible:outline-none"
                >
                  <option value="">Todas las sub-familias</option>
                  {subOpciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
              {linOpciones.length > 0 && (
                <select
                  value={linSel}
                  onChange={(e) => setLinSel(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-2 border-none text-ink focus-visible:outline-none"
                >
                  <option value="">Todas las líneas</option>
                  {linOpciones.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Catalog Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl py-12 px-4 text-center">
          <AlertCircle className="w-10 h-10 text-ink-subtle dark:text-ink-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-ink dark:text-ink-muted font-display">No se encontraron productos</h3>
          <p className="text-xs text-ink-subtle mt-1 max-w-sm mx-auto">
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
                id={`catalog-product-card- ${product.sku}`}
                className="bg-surface border border-line hover:border-brand/border shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 group relative overflow-hidden text-left"
              >
                {/* Image panel */}
                <div>
                  <div className="relative aspect-[4/3] max-h-32 bg-surface-2 rounded-xl flex items-center justify-center p-2 mb-2.5 overflow-hidden border-none">
                    <ProtectedImage
                      src={product.img}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Stock badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.tags && product.tags.includes("Best Seller") && (
                        <span className="bg-gradient-to-r from-warning to-warning text-micro font-bold text-white uppercase px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 fill-white" />
                          Best Seller
                        </span>
                      )}
                      {outOfStock ? (
                        <span className="bg-danger-soft text-danger-fg text-micro font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Sin Stock
                        </span>
                      ) : lowStock ? (
                        <span className="bg-warning-soft text-warning-fg text-micro font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Stock Bajo ({product.stock})
                        </span>
                      ) : (
                        <span className="bg-success-soft text-success-fg text-micro font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>

                    {photoCount > 1 && (
                      <span className="absolute top-2 right-2 bg-ink/90 text-brand-fg text-micro font-mono font-bold px-1.5 py-0.5 rounded-full border border-danger/border flex items-center gap-1">
                        <Camera className="w-2.5 h-2.5" />
                        {photoCount}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-micro font-mono text-brand-fg uppercase tracking-wider font-bold">
                        {etiquetaClasificacion(product) || "Sin clasificar"}
                      </span>
                      <span className="text-micro font-mono text-ink-muted font-bold bg-surface-2 px-1.5 py-0.2 rounded border border-line/60">
                        {product.sku}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-ink truncate group-hover:text-brand-fg transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-micro text-ink-muted truncate leading-relaxed">
                      {product.description || "Componente oficial CHOHO de alta fricción para máxima transferencia fuerza motriz."}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between">
                  <div>
                    <span className="text-micro text-ink-subtle block font-mono uppercase font-medium">PRECIO BASE</span>
                    <span className="text-xs font-extrabold font-mono text-brand-fg">
                      S/ {Number(product.basePrice || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => onSelectProduct(product)}
                      className="p-1.5 bg-surface-2 border-none rounded-xl text-brand-fg hover:text-brand-fg transition-all cursor-pointer"
                      title="Ver Detalles Completos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button type="button"
                        onClick={() => onQuickAdd(product)}
                        className="flex items-center gap-1 bg-brand hover:bg-brand/90 text-brand-contrast text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm shadow-brand/30 cursor-pointer"
                        title="Agregar Rápido al Presupuesto"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="text-xs">Añadir</span>
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
                id={`catalog-product-list- ${product.sku}`}
                className="bg-surface border border-line hover:border-brand/border shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <ProtectedImage
                    src={product.img}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-12 h-12 bg-surface-2 rounded-xl shrink-0 overflow-hidden border border-line"
                  />

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-brand-fg font-bold">{product.sku}</span>
                      <span className="text-micro bg-surface-2 text-ink-muted px-1.5 py-0.2 rounded font-semibold">{etiquetaClasificacion(product) || "Sin clasificar"}</span>
                    </div>
                    <h4 className="text-xs font-bold text-ink truncate mt-0.5">{product.name}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-line">
                  <div className="text-left sm:text-right">
                    <span className="text-micro text-ink-subtle block font-medium">BASE (U.N.)</span>
                    <span className="text-xs font-mono font-bold text-brand-fg">
                      S/ {Number(product.basePrice || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-left sm:text-right min-w-[70px]">
                    <span className="text-micro text-ink-subtle block font-medium">STOCK</span>
                    <span className={`text-xs font-mono font-bold ${outOfStock ? "text-danger-fg" : "text-ink dark:text-ink-muted"}`}>
                      {outOfStock ? "Agotado" : `${product.stock}und`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => onSelectProduct(product)}
                      className="p-1.5 bg-surface-2 border-none rounded-xl text-ink-muted hover:text-brand-fg transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!outOfStock && (
                      <button type="button"
                        onClick={() => onQuickAdd(product)}
                        className="bg-brand hover:bg-brand/90 text-brand-contrast text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
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
