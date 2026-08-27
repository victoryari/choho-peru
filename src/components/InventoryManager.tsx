import React, { useState } from "react";
import { Package, Plus, Search, Edit3, Check, X, AlertTriangle, Sparkles, SlidersHorizontal, RefreshCw, Upload, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { Product } from "../types";
import { compressAndResizeImage } from "../utils/imageOptimizer";
import { ProtectedImage } from "./ProtectedImage";

interface InventoryManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (sku: string, updatedPayload: Partial<Product>) => Promise<void>;
}

export function InventoryManager({
  products,
  onAddProduct,
  onUpdateProduct
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  // New Product Form State
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Transmisión");
  const [newBasePrice, setNewBasePrice] = useState<number | "">(0);
  const [newStock, setNewStock] = useState<number | "">(0);
  const [newDescription, setNewDescription] = useState("");
  const [newImg, setNewImg] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Edit Product Form State
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("Transmisión");
  const [editBasePrice, setEditBasePrice] = useState<number | "">(0);
  const [editStock, setEditStock] = useState<number | "">(0);
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    setCompressionInfo(`Procesando y optimizando ${files.length} imagen(es)...`);
    try {
      const compressedList: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { dataUrl, sizeKb } = await compressAndResizeImage(file, 800, 800, 0.75);
        compressedList.push(dataUrl);
      }

      if (isEdit) {
        setEditImages((prev) => [...prev, ...compressedList]);
      } else {
        setNewImages((prev) => [...prev, ...compressedList]);
        if (!newImg && compressedList.length > 0) {
          setNewImg(compressedList[0]);
        }
      }
      setCompressionInfo(`¡${files.length} foto(s) agregada(s) y optimizadas a <80 KB cada una!`);
    } catch (err) {
      console.error("Error optimizando imágenes:", err);
      alert("No se pudo procesar la selección de imágenes.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditImages((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setNewImages((prev) => {
        const updated = prev.filter((_, idx) => idx !== index);
        if (updated.length > 0) {
          setNewImg(updated[0]);
        } else {
          setNewImg("");
        }
        return updated;
      });
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newName.trim()) return;

    setIsSaving(true);
    try {
      const allImages = newImages.length > 0 ? newImages : (newImg ? [newImg] : []);
      const productPayload: Product = {
        sku: newSku.trim().toUpperCase(),
        name: newName.trim(),
        category: newCategory,
        basePrice: Number(newBasePrice) || 0,
        stock: Number(newStock) || 0,
        description: newDescription.trim() || "Componente oficial CHOHO de alta fricción.",
        tags: newTag ? [newTag] : ["CHOHO"],
        img: allImages.length > 0 ? allImages[0] : undefined,
        images: allImages
      };

      await onAddProduct(productPayload);
      
      // Reset form
      setNewSku("");
      setNewName("");
      setNewBasePrice(0);
      setNewStock(0);
      setNewDescription("");
      setNewImg("");
      setNewImages([]);
      setNewTag("");
      setIsModalOpen(false);
      
      setStatusMsg(`¡Producto ${productPayload.sku} registrado exitosamente con ${allImages.length} foto(s)!`);
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Error al registrar el producto. Verifica que el SKU no exista.");
    } finally {
      setIsSaving(false);
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
    setEditSku(product.sku);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditBasePrice(product.basePrice);
    setEditStock(product.stock);
    setEditDescription(product.description || "");
    const existingImgs = product.images && product.images.length > 0 ? product.images : (product.img ? [product.img] : []);
    setEditImages(existingImgs);
    setIsEditModalOpen(true);
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSku) return;

    setIsSaving(true);
    try {
      const primaryImg = editImages.length > 0 ? editImages[0] : undefined;
      const updatedPayload: Partial<Product> = {
        name: editName.trim(),
        category: editCategory,
        basePrice: Number(editBasePrice) || 0,
        stock: Number(editStock) || 0,
        description: editDescription.trim(),
        img: primaryImg,
        images: editImages
      };

      await onUpdateProduct(editSku, updatedPayload);
      setIsEditModalOpen(false);
      setStatusMsg(`¡Producto ${editSku} actualizado completamente!`);
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar los cambios del producto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-white">
            <Package className="w-5 h-5 text-blue-600" />
            Control de Inventario & Gestión de Stock
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Administra el catálogo de repuestos CHOHO, actualiza existencias en tiempo real y registra nuevos productos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Registrar Nuevo Producto</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por SKU o nombre de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 font-semibold">
            <SlidersHorizontal className="w-3 h-3" /> Categoría:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display">
            Lista de Repuestos e Inventario Disponible ({filteredProducts.length})
          </h4>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stock === 0;
            const isLowStock = p.stock > 0 && p.stock < 10;
            const photoCount = p.images?.length || (p.img ? 1 : 0);

            return (
              <div
                key={p.sku}
                className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 hover:border-blue-500/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProtectedImage
                    src={p.img}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                      <span className="text-[9.5px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                        {p.sku}
                      </span>
                      {photoCount > 0 && (
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-800">
                          📷 {photoCount} foto(s)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate font-medium">
                      Categoría: {p.category} • {p.description ? p.description.slice(0, 60) + "..." : "Sin descripción adicional"}
                    </span>
                  </div>
                </div>

                {/* Stock & Actions Controls */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-mono uppercase font-medium">PRECIO BASE</span>
                    <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                      S/ {p.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right min-w-[90px]">
                    <span className="text-[9px] text-slate-400 block font-mono uppercase font-medium">ESTADO STOCK</span>
                    {isOutOfStock ? (
                      <span className="text-xs font-bold text-red-500 font-mono">SIN STOCK (0)</span>
                    ) : isLowStock ? (
                      <span className="text-xs font-bold text-amber-500 font-mono">BAJO ({p.stock})</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{p.stock} Unidades</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartEdit(p)}
                    className="p-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200/60 dark:border-blue-800/60 rounded-xl text-blue-600 dark:text-blue-400 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="Editar producto completo (Nombre, categoría, descripción, fotos, precio, stock)"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Registering a New Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm font-display flex items-center gap-2 text-slate-900 dark:text-white">
                <Plus className="w-4 h-4 text-blue-600" />
                Registrar Nuevo Producto en Catálogo
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CAT-SPROCKET-005"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Categoría *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
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
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cadena Dorada 520H O-Ring 120 Eslabones"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Precio Base (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="125.50"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    placeholder="50"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Descripción Corta</label>
                <textarea
                  rows={2}
                  placeholder="Especificaciones técnicas o compatibilidad de moto..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Fotos del Producto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-600 rounded-xl cursor-pointer flex flex-col items-center justify-center text-center group transition-all">
                    <Upload className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Subir fotos (Multi-Archivo)</span>
                    <span className="text-[9px] text-slate-400">Compresión automática &lt;80 KB c/u</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex flex-col justify-center space-y-1">
                    <input
                      type="url"
                      placeholder="O pega URL de imagen (https://...)"
                      value={newImg.startsWith("data:") ? "" : newImg}
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewImg(e.target.value);
                          setNewImages((prev) => [...prev, e.target.value]);
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                {newImages.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] text-slate-400 font-mono mb-1.5 flex items-center justify-between">
                      <span>Galería cargada ({newImages.length} foto/s):</span>
                      <span className="text-blue-600 font-bold">Foto #1 es Portada</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {newImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden group">
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[7.5px] font-black text-center uppercase">
                              PORTADA
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isCompressing && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Optimizando espacio de imágenes...</span>
                  </div>
                )}

                {compressionInfo && !isCompressing && (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{compressionInfo}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
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

      {/* Modal de Edición Completa de Producto */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 text-left relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white font-display">
                Editar Producto: <span className="text-blue-600 font-mono">{editSku}</span>
              </h3>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Categoría *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {categories.filter(c => c !== "Todos").map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Precio Base (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Stock Disponible *</label>
                  <input
                    type="number"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Descripción Técnica</label>
                <textarea
                  rows={3}
                  placeholder="Especificaciones técnicas, compatibilidad con motores o motocicletas..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* Gallery and Image Upload in Edit Modal */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Imágenes del Producto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-600 rounded-xl cursor-pointer flex flex-col items-center justify-center text-center group transition-all">
                    <Upload className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Agregar Fotos</span>
                    <span className="text-[9px] text-slate-400">Compresión automática &lt;80 KB</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>

                  <div className="flex flex-col justify-center space-y-1">
                    <input
                      type="url"
                      placeholder="Pega URL adicional (https://...)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const target = e.target as HTMLInputElement;
                          if (target.value.trim()) {
                            setEditImages((prev) => [...prev, target.value.trim()]);
                            target.value = "";
                          }
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400">Presiona Enter para agregar URL</span>
                  </div>
                </div>

                {/* Edit Gallery Thumbnails */}
                {editImages.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] text-slate-400 font-mono mb-1.5 flex items-center justify-between">
                      <span>Fotos en Galería ({editImages.length}):</span>
                      <span className="text-blue-600 font-bold">Foto #1 es Portada</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {editImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden group">
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, true)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[7.5px] font-black text-center uppercase">
                              PORTADA
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
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
