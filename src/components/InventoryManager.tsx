import React, { useState } from "react";
import { 
  Package, Plus, Search, Edit3, Check, X, AlertTriangle, Sparkles, 
  SlidersHorizontal, RefreshCw, Upload, Image as ImageIcon, ShieldCheck,
  FileSpreadsheet, Download, UploadCloud, FileCheck, AlertCircle, ArrowDownToLine, Info
} from "lucide-react";
import * as XLSX from "xlsx";
import { Product, Categoria } from "../types";
import { compressAndResizeImage } from "../utils/imageOptimizer";
import { ProtectedImage } from "./ProtectedImage";
import { hijosDe, etiquetaClasificacion } from "../utils/categorias";

interface InventoryManagerProps {
  products: Product[];
  categorias: Categoria[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (sku: string, updatedPayload: Partial<Product>) => Promise<void>;
  onRefreshProducts?: (products?: Product[]) => void | Promise<void>;
}

export function InventoryManager({
  products,
  categorias,
  onAddProduct,
  onUpdateProduct,
  onRefreshProducts
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
  // Clasificacion en cascada: Familia -> Sub-familia -> Linea. El producto se
  // guarda con el nodo mas especifico elegido (categoriaId).
  const [newFamilia, setNewFamilia] = useState("");
  const [newSubFamilia, setNewSubFamilia] = useState("");
  const [newLinea, setNewLinea] = useState("");
  const [newBasePrice, setNewBasePrice] = useState<number | "">(0);
  const [newStock, setNewStock] = useState<number | "">(0);
  const [newDescription, setNewDescription] = useState("");
  const [newImg, setNewImg] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Edit Product Form State
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editFamilia, setEditFamilia] = useState("");
  const [editSubFamilia, setEditSubFamilia] = useState("");
  const [editLinea, setEditLinea] = useState("");
  const [editBasePrice, setEditBasePrice] = useState<number | "">(0);
  const [editStock, setEditStock] = useState<number | "">(0);
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);

  const familias = hijosDe(categorias, null);
  /** Barra de filtro: "Todos" mas las familias de primer nivel. */
  const opcionesFamilia = [{ id: "Todos", nombre: "Todos" }, ...familias];
  const newSubFamilias = newFamilia ? hijosDe(categorias, newFamilia) : [];
  const newLineas = newSubFamilia ? hijosDe(categorias, newSubFamilia) : [];
  const editSubFamilias = editFamilia ? hijosDe(categorias, editFamilia) : [];
  const editLineas = editSubFamilia ? hijosDe(categorias, editSubFamilia) : [];

  /** Nodo mas especifico de la cascada: linea > sub-familia > familia. */
  const nodoSeleccionado = (familia: string, subFamilia: string, linea: string) => linea || subFamilia || familia || null;

  // Batch Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [stockMode, setStockMode] = useState<"replace" | "add">("replace");
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const selectClase = "w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none";

  const validParsedItems = parsedItems.filter((i) => i.isValid);
  const newItemsCount = validParsedItems.filter((i) => !i.isExisting).length;
  const existingItemsCount = validParsedItems.filter((i) => i.isExisting).length;
  const invalidItemsCount = parsedItems.filter((i) => !i.isValid).length;

