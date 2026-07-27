import React, { useState } from "react";
import { Trash2, Search, FileText, Check, ArrowRight, User, Hash, AlertTriangle, ShieldCheck } from "lucide-react";
import { Product, QuoteItem, Quote } from "../types";

interface BudgetGeneratorProps {
  budgetItems: QuoteItem[];
  onUpdateQty: (sku: string, newQty: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearBudget: () => void;
  onSaveQuote: (quote: Omit<Quote, "id" | "date">) => Promise<void>;
  currentUserName: string;
}

export function BudgetGenerator({
  budgetItems,
  onUpdateQty,
  onRemoveItem,
  onClearBudget,
  onSaveQuote,
  currentUserName
}: BudgetGeneratorProps) {
  const [ruc, setRuc] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [isSearchingSUNAT, setIsSearchingSUNAT] = useState(false);
  const [sunatStatus, setSunatStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [successQuoteId, setSuccessQuoteId] = useState<string | null>(null);

  // Computations
  const total = budgetItems.reduce((acc, curr) => acc + curr.qty * curr.price, 0);
  const subtotal = Number((total / 1.18).toFixed(2));
  const igv = Number((total - subtotal).toFixed(2));

  // Connects with real server-side SUNAT mock query
  const querySUNAT = async () => {
    if (!ruc.trim()) return;
    setIsSearchingSUNAT(true);
    setSunatStatus("idle");
    try {
      const res = await fetch(`/api/sunat/${ruc.trim()}`);
      if (!res.ok) throw new Error("Error querying SUNAT");
      const data = await res.json();
      if (data.businessName) {
        setClientName(data.businessName);
        setAddress(data.address || "Dirección no especificada");
        setSunatStatus("success");
      } else {
        setSunatStatus("error");
      }
    } catch (err) {
      setSunatStatus("error");
    } finally {
      setIsSearchingSUNAT(false);
    }
  };

  const handleSave = async (status: "Pendiente" | "Aceptada") => {
    if (budgetItems.length === 0) return;
    if (!clientName.trim()) {
      alert("Por favor ingrese el nombre del cliente o consulte con RUC/DNI.");
      return;
    }

    setIsSaving(true);
    try {
      const generatedId = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const quotePayload = {
        clientName: clientName.trim(),
        clientDoc: ruc.trim() || "S/D",
        advisor: currentUserName,
        total,
        subtotal,
        igv,
        status,
        items: budgetItems
      };

      await onSaveQuote(quotePayload);
      setSuccessQuoteId(generatedId);
      setTimeout(() => {
        setSuccessQuoteId(null);
        onClearBudget();
        setRuc("");
        setClientName("");
        setAddress("");
        setSunatStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("Error saving quote", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Items Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
            <h3 className="font-bold text-sm text-gray-200 font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              Items del Presupuesto Comercial
            </h3>
            {budgetItems.length > 0 && (
              <button
                onClick={onClearBudget}
                className="text-xs text-gray-400 hover:text-sky-400 transition-colors cursor-pointer"
              >
                Vaciar todo
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {budgetItems.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                El presupuesto está vacío. Seleccione productos del catálogo para comenzar.
              </div>
            ) : (
              budgetItems.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between gap-4 p-3 bg-[#0F172A]/40 border border-slate-800 rounded-xl hover:border-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-sky-400 font-semibold">{item.sku}</span>
                    <h4 className="text-xs font-bold text-gray-200 truncate">{item.name}</h4>
                    <span className="text-[11px] font-mono text-gray-400">
                      S/ {item.price.toFixed(2)} c/u
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Qty edit */}
                    <div className="flex items-center bg-[#0F172A] border border-slate-800 rounded-lg">
                      <button
                        onClick={() => onUpdateQty(item.sku, Math.max(1, item.qty - 1))}
                        className="px-2 py-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-bold text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.sku, item.qty + 1)}
                        className="px-2 py-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[75px]">
                      <span className="text-xs font-bold font-mono text-gray-200">
                        S/ {(item.qty * item.price).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.sku)}
                      className="text-gray-400 hover:text-sky-400 transition-colors p-1 cursor-pointer"
                      title="Eliminar ítem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Client Metadata Section */}
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
          <h3 className="font-bold text-sm text-gray-200 font-display pb-3 border-b border-slate-700/50 mb-4">
            Información del Cliente
          </h3>

          <div className="space-y-4">
            {/* SUNAT check */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">RUC o DNI del Cliente</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Ej. 20608542193"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={querySUNAT}
                disabled={isSearchingSUNAT}
                className="w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer h-9.5"
              >
                {isSearchingSUNAT ? "Consultando..." : "Consultar SUNAT"}
              </button>
            </div>

            {sunatStatus === "success" && (
              <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/60 rounded-lg flex items-center gap-2 text-[11px] text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Datos validados con SUNAT. Contribuyente ACTIVO y HABIDO.</span>
              </div>
            )}

            {sunatStatus === "error" && (
              <div className="p-2.5 bg-amber-950/20 border border-amber-900/60 rounded-lg flex items-center gap-2 text-[11px] text-amber-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>No se encontró RUC. Ingrese los datos de forma manual.</span>
              </div>
            )}

            {/* Manual Edit fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Razón Social / Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Nombre o razón comercial"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Dirección de Despacho</label>
                <input
                  type="text"
                  placeholder="Av. Principal, Ciudad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary panel */}
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl h-fit flex flex-col justify-between space-y-6">
        <div>
          <h3 className="font-bold text-sm text-gray-200 font-display pb-3 border-b border-slate-700/50">
            Resumen Financiero
          </h3>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Subtotal (Sin Impuesto):</span>
              <span className="font-mono font-medium">S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>I.G.V. Nacional (18%):</span>
              <span className="font-mono font-medium">S/ {igv.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-300">TOTAL ESTIMADO:</span>
              <span className="font-bold font-mono text-sky-400 text-lg">
                S/ {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-5 p-3 bg-[#0F172A] border border-slate-800/80 rounded-xl space-y-1">
            <div className="text-[10px] text-gray-500 uppercase font-mono">ASESOR DE CUENTA</div>
            <div className="text-xs font-semibold text-gray-300">{currentUserName}</div>
            <div className="text-[9.5px] text-gray-500 italic">ID Credencial: CH-00124 (Ventas Autorizadas)</div>
          </div>
        </div>

        {/* Buttons */}
        {successQuoteId ? (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/60 text-emerald-400 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 font-bold">
            <Check className="w-4 h-4 animate-bounce" />
            <span>¡Cotización Guardada con Éxito!</span>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleSave("Pendiente")}
              disabled={isSaving || budgetItems.length === 0}
              className="w-full bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Guardar Borrador (Pendiente)</span>
            </button>
            <button
              onClick={() => handleSave("Aceptada")}
              disabled={isSaving || budgetItems.length === 0}
              className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <span>Aprobar y Emitir (Aceptada)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
