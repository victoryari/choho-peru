import React, { useState } from "react";
import { ClipboardList, Search, FileText, CheckCircle2, AlertCircle, X, ChevronRight, Clock, MapPin, Printer, Download } from "lucide-react";
import { Quote } from "../types";
import { downloadCSV } from "../utils/exportCsv";

interface QuotesListProps {
  quotes: Quote[];
  onUpdateQuoteStatus: (id: string, status: 'Pendiente' | 'Aceptada' | 'Rechazada') => Promise<void>;
}

export function QuotesList({ quotes, onUpdateQuoteStatus }: QuotesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [activeDetailQuote, setActiveDetailQuote] = useState<Quote | null>(null);

  const statuses = ["Todos", "Pendiente", "Aceptada", "Rechazada"];

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.clientDoc.includes(searchTerm);
    const matchesStatus = selectedStatus === "Todos" || q.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, nextStatus: 'Pendiente' | 'Aceptada' | 'Rechazada') => {
    await onUpdateQuoteStatus(id, nextStatus);
    if (activeDetailQuote?.id === id) {
      setActiveDetailQuote(prev => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  const handleExportCSV = () => {
    const csvData = quotes.map(q => ({
      "ID": q.id,
      "Fecha": q.date,
      "Cliente": q.clientName,
      "Documento": q.clientDoc,
      "Estado": q.status,
      "Subtotal (S/)": q.subtotal.toFixed(2),
      "Total (S/)": q.total.toFixed(2),
      "Vendedor": q.assignedTo
    }));
    downloadCSV(csvData, "Reporte_Cotizaciones");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search and status filter banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código de cotización, nombre o RUC de cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedStatus === st
                    ? "bg-[#E51920] text-white shadow-md shadow-red-600/25"
                    : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 h-fit">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#E51920]" />
              Registro Histórico de Cotizaciones de Campo ({filteredQuotes.length})
            </h4>
            <button onClick={handleExportCSV} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <Download className="w-3 h-3" /> Exportar CSV
            </button>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se registran cotizaciones comerciales que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setActiveDetailQuote(q)}
                  className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition-all text-left cursor-pointer ${
                    activeDetailQuote?.id === q.id
                      ? "border-[#E51920] bg-red-50/50 dark:bg-red-950/20 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-[#E51920] dark:text-red-400">{q.id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{q.date}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        q.status === "Aceptada"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                          : q.status === "Rechazada"
                          ? "bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800/60"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate max-w-[280px]">
                      {q.clientName}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      RUC/DNI: {q.clientDoc} • Asesor: {q.advisor}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono font-medium">TOTAL NETO</span>
                      <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        S/ {q.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Quote Detail Sidebar Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            Detalle del Documento Comercial
          </h4>

          {activeDetailQuote ? (
            <div className="space-y-5 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#E51920] dark:text-red-400 font-bold block">{activeDetailQuote.id}</span>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug">{activeDetailQuote.clientName}</h5>
                </div>
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                  activeDetailQuote.status === "Aceptada"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200"
                    : activeDetailQuote.status === "Rechazada"
                    ? "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400 border border-red-200"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 border border-amber-200"
                }`}>
                  {activeDetailQuote.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs border-y border-slate-100 dark:border-slate-800 py-3.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">RUC/DNI:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{activeDetailQuote.clientDoc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Fecha registro:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{activeDetailQuote.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Asesor Comercial:</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">{activeDetailQuote.advisor}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono tracking-wider block">Items de Compra</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {activeDetailQuote.items?.map((item) => (
                    <div key={item.sku} className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-xl text-xs flex justify-between items-center">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Qty: {item.qty} • S/ {item.price.toFixed(2)}</div>
                      </div>
                      <span className="font-mono font-bold text-[#E51920] dark:text-red-400 shrink-0 ml-2">
                        S/ {(item.qty * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-right space-y-1">
                <div className="text-slate-400 text-[10px] font-semibold">TOTAL CON IMPUESTOS</div>
                <div className="text-xl font-extrabold font-mono text-[#E51920] dark:text-red-400">
                  S/ {activeDetailQuote.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Quick Status Modifiers */}
              {activeDetailQuote.status === "Pendiente" && (
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleStatusChange(activeDetailQuote.id, "Rechazada")}
                    className="flex-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleStatusChange(activeDetailQuote.id, "Aceptada")}
                    className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/25"
                  >
                    Aprobar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <span>Seleccione cualquier cotización de la lista de auditoría para examinar su desglose tributario e ítems detallados.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