  const normalizeExcelRow = (row: Record<string, any>) => {
    const getCleanVal = (keys: string[]) => {
      const rowKeys = Object.keys(row);
      // Primero coincidencias exactas
      for (const target of keys) {
        for (const k of rowKeys) {
          const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          if (cleanK === target) {
            const val = row[k];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              return val;
            }
          }
        }
      }
      // Luego coincidencias por prefijo
      for (const target of keys) {
        for (const k of rowKeys) {
          const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          if (cleanK.startsWith(target)) {
            const val = row[k];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              return val;
            }
          }
        }
      }
      return "";
    };

    const sku = String(getCleanVal(["sku", "codigo", "item", "cod", "partnumber"])).trim();
    let name = String(getCleanVal(["nombre", "producto", "articulo", "itemname", "name", "descripcioncorta"])).trim();
    const description = String(getCleanVal(["descripcion", "detalle", "observacion", "nota", "desc"])).trim();
    if (!name && description) {
      name = description;
    }

    const categoria = String(getCleanVal(["categoria", "familia", "linea", "rubro", "grupo", "cat"])).trim();
    const priceRaw = getCleanVal(["preciobase", "precio", "baseprice", "pventa", "costo", "price", "valor", "val"]);
    const stockRaw = getCleanVal(["stock", "cantidad", "cant", "qty", "existencia", "inventario"]);
    const tags = String(getCleanVal(["tags", "etiquetas", "etiqueta", "keywords"])).trim();

    // Campos ERP
    const um = String(getCleanVal(["um", "unidadmedida", "unidad", "medida", "unit"])).trim().toUpperCase() || "UND";
    const codFamilia = String(getCleanVal(["codfamilia", "codigofamilia", "codcat"])).trim();
    const rawMoneda = String(getCleanVal(["moneda", "currency", "mone"])).trim().toUpperCase();
    const moneda = (rawMoneda === "MN" || rawMoneda === "SOLES") ? "PEN" : (rawMoneda || "PEN");
    const codPrecio = String(getCleanVal(["codprecio", "codigoprecio", "tarifa"])).trim();
    const tipoPrecio = String(getCleanVal(["tipoprecio", "tipodeprecio", "listaprecio"])).trim();

    const basePrice = Math.max(0, parseFloat(String(priceRaw).replace(/[^0-9.]/g, "")) || 0);
    const stock = Math.max(0, parseInt(String(stockRaw).replace(/[^0-9]/g, ""), 10) || 0);

    return {
      sku,
      name,
      categoria,
      basePrice,
      stock,
      description: description || name,
      tags,
      um,
      codFamilia,
      moneda,
      codPrecio,
      tipoPrecio,
      isValid: Boolean(sku && name)
    };
  };

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        SKU: "CH-428H-118L",
        Nombre: "Cadena CHOHO 428H x 118L Dorada Reforzada",
        Familia: "SISTEMA DE ARRASTRE",
        UM: "UND",
        PrecioBase: 48.50,
        Stock: 50,
        Descripcion: "Cadena reforzada dorada para trabajo pesado con bujes sólidos",
        Tags: "cadena, dorada, 428h, reforzada"
      },
      {
        SKU: "FDC-0001",
        Nombre: "FARO DIRECCIONAL CHOHO FYL-ZXD-03 AMBAR/ROJO",
        Familia: "REPUESTOS",
        UM: "PAR",
        PrecioBase: 15.00,
        Stock: 837,
        Descripcion: "FARO DIRECCIONAL CHOHO FYL-ZXD-03 AMBAR/ROJO (FRENO Y DIRECCION)",
        Tags: "faro, direccional, choho, ambar"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 42 },
      { wch: 22 },
      { wch: 8 },
      { wch: 14 },
      { wch: 10 },
      { wch: 48 },
      { wch: 32 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Inventario");
    XLSX.writeFile(wb, "plantilla_inventario_choho.xlsx");
  };

  const handleExportCurrentInventory = () => {
    if (products.length === 0) {
      alert("No hay productos registrados en el inventario para exportar.");
      return;
    }

    const rows = products.map((p) => {
      const catNombre = etiquetaClasificacion(p) || p.categoriaId || "";
      return {
        SKU: p.sku,
        Nombre: p.name,
        Familia: catNombre,
        UM: p.um || "UND",
        PrecioBase: p.basePrice,
        Stock: p.stock,
        Descripcion: p.description || "",
        Tags: Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "")
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 42 },
      { wch: 22 },
      { wch: 8 },
      { wch: 14 },
      { wch: 10 },
      { wch: 48 },
      { wch: 32 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario_Actual");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `inventario_actual_choho_${today}.xlsx`);
  };

  const processExcelFile = async (file: File) => {
    setImportError(null);
    setImportFile(file);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("El archivo seleccionado no contiene ninguna hoja de cálculo.");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (sheetData.length === 0) {
        throw new Error("El archivo está vacío o no tiene registros de datos.");
      }

      // Detectar automáticamente la fila de encabezados reales (omitiendo cabeceras de reporte institucionales)
      let headerRowIndex = -1;
      for (let r = 0; r < Math.min(sheetData.length, 20); r++) {
        const row = sheetData[r];
        if (Array.isArray(row)) {
          const rowClean = row.map(c => String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""));
          if (rowClean.some(k => k === "codigo" || k === "sku" || k === "partnumber" || k === "item")) {
            headerRowIndex = r;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        headerRowIndex = 0;
      }

      const headers = sheetData[headerRowIndex].map((h: any) => String(h || "").trim());
      const rawRows: Record<string, any>[] = [];
      for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
        const row = sheetData[r];
        if (!row || row.length === 0 || row.every((c: any) => c === "" || c === null || c === undefined)) continue;
        const obj: Record<string, any> = {};
        for (let c = 0; c < headers.length; c++) {
          if (headers[c]) {
            obj[headers[c]] = row[c] !== undefined ? row[c] : "";
          }
        }
        rawRows.push(obj);
      }

      if (rawRows.length === 0) {
        throw new Error("No se encontraron filas de productos debajo del encabezado.");
      }

      const existingSkus = new Set(products.map((p) => p.sku.trim().toLowerCase()));

      const parsed = rawRows.map((row, idx) => {
        const normalized = normalizeExcelRow(row);
        const isExisting = existingSkus.has(normalized.sku.toLowerCase());
        return {
          rowNum: idx + headerRowIndex + 2,
          ...normalized,
          isExisting
        };
      });

      setParsedItems(parsed);
    } catch (err: any) {
      console.error("Error al procesar archivo:", err);
      setImportError(err?.message || "No se pudo leer el archivo. Asegúrate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.");
      setParsedItems([]);
    }
  };

  const handleConfirmBatchImport = async () => {
    const validItems = parsedItems.filter((i) => i.isValid);
    if (validItems.length === 0) {
      alert("No hay productos válidos con SKU y Nombre para importar.");
      return;
    }

    setIsProcessingImport(true);
    setImportError(null);
    try {
      const payload = {
        items: validItems.map((i) => ({
          sku: i.sku,
          name: i.name,
          categoria: i.categoria,
          basePrice: i.basePrice,
          stock: i.stock,
          description: i.description,
          tags: i.tags,
          um: i.um,
          codFamilia: i.codFamilia,
          moneda: i.moneda,
          codPrecio: i.codPrecio,
          tipoPrecio: i.tipoPrecio
        })),
        stockMode
      };

      const res = await fetch("/api/products/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar la importación en el servidor.");
      }

      if (onRefreshProducts) {
        await onRefreshProducts(data.products);
      }

      setStatusMsg(
        `¡Importación exitosa! ${data.insertedCount} nuevos productos creados, ${data.updatedCount} existencias actualizadas en almacén.`
      );
      setTimeout(() => setStatusMsg(""), 6000);

      setIsImportModalOpen(false);
      setImportFile(null);
      setParsedItems([]);
    } catch (err: any) {
      console.error("Error batch import:", err);
      setImportError(err?.message || "No se pudo completar la importación.");
    } finally {
      setIsProcessingImport(false);
    }
  };

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
      setCompressionInfo(`¡${files.length}foto(s) agregada(s) y optimizadas a <80 KB cada una!`);
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
        categoriaId: nodoSeleccionado(newFamilia, newSubFamilia, newLinea),
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
      setNewFamilia("");
      setNewSubFamilia("");
      setNewLinea("");
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
      alert(err.message || "Error al registrar el producto. Verifica que SKU no exista.");
    } finally {
      setIsSaving(false);
    }
  };

  const productList = Array.isArray(products) ? products : [];
  const filteredProducts = productList.filter((p) => {
    if (!p) return false;
    const name = (p.name || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    const search = (searchTerm || "").toLowerCase();
    const matchesSearch = name.includes(search) || sku.includes(search);
    const matchesCategory = selectedCategory === "Todos" || p.categoriaId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartEdit = (product: Product) => {
    setEditSku(product.sku);
    setEditName(product.name);
    // Se reconstruye la cascada desde la ruta resuelta por el servidor.
    setEditFamilia(product.familia?.id || "");
    setEditSubFamilia(product.subFamilia?.id || "");
    setEditLinea(product.linea?.id || (product.categoriaId && !product.familia?.id && !product.subFamilia?.id ? product.categoriaId : ""));
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
        categoriaId: nodoSeleccionado(editFamilia, editSubFamilia, editLinea),
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
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-ink">
            <Package className="w-5 h-5 text-brand-fg" />
            Control de Inventario & Gestión de Stock
          </h3>
          <p className="text-xs text-ink-subtle mt-1">
            Administra el catálogo de repuestos CHOHO, actualiza existencias en tiempo real y registra nuevos productos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="bg-surface-2 hover:bg-surface-3 border border-line text-ink font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
            title="Importar catálogo o actualizar stock masivamente desde Excel o CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Importar / Actualizar con Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-brand hover:bg-brand/90 text-brand-contrast font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-brand/30 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Registrar Nuevo Producto</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-success-soft border border-success/30 dark:border-success/border text-success-fg rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
            <input
              type="text"
              placeholder="Buscar por SKU o nombre de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-10 pr-4 py-2 text-xs text-ink placeholder:text-ink-subtle focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-mono text-ink-subtle uppercase tracking-wider shrink-0 flex items-center gap-1 font-semibold">
            <SlidersHorizontal className="w-3 h-3" /> Familia:
          </span>
          {opcionesFamilia.map((cat) => (
            <button type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                selectedCategory === cat.id
                  ? "bg-brand text-brand-contrast shadow-md shadow-brand/30"
                  : "bg-surface dark:bg-surface-2 border border-line/60 dark:border-line text-ink-muted hover:text-ink dark:hover:text-ink"
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items List Table */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <h4 className="font-extrabold text-sm text-ink font-display">
            Lista de Repuestos e Inventario Disponible ({filteredProducts.length})
          </h4>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((p) => {
            if (!p || typeof p !== "object") return null;
            const stockVal = Number(p.stock) || 0;
            const priceVal = Number(p.basePrice) || 0;
            const isOutOfStock = stockVal === 0;
            const isLowStock = stockVal > 0 && stockVal < 10;
            const photoCount = p.images?.length || (p.img ? 1 : 0);

            return (
              <div
                key={p.sku || Math.random().toString()}
                className="p-4 bg-surface border border-line hover:border-brand/border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProtectedImage
                    src={p.img}
                    alt={p.name || ""}
                    className="max-h-full max-w-full object-contain"
                    containerClassName="w-10 h-10 rounded-xl bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] shrink-0 overflow-hidden"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-ink truncate">{p.name || "Sin Nombre"}</span>
                      <span className="text-micro font-mono font-bold bg-brand-soft dark:bg-surface-2 text-brand-fg px-2 py-0.5 rounded border border-brand/50">
                        {p.sku}
                      </span>
                      {photoCount > 0 && (
                        <span className="text-micro font-mono text-ink-subtle bg-surface-2 dark:bg-surface px-1.5 py-0.5 rounded border border-line/60 dark:border-line">
                          📷 {photoCount} foto(s)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-ink-subtle block mt-0.5 truncate font-medium">
                      Clasificación: {etiquetaClasificacion(p) || "Sin clasificar"} • {p.description ? p.description.slice(0, 60) + "..." : "Sin descripción adicional"}
                    </span>
                  </div>
                </div>

                {/* Stock & Actions Controls */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-line">
                  <div className="text-right">
                    <span className="text-micro text-ink-subtle block font-mono uppercase font-medium">PRECIO BASE</span>
                    <span className="text-xs font-bold font-mono text-brand-fg">
                      {p.moneda === "USD" ? "$ " : "S/ "} {priceVal.toFixed(2)}
                      {p.um && <span className="text-[10px] font-semibold text-ink-subtle ml-1">/ {p.um}</span>}
                    </span>
                  </div>

                  <div className="text-right min-w-[90px]">
                    <span className="text-micro text-ink-subtle block font-mono uppercase font-medium">ESTADO STOCK</span>
                    {isOutOfStock ? (
                      <span className="text-xs font-bold text-danger-fg font-mono">SIN STOCK (0 {p.um || "UND"})</span>
                    ) : isLowStock ? (
                      <span className="text-xs font-bold text-warning-fg font-mono">BAJO ({stockVal} {p.um || "UND"})</span>
                    ) : (
                      <span className="text-xs font-bold text-success-fg font-mono">{stockVal} {p.um || "Unidades"}</span>
                    )}
                  </div>

                  <button type="button"
                    onClick={() => handleStartEdit(p)}
                    className="px-4 py-2 bg-surface-2 dark:bg-surface hover:bg-brand-soft border-none rounded-xl text-brand-fg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="Editar producto completo (Nombre, categoría, descripción, fotos, precio, stock)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-bold text-sm font-display flex items-center gap-2 text-ink">
                <Plus className="w-4 h-4 text-brand-fg" />
                Registrar Nuevo Producto en Catálogo
              </h3>
              <button type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-subtle hover:text-ink p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CAT-SPROCKET-005"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Clasificación *</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-ink-subtle font-medium">Familia</span>
                      <select
                        required
                        value={newFamilia}
                        onChange={(e) => { setNewFamilia(e.target.value); setNewSubFamilia(""); setNewLinea(""); }}
                        className={selectClase}
                      >
                        <option value="">Seleccionar...</option>
                        {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-ink-subtle font-medium">Sub-familia</span>
                      <select
                        value={newSubFamilia}
                        onChange={(e) => { setNewSubFamilia(e.target.value); setNewLinea(""); }}
                        disabled={!newFamilia}
                        className={`${selectClase}disabled:opacity-50`}
                      >
                        <option value="">{newFamilia ? "Seleccionar..." : "Elija una familia"}</option>
                        {newSubFamilias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-ink-subtle font-medium">Línea</span>
                      <select
                        value={newLinea}
                        onChange={(e) => setNewLinea(e.target.value)}
                        disabled={!newSubFamilia}
                        className={`${selectClase}disabled:opacity-50`}
                      >
                        <option value="">{newSubFamilia ? "Seleccionar..." : "Elija una sub-familia"}</option>
                        {newLineas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cadena Dorada 520H O-Ring 120 Eslabones"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Precio Base (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="125.50"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    placeholder="50"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Descripción Corta</label>
                <textarea
                  rows={2}
                  placeholder="Especificaciones técnicas o compatibilidad de moto..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Fotos del Producto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="p-3 bg-surface-2 border border-dashed border-danger/30 dark:border-danger/60 hover:border-brand rounded-xl cursor-pointer flex flex-col items-center justify-center text-center group transition-all">
                    <Upload className="w-4 h-4 text-brand-fg mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-ink">Subir fotos (Multi-Archivo)</span>
                    <span className="text-micro text-ink-subtle">Compresión automática &lt;80 KB c/u</span>
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
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                    />
                  </div>
                </div>

                {newImages.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-ink-subtle font-mono mb-1.5 flex items-center justify-between">
                      <span>Galería cargada ({newImages.length} foto/s):</span>
                      <span className="text-brand-fg font-bold">Foto #1 es Portada</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {newImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-xl bg-surface-2 border-none shrink-0 overflow-hidden group">
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-0.5 right-0.5 bg-danger text-white p-0.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-brand text-brand-contrast text-micro font-black text-center uppercase">
                              PORTADA
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isCompressing && (
 <div className="p-2 bg-danger-soft border border-danger/30 text-danger-fg rounded-xl text-xs font-mono flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Optimizando espacio de imágenes...</span>
                  </div>
                )}

                {compressionInfo && !isCompressing && (
                  <div className="p-2 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-success-fg shrink-0" />
                    <span>{compressionInfo}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 text-left relative">
            <button type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-ink-subtle hover:text-ink dark:hover:text-ink cursor-pointer p-1 rounded-lg hover:bg-field-hover dark:hover:bg-ink"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <Edit3 className="w-5 h-5 text-brand-fg" />
              <h3 className="font-bold text-sm text-ink font-display">
                Editar Producto: <span className="text-brand-fg font-mono">{editSku}</span>
              </h3>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Clasificación *</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-ink-subtle font-medium">Familia</span>
                    <select
                      value={editFamilia}
                      onChange={(e) => { setEditFamilia(e.target.value); setEditSubFamilia(""); setEditLinea(""); }}
                      className={selectClase}
                    >
                      <option value="">Sin clasificar</option>
                      {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-ink-subtle font-medium">Sub-familia</span>
                    <select
                      value={editSubFamilia}
                      onChange={(e) => { setEditSubFamilia(e.target.value); setEditLinea(""); }}
                      disabled={!editFamilia}
                      className={`${selectClase}disabled:opacity-50`}
                    >
                      <option value="">{editFamilia ? "Seleccionar..." : "—"}</option>
                      {editSubFamilias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-ink-subtle font-medium">Línea</span>
                    <select
                      value={editLinea}
                      onChange={(e) => setEditLinea(e.target.value)}
                      disabled={!editSubFamilia}
                      className={`${selectClase}disabled:opacity-50`}
                    >
                      <option value="">{editSubFamilia ? "Seleccionar..." : "—"}</option>
                      {editLineas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Precio Base (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Stock Disponible *</label>
                  <input
                    type="number"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Descripción Técnica</label>
                <textarea
                  rows={3}
                  placeholder="Especificaciones técnicas, compatibilidad con motores o motocicletas..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                />
              </div>

              {/* Gallery and Image Upload in Edit Modal */}
              <div className="space-y-2">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Imágenes del Producto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="p-3 bg-surface-2 border border-dashed border-danger/30 dark:border-danger/60 hover:border-brand rounded-xl cursor-pointer flex flex-col items-center justify-center text-center group transition-all">
                    <Upload className="w-4 h-4 text-brand-fg mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-ink">Agregar Fotos</span>
                    <span className="text-micro text-ink-subtle">Compresión automática &lt;80 KB</span>
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
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                    />
                    <span className="text-micro text-ink-subtle">Presiona Enter para agregar URL</span>
                  </div>
                </div>

                {/* Edit Gallery Thumbnails */}
                {editImages.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-ink-subtle font-mono mb-1.5 flex items-center justify-between">
                      <span>Fotos en Galería ({editImages.length}):</span>
                      <span className="text-brand-fg font-bold">Foto #1 es Portada</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {editImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-xl bg-surface-2 border-none shrink-0 overflow-hidden group">
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, true)}
                            className="absolute top-0.5 right-0.5 bg-danger text-white p-0.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-brand text-brand-contrast text-micro font-black text-center uppercase">
                              PORTADA
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary gap-1.5"
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

      {/* Excel / CSV Batch Import & Stock Update Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-line flex items-center justify-between shrink-0 bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base font-display text-ink flex items-center gap-2">
                    Importar Catálogo y Actualizar Stock Masivo
                  </h3>
                  <p className="text-xs text-ink-subtle">
                    Carga nuevos productos o actualiza existencias y precios desde un archivo Excel (.xlsx, .xls) o CSV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedItems([]);
                  setImportError(null);
                }}
                className="text-ink-subtle hover:text-ink p-1.5 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Template & Export Quick Actions Box */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Info className="w-4 h-4 text-brand-fg" />
                    <span>¿Necesitas una plantilla o descargar los datos actuales?</span>
                  </div>
                  <p className="text-micro text-ink-muted leading-relaxed">
                    Usa la plantilla oficial con el formato de columnas requerido, o exporta el inventario existente para modificar stocks en Excel y cargarlo de nuevo.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-3 border border-line rounded-xl text-xs font-bold text-ink flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Descargar archivo Excel con ejemplos y columnas correctas"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-fg" />
                    <span>Plantilla de Ejemplo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCurrentInventory}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-3 border border-line rounded-xl text-xs font-bold text-ink flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Exportar inventario actual a Excel para editarlo y volver a subirlo"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Exportar Inventario Actual</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop / File Input Box */}
              {!importFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const files = e.dataTransfer.files;
                    if (files && files[0]) {
                      processExcelFile(files[0]);
                    }
                  }}
                  className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    isDraggingFile
                      ? "border-brand bg-brand-soft/40 scale-[1.01]"
                      : "border-line hover:border-brand/50 hover:bg-surface-2/60 bg-surface-2/30"
                  }`}
                >
                  <input
                    type="file"
                    id="excel-file-input"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files[0]) {
                        processExcelFile(files[0]);
                      }
                    }}
                  />
                  <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center w-full">
                    <div className="w-14 h-14 rounded-3xl bg-brand-soft text-brand-fg flex items-center justify-center mb-3">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-ink">
                      Haz clic para seleccionar tu archivo Excel o CSV
                    </span>
                    <span className="text-xs text-ink-subtle mt-1">
                      O arrastra y suelta tu archivo aquí (.xlsx, .xls, .csv)
                    </span>
                    <span className="text-micro font-mono text-ink-muted mt-3 px-3 py-1 bg-surface rounded-full border border-line">
                      Columnas: SKU, Nombre, Categoria, PrecioBase, Stock, Descripcion, Tags
                    </span>
                  </label>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface border border-line flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        <span>{importFile.name}</span>
                        <span className="text-micro font-mono text-ink-subtle">
                          ({(importFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <p className="text-micro text-ink-muted">
                        {parsedItems.length} filas analizadas en el archivo
                      </p>
                    </div>
                  </div>
                  <label
                    htmlFor="excel-file-input-change"
                    className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 border border-line rounded-xl text-xs font-bold text-ink cursor-pointer transition-all"
                  >
                    Cambiar archivo
                    <input
                      type="file"
                      id="excel-file-input-change"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files[0]) {
                          processExcelFile(files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Error Banner */}
              {importError && (
                <div className="p-3 bg-danger-soft border border-danger/30 text-danger-fg rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview & Stock Configuration */}
              {parsedItems.length > 0 && (
                <div className="space-y-4">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-surface-2 border border-line">
                      <div className="text-micro font-bold text-ink-subtle uppercase">Total en Archivo</div>
                      <div className="text-lg font-black text-ink mt-0.5">{parsedItems.length}</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-micro font-bold text-emerald-700 dark:text-emerald-400 uppercase">Nuevos Productos</div>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                        +{newItemsCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                      <div className="text-micro font-bold text-sky-700 dark:text-sky-400 uppercase">A Actualizar</div>
                      <div className="text-lg font-black text-sky-700 dark:text-sky-300 mt-0.5">
                        {existingItemsCount}
                      </div>
                    </div>
                    <div className={`p-3 rounded-2xl ${invalidItemsCount > 0 ? "bg-rose-500/10 border border-rose-500/20" : "bg-surface-2 border border-line opacity-60"}`}>
                      <div className={`text-micro font-bold uppercase ${invalidItemsCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-ink-subtle"}`}>
                        Omitidos (Sin SKU)
                      </div>
                      <div className={`text-lg font-black mt-0.5 ${invalidItemsCount > 0 ? "text-rose-700 dark:text-rose-300" : "text-ink"}`}>
                        {invalidItemsCount}
                      </div>
                    </div>
                  </div>

                  {/* Stock Mode Selector */}
                  <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-3">
                    <label className="text-xs font-bold text-ink block">
                      ¿Cómo deseas actualizar el stock de los productos que ya existen?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setStockMode("replace")}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          stockMode === "replace"
                            ? "bg-surface border-brand shadow-sm ring-2 ring-brand/20"
                            : "bg-surface/50 border-line hover:bg-surface hover:border-line-hover"
                        }`}
                      >
                        <input
                          type="radio"
                          name="stockMode"
                          checked={stockMode === "replace"}
                          onChange={() => setStockMode("replace")}
                          className="mt-1 accent-brand cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-ink">
                            Reemplazar stock exacto
                          </div>
                          <p className="text-micro text-ink-subtle mt-0.5">
                            Fija el stock de almacén al valor exacto del archivo. Ideal para toma física de inventario o auditorías.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => setStockMode("add")}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          stockMode === "add"
                            ? "bg-surface border-brand shadow-sm ring-2 ring-brand/20"
                            : "bg-surface/50 border-line hover:bg-surface hover:border-line-hover"
                        }`}
                      >
                        <input
                          type="radio"
                          name="stockMode"
                          checked={stockMode === "add"}
                          onChange={() => setStockMode("add")}
                          className="mt-1 accent-brand cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-ink">
                            Sumar al stock existente
                          </div>
                          <p className="text-micro text-ink-subtle mt-0.5">
                            Suma la cantidad del archivo al inventario actual. Ideal para recepción de compras o nuevos despachos.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-ink-subtle">
                      <span className="font-bold text-ink">Vista previa de productos ({validParsedItems.length} válidos):</span>
                      <span className="text-micro">Mostrando primeros {Math.min(parsedItems.length, 8)} registros</span>
                    </div>

                    <div className="border border-line rounded-2xl overflow-hidden overflow-x-auto bg-surface">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-2 border-b border-line text-ink-subtle font-mono text-micro uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Estado</th>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3">Nombre</th>
                            <th className="py-2.5 px-3">Categoría</th>
                            <th className="py-2.5 px-3">U.M</th>
                            <th className="py-2.5 px-3 text-right">Precio Base</th>
                            <th className="py-2.5 px-3 text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/60">
                          {parsedItems.slice(0, 8).map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                              <td className="py-2 px-3 whitespace-nowrap">
                                {!item.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                    Incompleto
                                  </span>
                                ) : item.isExisting ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                                    Actualizar
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    Nuevo
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-ink whitespace-nowrap">
                                {item.sku || <span className="text-rose-500 font-normal italic">Vacío</span>}
                              </td>
                              <td className="py-2 px-3 text-ink max-w-[200px] truncate" title={item.name}>
                                {item.name || <span className="text-rose-500 font-normal italic">Vacío</span>}
                              </td>
                              <td className="py-2 px-3 text-ink-muted whitespace-nowrap">
                                {item.categoria || "-"}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-line font-mono text-micro font-bold text-ink">
                                  {item.um || "UND"}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-ink text-right whitespace-nowrap">
                                S/ {item.basePrice.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-ink text-right whitespace-nowrap">
                                {item.stock} {stockMode === "add" && item.isExisting && <span className="text-micro font-normal text-brand-fg">(+)</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedItems.length > 8 && (
                      <p className="text-micro text-ink-subtle text-center italic">
                        ... y {parsedItems.length - 8} filas adicionales se procesarán en lote.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-line flex items-center justify-between gap-3 bg-surface shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedItems([]);
                  setImportError(null);
                }}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-field-hover text-ink text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchImport}
                disabled={validParsedItems.length === 0 || isProcessingImport}
                className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingImport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Procesando Importación...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {validParsedItems.length > 0
                        ? `Confirmar e Importar ${validParsedItems.length} Productos`
                        : "Selecciona un Archivo para Importar"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
