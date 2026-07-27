import React, { useState } from "react";
import { Package, Plus, Search, Edit3, Check, X, AlertTriangle, Sparkles, SlidersHorizontal, RefreshCw, Upload, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { Product } from "../types";
import { compressAndResizeImage } from "../utils/imageOptimizer";
import { ProtectedImage } from "./ProtectedImage";

interface InventoryManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProductStock: (sku: string, newStock: number, newPrice: number) => Promise<void>;
}

export function InventoryManager({
  products,
  onAddProduct,
  onUpdateProductStock
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState(0);
  const [editingPrice, setEditingPrice] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  // New Product Form State
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Transmisión");
  const [newBasePrice, setNewBasePrice] = useState<number | "">(0);
  const [newStock, setNewStock] = useState<number | "">(0);
  const [newDescription, setNewDescription] = useState("");
  const [newImg, setNewImg] = useState("");
  const [newTag, setNewTag] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setCompressionInfo("Optimizando y reduciendo espacio...");
    try {
      const originalSizeKb = (file.size / 1024).toFixed(1);
      const { dataUrl, sizeKb } = await compressAndResizeImage(file, 800, 800, 0.75);
      setNewImg(dataUrl);
      setCompressionInfo(`¡Optimizada! De ${originalSizeKb} KB a ${sizeKb} KB (Ahorro del ${(100 - (sizeKb / Number(originalSizeKb)) * 100).toFixed(0)}%)`);
    } catch (err) {
      console.error("Error optimizando imagen:", err);
      alert("No se pudo procesar la imagen seleccionada.");
    } finally {
      setIsCompressing(false);
    }
  };

  const categories = ["Todos", "Transmisión", "Cadenas", "Piñones", "Kits de Arrastre", "Frenos", "Motor", "Accesorios"];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartEdit = (product: Product) => {
    setEditingSku(product.sku);
    setEditingStock(product.stock);
    setEditingPrice(product.basePrice);
  };

  const handleSaveEdit = async (sku: string) => {
    try {
      await onUpdateProductStock(sku, editingStock, editingPrice);
      setEditingSku(null);
      setStatusMsg(`Stock del producto ${sku} actualizado correctamente.`);
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newName.trim()) return;

    setIsSaving(true);
    try {
      const productPayload: Product = {
        sku: newSku.trim().toUpperCase(),
        name: newName.trim(),
        category: newCategory,
        basePrice: Number(newBasePrice) || 0,
        stock: Number(newStock) || 0,
        description: newDescription.trim() || "Componente oficial CHOHO de alta fricción.",
        tags: newTag ? [newTag] : ["CHOHO"],
        img: newImg.trim() || undefined
      };

      await onAddProduct(productPayload);
      
      // Reset form
      setNewSku("");
      setNewName("");
      setNewBasePrice(0);
      setNewStock(0);
      setNewDescription("");
      setNewImg("");
      setNewTag("");
      setIsModalOpen(false);
      
      setStatusMsg(`¡Producto ${productPayload.sku} registrado exitosamente!`);
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Error al registrar el producto. Verifica que el SKU no exista.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title Header Panel */}
      <div className="glass-panel rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-sm font-display flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Package className="w-5 h-5 text-amber-400" />
            Control de Inventario y Gestión de Stock Básico
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Administra el catálogo de repuestos CHOHO, actualiza existencias en tiempo real y registra nuevos productos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Registrar Nuevo Producto</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por SKU o nombre de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Categoría:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                selectedCategory === cat
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                  : "bg-slate-900/40 border border-slate-700/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items List Table */}
      <div className="glass-panel rounded-2xl p-5 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 mb-4">
          <h4 className="font-bold text-xs text-slate-300 font-display">
            Lista de Repuestos e Inventario Disponible ({filteredProducts.length})
          </h4>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const isEditing = editingSku === p.sku;
            const isOutOfStock = p.stock === 0;
            const isLowStock = p.stock > 0 && p.stock < 10;

            return (
              <div
                key={p.sku}
                className="p-4 bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProtectedImage
                    src={p.img}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 shrink-0 overflow-hidden"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">{p.name}</span>
                      <span className="text-[9.5px] font-mono font-bold bg-slate-900 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">
                        {p.sku}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Categoría: {p.category}</span>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <div className="space-y-0.5 text-left">
                        <label className="text-[9px] text-slate-400 uppercase font-mono block">Precio (S/)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(Number(e.target.value))}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <label className="text-[9px] text-slate-400 uppercase font-mono block">Stock (Unid)</label>
                        <input
                          type="number"
                          value={editingStock}
                          onChange={(e) => setEditingStock(Number(e.target.value))}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-1 pt-3">
                        <button
                          onClick={() => handleSaveEdit(p.sku)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer"
                          title="Guardar Cambios"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingSku(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-mono uppercase">PRECIO BASE</span>
                        <span className="text-xs font-bold font-mono text-amber-400">
                          S/ {p.basePrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <span className="text-[9px] text-slate-400 block font-mono uppercase">ESTADO STOCK</span>
                        {isOutOfStock ? (
                          <span className="text-xs font-bold text-red-400 font-mono">SIN STOCK (0)</span>
                        ) : isLowStock ? (
                          <span className="text-xs font-bold text-amber-400 font-mono">BAJO ({p.stock})</span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-400 font-mono">{p.stock} Unidades</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 transition-all cursor-pointer flex items-center gap-1 text-xs"
                        title="Ajustar Precios o Stock"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Registering a New Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 relative border border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h3 className="font-bold text-sm font-display flex items-center gap-2 text-slate-100">
                <Plus className="w-4 h-4 text-amber-400" />
                Registrar Nuevo Producto en Catálogo
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase font-mono block">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CAT-SPROCKET-005"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase font-mono block">Categoría *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Transmisión">Transmisión</option>
                    <option value="Cadenas">Cadenas</option>
                    <option value="Piñones">Piñones</option>
                    <option value="Kits de Arrastre">Kits de Arrastre</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Motor">Motor</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase font-mono block">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cadena Dorada 520H O-Ring 120 Eslabones"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase font-mono block">Precio Base (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="125.50"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 uppercase font-mono block">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    placeholder="50"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase font-mono block">Descripción Corta</label>
                <textarea
                  rows={2}
                  placeholder="Especificaciones técnicas o compatibilidad de moto..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 uppercase font-mono block">Imagen del Producto (Archivo o URL)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* File Upload with Auto-Compression */}
                  <label className="p-3 bg-slate-950/80 border border-dashed border-amber-500/50 hover:border-amber-400 rounded-xl cursor-pointer flex flex-col items-center justify-center text-center group transition-all">
                    <Upload className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-slate-200">Subir foto (Celular/PC)</span>
                    <span className="text-[9px] text-slate-400">Compresión automática &lt;80 KB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Direct URL alternative */}
                  <div className="flex flex-col justify-center space-y-1">
                    <input
                      type="url"
                      placeholder="O pega URL de imagen (https://...)"
                      value={newImg.startsWith("data:") ? "" : newImg}
                      onChange={(e) => {
                        setNewImg(e.target.value);
                        setCompressionInfo(null);
                      }}
                      className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl px-3 py-2 text-[11px] text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {isCompressing && (
                  <div className="p-2 bg-amber-950/30 border border-amber-800/40 text-amber-400 rounded-lg text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Reduciendo y optimizando espacio de imagen...</span>
                  </div>
                )}

                {compressionInfo && !isCompressing && (
                  <div className="p-2 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 rounded-lg text-[10px] font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{compressionInfo}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Producto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
