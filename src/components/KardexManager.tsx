import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  ArrowRightLeft,
  History,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  User,
  ArrowDownRight,
  ArrowUpRight,
  Truck
} from "lucide-react";
import { BranchStock, KardexMovement, BranchTransfer, Product } from "../types";
import { downloadCSV } from "../utils/exportCsv";

interface KardexManagerProps {
  currentUserBranch?: string;
  currentUserName?: string;
  products?: Product[];
}

const BRANCHES = [
  "Sede Lima Centro",
  "Sede Arequipa",
  "Sede Trujillo",
  "Sede Huancayo"
];

export function KardexManager({ currentUserBranch = "Sede Lima Centro", currentUserName = "Administrador CHOHO", products = [] }: KardexManagerProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "movements" | "transfers">("matrix");
  
  // Data States
  const [stockList, setStockList] = useState<BranchStock[]>([]);
  const [movementsList, setMovementsList] = useState<KardexMovement[]>([]);
  const [transfersList, setTransfersList] = useState<BranchTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkuFilter, setSelectedSkuFilter] = useState<string>("ALL");

  // Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustBranch, setAdjustBranch] = useState(currentUserBranch);
  const [adjustSku, setAdjustSku] = useState("");
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustType, setAdjustType] = useState<"AJUSTE_INVENTARIO" | "ENTRADA_COMPRA">("AJUSTE_INVENTARIO");
  const [adjustReason, setAdjustReason] = useState("Regularización por Conteo Físico");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [originBranch, setOriginBranch] = useState(currentUserBranch);
  const [destBranch, setDestBranch] = useState("Sede Arequipa");
  const [transferGuide, setTransferGuide] = useState("");
  const [transferSku, setTransferSku] = useState("");
  const [transferQty, setTransferQty] = useState<number | "">("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [stkRes, movRes, trfRes] = await Promise.all([
        fetch("/api/kardex/stock"),
        fetch("/api/kardex/movements"),
        fetch("/api/transfers")
      ]);

      if (stkRes.ok) setStockList(await stkRes.json());
      if (movRes.ok) setMovementsList(await movRes.json());
      if (trfRes.ok) setTransfersList(await trfRes.json());
    } catch (err: any) {
      console.error("Error cargando datos de kardex:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Stock Metrics
  const totalStockAll = useMemo(() => stockList.reduce((acc, s) => acc + Number(s.stock || 0), 0), [stockList]);
  const limaStock = useMemo(() => stockList.filter(s => s.branch_name.includes("Lima")).reduce((acc, s) => acc + Number(s.stock || 0), 0), [stockList]);
  const provincesStock = totalStockAll - limaStock;
  const lowStockCount = useMemo(() => stockList.filter(s => Number(s.stock) <= Number(s.min_stock)).length, [stockList]);

  // Filtered Stock Matrix
  const filteredStock = useMemo(() => {
    return stockList.filter(item => {
      const matchBranch = selectedBranch === "ALL" || item.branch_name === selectedBranch;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || item.sku.toLowerCase().includes(q) || (item.product_name || "").toLowerCase().includes(q);
      return matchBranch && matchSearch;
    });
  }, [stockList, selectedBranch, searchQuery]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movementsList.filter(mov => {
      const matchBranch = selectedBranch === "ALL" || mov.branch_name === selectedBranch;
      const matchSku = selectedSkuFilter === "ALL" || mov.sku === selectedSkuFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || mov.sku.toLowerCase().includes(q) || (mov.product_name || "").toLowerCase().includes(q) || (mov.document_reference || "").toLowerCase().includes(q);
      return matchBranch && matchSku && matchSearch;
    });
  }, [movementsList, selectedBranch, selectedSkuFilter, searchQuery]);

  // Handle Inventory Adjust
  const handlePerformAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustBranch || !adjustSku || adjustQty === "" || Number(adjustQty) === 0) {
      showNotification("Por favor completa la sede, el SKU y una cantidad válida.", "error");
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await fetch("/api/kardex/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_name: adjustBranch,
          sku: adjustSku,
          quantity: Number(adjustQty),
          movement_type: adjustType,
          reason: adjustReason,
          operator: currentUserName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al realizar ajuste");
      }

      showNotification(`Ajuste registrado: ${adjustSku} en ${adjustBranch} ahora tiene ${data.final_stock} u.`);
      setIsAdjustModalOpen(false);
      setAdjustSku("");
      setAdjustQty("");
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Handle Create Transfer
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originBranch || !destBranch || !transferSku || transferQty === "" || Number(transferQty) <= 0) {
      showNotification("Verifica los datos de la transferencia.", "error");
      return;
    }
    if (originBranch === destBranch) {
      showNotification("La sede de origen y destino no pueden ser la misma.", "error");
      return;
    }

    // Find product name
    const prod = products.find(p => p.sku === transferSku) || stockList.find(s => s.sku === transferSku);
    const prodName = prod?.name || (prod as any)?.product_name || transferSku;

    setIsSubmittingTransfer(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_branch: originBranch,
          destination_branch: destBranch,
          guide_number: transferGuide.trim() || undefined,
          items: [{ sku: transferSku, name: prodName, quantity: Number(transferQty) }],
          requested_by: currentUserName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al solicitar transferencia");
      }

      showNotification(`Transferencia ${data.id} creada en tránsito exitosamente.`);
      setIsTransferModalOpen(false);
      setTransferSku("");
      setTransferQty("");
      setTransferGuide("");
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Handle Receive Transfer
  const handleReceiveTransfer = async (transferId: string) => {
    if (!confirm(`¿Confirmas la recepción física de los ítems de la transferencia ${transferId}? Esta acción sumará el stock al almacén de destino y generará el registro de entrada en Kárdex.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/transfers/${transferId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ received_by: currentUserName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al recibir transferencia");

      showNotification(`Transferencia ${transferId} recibida con éxito.`);
      loadData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Export Movements to CSV
  const handleExportMovementsCSV = () => {
    const csvData = filteredMovements.map(m => ({
      "Fecha / Hora": m.created_at,
      "Sede": m.branch_name,
      "SKU": m.sku,
      "Producto": m.product_name || "",
      "Tipo Movimiento": m.movement_type,
      "Documento / Ref": m.document_reference || "",
      "Saldo Anterior": m.initial_stock,
      "Cantidad (+/-)": m.quantity,
      "Saldo Final": m.final_stock,
      "Operador": m.operator
    }));
    downloadCSV(csvData, `Kardex_CHOHO_${new Date().toISOString().split("T")[0]}`);
  };

  // Find available stock for transfer SKU in origin branch
  const originAvailableStock = useMemo(() => {
    if (!originBranch || !transferSku) return 0;
    const found = stockList.find(s => s.branch_name === originBranch && s.sku === transferSku);
    return found ? Number(found.stock) : 0;
  }, [stockList, originBranch, transferSku]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner & Title */}
      <div className="bg-surface border border-line shadow-xs rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-brand/10 dark:bg-brand/20 text-brand-fg rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-extrabold text-ink font-display">
              Kárdex Físico Multisede & Transferencias Internas
            </h2>
          </div>
          <p className="text-xs text-ink-subtle mt-1">
            Control de inventario permanente, trazabilidad inmutable de entradas/salidas y traslados entre sedes de CHOHO Perú.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn-secondary px-3 py-2 text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 border-brand/30 text-brand-fg hover:bg-brand/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajuste de Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Nueva Transferencia</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-all ${
          feedback.type === "success" 
            ? "bg-success-soft border-success/30 text-success-fg" 
            : "bg-danger-soft border-danger/30 text-danger-fg"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs">
          <span className="text-micro font-extrabold text-ink-subtle uppercase tracking-wider">Total en Red Nacional</span>
          <div className="text-2xl font-black font-mono text-ink mt-1">
            {totalStockAll.toLocaleString()} <span className="text-xs font-normal text-ink-subtle">und</span>
          </div>
          <span className="text-micro text-ink-muted">Suma de todas las sedes</span>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs">
          <span className="text-micro font-extrabold text-ink-subtle uppercase tracking-wider">Almacén Central (Lima)</span>
          <div className="text-2xl font-black font-mono text-brand-fg mt-1">
            {limaStock.toLocaleString()} <span className="text-xs font-normal text-ink-subtle">und</span>
          </div>
          <span className="text-micro text-ink-muted">{((limaStock / (totalStockAll || 1)) * 100).toFixed(0)}% del stock nacional</span>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs">
          <span className="text-micro font-extrabold text-ink-subtle uppercase tracking-wider">Sedes Provincias</span>
          <div className="text-2xl font-black font-mono text-success-fg mt-1">
            {provincesStock.toLocaleString()} <span className="text-xs font-normal text-ink-subtle">und</span>
          </div>
          <span className="text-micro text-ink-muted">Arequipa, Trujillo, Huancayo</span>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs">
          <span className="text-micro font-extrabold text-ink-subtle uppercase tracking-wider">Alertas Stock Mínimo</span>
          <div className={`text-2xl font-black font-mono mt-1 ${lowStockCount > 0 ? "text-warning-fg" : "text-ink"}`}>
            {lowStockCount} <span className="text-xs font-normal text-ink-subtle">ítems</span>
          </div>
          <span className="text-micro text-ink-muted">Existencias ≤ stock de seguridad</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "matrix"
              ? "border-brand-fg text-brand-fg"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matriz de Stock por Sede</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-micro font-mono">
            {filteredStock.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "movements"
              ? "border-brand-fg text-brand-fg"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Libro Kárdex Inmutable</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-micro font-mono">
            {filteredMovements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transfers")}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "transfers"
              ? "border-brand-fg text-brand-fg"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transferencias entre Sedes</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-micro font-mono">
            {transfersList.length}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface border border-line rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-subtle" />
            <input
              type="text"
              placeholder="Buscar por SKU, descripción de repuesto o referencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-2 border border-line rounded-lg text-xs font-medium focus-visible:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-ink-subtle hidden sm:block" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Filtrar por sede"
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-xs font-bold text-ink focus-visible:outline-none"
            >
              <option value="ALL">Todas las Sedes</option>
              {BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {activeTab === "movements" && (
            <select
              value={selectedSkuFilter}
              onChange={(e) => setSelectedSkuFilter(e.target.value)}
              aria-label="Filtrar por SKU"
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-xs font-bold text-ink focus-visible:outline-none max-w-[180px] truncate"
            >
              <option value="ALL">Todos los SKUs</option>
              {Array.from(new Set(stockList.map(s => s.sku))).map(sku => (
                <option key={sku} value={sku}>{sku}</option>
              ))}
            </select>
          )}
        </div>

        {activeTab === "movements" && (
          <button
            type="button"
            onClick={handleExportMovementsCSV}
            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2 shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-success-fg" />
            <span>Exportar Kárdex CSV</span>
          </button>
        )}
      </div>

      {/* TAB 1: MATRIZ DE STOCK MULTISEDE */}
      {activeTab === "matrix" && (
        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 border-b border-line text-ink-subtle font-extrabold uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU / Código</th>
                  <th className="py-3 px-4">Descripción del Repuesto</th>
                  <th className="py-3 px-4">Sede Física</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Mínimo</th>
                  <th className="py-3 px-4">Ubicación / Rack</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredStock.map((item, idx) => {
                  const stockNum = Number(item.stock);
                  const minNum = Number(item.min_stock);
                  const isCrit = stockNum <= minNum;
                  const isOut = stockNum === 0;

                  return (
                    <tr key={`${item.branch_name}-${item.sku}-${idx}`} className="hover:bg-surface-2/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-ink">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="font-bold text-ink truncate">{item.product_name || item.sku}</div>
                        <span className="text-micro text-ink-subtle uppercase">{item.um || "UND"}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-ink flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-ink-subtle" />
                        <span>{item.branch_name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sm">
                        <span className={isOut ? "text-danger-fg" : isCrit ? "text-warning-fg" : "text-ink"}>
                          {stockNum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-ink-muted">
                        {minNum}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted">
                        {item.location_rack || "A-01"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-micro font-extrabold bg-danger-soft text-danger-fg border border-danger/30">
                            Agotado
                          </span>
                        ) : isCrit ? (
                          <span className="px-2 py-0.5 rounded-full text-micro font-extrabold bg-warning-soft text-warning-fg border border-warning/30">
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-micro font-extrabold bg-success-soft text-success-fg border border-success/30">
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustBranch(item.branch_name);
                            setAdjustSku(item.sku);
                            setIsAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-micro font-bold border border-line bg-surface hover:bg-surface-2 text-ink transition-colors cursor-pointer"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ink-subtle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="w-8 h-8 text-ink-subtle opacity-40" />
                        <span>No se encontraron registros de stock para los filtros seleccionados.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIBRO KÁRDEX INMUTABLE */}
      {activeTab === "movements" && (
        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 border-b border-line text-ink-subtle font-extrabold uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Sede</th>
                  <th className="py-3 px-4">SKU / Producto</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4">Doc. Referencia</th>
                  <th className="py-3 px-4 text-right">Saldo Ant.</th>
                  <th className="py-3 px-4 text-right">Movimiento</th>
                  <th className="py-3 px-4 text-right">Saldo Final</th>
                  <th className="py-3 px-4">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredMovements.map((mov) => {
                  const isPositive = Number(mov.quantity) > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-ink-muted whitespace-nowrap">
                        {mov.created_at ? new Date(mov.created_at).toLocaleString("es-PE") : "-"}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink whitespace-nowrap">
                        {mov.branch_name}
                      </td>
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-mono font-bold text-ink">{mov.sku}</div>
                        <div className="text-micro text-ink-subtle truncate">{mov.product_name}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold border ${
                          mov.movement_type.includes("ENTRADA") || mov.movement_type.includes("COMPRA")
                            ? "bg-success-soft text-success-fg border-success/30"
                            : mov.movement_type.includes("SALIDA") || mov.movement_type.includes("VENTA")
                            ? "bg-brand/10 text-brand-fg border-brand/20"
                            : "bg-warning-soft text-warning-fg border-warning/30"
                        }`}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {mov.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-ink whitespace-nowrap">
                        {mov.document_reference || "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-ink-muted">
                        {mov.initial_stock}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sm">
                        <span className={isPositive ? "text-success-fg" : "text-brand-fg"}>
                          {isPositive ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-ink">
                        {mov.final_stock}
                      </td>
                      <td className="py-3 px-4 text-ink-muted font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-ink-subtle" />
                          <span>{mov.operator}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-ink-subtle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="w-8 h-8 text-ink-subtle opacity-40" />
                        <span>No hay movimientos registrados para los filtros aplicados.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERENCIAS ENTRE SEDES */}
      {activeTab === "transfers" && (
        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 border-b border-line text-ink-subtle font-extrabold uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID Transferencia</th>
                  <th className="py-3 px-4">Sede Origen ➔ Destino</th>
                  <th className="py-3 px-4">Fecha Solicitud</th>
                  <th className="py-3 px-4">Ítems & Cantidad</th>
                  <th className="py-3 px-4">Guía Remisión</th>
                  <th className="py-3 px-4">Solicitado Por</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transfersList.map((trf) => {
                  const isTransit = trf.status === "EN_TRANSITO";
                  const isReceived = trf.status === "RECIBIDO";

                  return (
                    <tr key={trf.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-extrabold text-brand-fg">
                        {trf.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-ink">
                          <span>{trf.origin_branch}</span>
                          <ArrowRightLeft className="w-3 h-3 text-ink-subtle" />
                          <span className="text-brand-fg">{trf.destination_branch}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted whitespace-nowrap">
                        {trf.created_at ? new Date(trf.created_at).toLocaleDateString("es-PE") : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {trf.items.map((it, i) => (
                            <div key={i} className="text-ink">
                              <span className="font-mono font-bold text-ink">{it.sku}</span>: {it.quantity} u.
                              <span className="text-micro text-ink-subtle ml-1">({it.name})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted">
                        {trf.guide_number ? (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-brand-fg" />
                            {trf.guide_number}
                          </span>
                        ) : (
                          <span className="text-ink-subtle">Sin Guía</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-ink font-medium">
                        {trf.requested_by}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-micro font-extrabold border ${
                          isTransit 
                            ? "bg-warning-soft text-warning-fg border-warning/30" 
                            : isReceived 
                            ? "bg-success-soft text-success-fg border-success/30" 
                            : "bg-surface-2 text-ink-subtle border-line"
                        }`}>
                          {trf.status}
                        </span>
                        {isReceived && trf.received_by && (
                          <div className="text-[10px] text-ink-subtle mt-0.5">
                            Por: {trf.received_by}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isTransit && (
                          <button
                            type="button"
                            onClick={() => handleReceiveTransfer(trf.id)}
                            className="btn-primary py-1 px-2.5 text-micro flex items-center gap-1 mx-auto"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirmar Recepción</span>
                          </button>
                        )}
                        {isReceived && (
                          <span className="text-micro font-bold text-success-fg flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Kárdex Actualizado</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {transfersList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ink-subtle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ArrowRightLeft className="w-8 h-8 text-ink-subtle opacity-40" />
                        <span>No hay transferencias entre sedes registradas.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE DE INVENTARIO FÍSICO */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-surface border border-line rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-brand-fg" />
                <h3 className="font-extrabold text-base font-display text-ink">Ajuste de Stock Físico</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2 text-ink-subtle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePerformAdjust} className="space-y-3">
              <div>
                <label className="text-micro font-extrabold text-ink-subtle uppercase">Sede Física</label>
                <select
                  value={adjustBranch}
                  onChange={(e) => setAdjustBranch(e.target.value)}
                  className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                >
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-micro font-extrabold text-ink-subtle uppercase">SKU / Repuesto</label>
                <select
                  value={adjustSku}
                  onChange={(e) => setAdjustSku(e.target.value)}
                  required
                  className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                >
                  <option value="">Selecciona SKU...</option>
                  {stockList
                    .filter(s => s.branch_name === adjustBranch)
                    .map(s => (
                      <option key={s.sku} value={s.sku}>
                        {s.sku} - {s.product_name || s.sku} (Stock actual: {s.stock} u.)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-micro font-extrabold text-ink-subtle uppercase">Tipo de Ajuste</label>
                  <select
                    value={adjustType}
                    onChange={(e: any) => setAdjustType(e.target.value)}
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                  >
                    <option value="AJUSTE_INVENTARIO">Ajuste / Conteo</option>
                    <option value="ENTRADA_COMPRA">Entrada por Compra</option>
                  </select>
                </div>
                <div>
                  <label className="text-micro font-extrabold text-ink-subtle uppercase">Cantidad (+/-)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 5 o -2"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink focus-visible:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-micro font-extrabold text-ink-subtle uppercase">Motivo / Justificación</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ej: Regularización por conteo físico cíclico"
                  className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 btn-secondary py-2 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="flex-1 btn-primary py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {isSubmittingAdjust ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Aplicar Ajuste</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA TRANSFERENCIA ENTRE SEDES */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-surface border border-line rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-brand-fg" />
                <h3 className="font-extrabold text-base font-display text-ink">Solicitar Traslado de Mercadería</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2 text-ink-subtle"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-micro font-extrabold text-ink-subtle uppercase">Sede de Origen</label>
                  <select
                    value={originBranch}
                    onChange={(e) => setOriginBranch(e.target.value)}
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                  >
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-micro font-extrabold text-ink-subtle uppercase">Sede de Destino</label>
                  <select
                    value={destBranch}
                    onChange={(e) => setDestBranch(e.target.value)}
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                  >
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-micro font-extrabold text-ink-subtle uppercase">SKU a Trasladar</label>
                <select
                  value={transferSku}
                  onChange={(e) => setTransferSku(e.target.value)}
                  required
                  className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                >
                  <option value="">Selecciona SKU a transferir...</option>
                  {stockList
                    .filter(s => s.branch_name === originBranch && Number(s.stock) > 0)
                    .map(s => (
                      <option key={s.sku} value={s.sku}>
                        {s.sku} - {s.product_name || s.sku} (Disp: {s.stock} u.)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-micro font-extrabold text-ink-subtle uppercase">Cantidad</label>
                    {transferSku && (
                      <span className="text-micro text-ink-subtle font-mono">
                        Máx: {originAvailableStock} u.
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    max={originAvailableStock}
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Cantidad de unidades"
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink focus-visible:outline-none"
                  />
                </div>

                <div>
                  <label className="text-micro font-extrabold text-ink-subtle uppercase">Guía Remisión (Opcional)</label>
                  <input
                    type="text"
                    value={transferGuide}
                    onChange={(e) => setTransferGuide(e.target.value)}
                    placeholder="Ej: T001-00000045"
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl text-micro text-ink-muted">
                <span className="font-bold text-brand-fg">Regla de Kárdex:</span> Al despachar se generará automáticamente el movimiento <code className="font-mono">TRANSFERENCIA_SALIDA</code> en {originBranch}. Cuando {destBranch} confirme la recepción, se acreditará el stock con <code className="font-mono">TRANSFERENCIA_ENTRADA</code>.
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 btn-secondary py-2 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer || !transferSku || !transferQty || Number(transferQty) > originAvailableStock}
                  className="flex-1 btn-primary py-2 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingTransfer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                  <span>Despachar Traslado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
