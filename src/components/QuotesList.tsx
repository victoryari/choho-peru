import React, { useState } from "react";
import { ClipboardList, Search, FileText, CheckCircle2, AlertCircle, X, ChevronRight, Clock, MapPin, Printer } from "lucide-react";
import { Quote } from "../types";

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

  return (
    <div className="space-y-6">
      {/* Search and status filter banner */}
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por código de cotización, nombre o RUC de cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedStatus === st
                    ? "bg-sky-500/10 border border-sky-500/30 text-sky-400"
                    : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white"
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
        <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
          <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-sky-400" />
            Registro Histórico de Cotizaciones de Campo ({filteredQuotes.length})
          </h4>

          {filteredQuotes.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No se registran cotizaciones comerciales que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setActiveDetailQuote(q)}
                  className={`p-4 bg-[#0F172A]/40 border rounded-xl flex items-center justify-between gap-4 transition-all text-left cursor-pointer ${
                    activeDetailQuote?.id === q.id
                      ? "border-sky-500 bg-sky-950/5"
                      : "border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-sky-400">{q.id}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{q.date}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        q.status === "Aceptada"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60"
                          : q.status === "Rechazada"
                          ? "bg-red-950 text-red-400 border border-red-900/60"
                          : "bg-amber-950 text-amber-400 border border-amber-900/60"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-gray-200 mt-1 truncate max-w-[280px]">
                      {q.clientName}
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      RUC/DNI: {q.clientDoc} • Asesor: {q.advisor}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <span className="text-[9px] text-gray-500 block">TOTAL NETO</span>
                      <span className="text-xs font-mono font-bold text-gray-200">
                        S/ {q.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Quote Detail Sidebar Panel */}
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl h-fit">
          <h4 className="font-bold text-xs text-gray-200 font-display pb-3 border-b border-slate-700/50 mb-4">
            Detalle del Documento Comercial
          </h4>

          {activeDetailQuote ? (
            <div className="space-y-5 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-sky-400 font-bold block">{activeDetailQuote.id}</span>
                  <h5 className="text-xs font-bold text-gray-200 mt-1 leading-snug">{activeDetailQuote.clientName}</h5>
                </div>
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                  activeDetailQuote.status === "Aceptada"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                    : activeDetailQuote.status === "Rechazada"
                    ? "bg-red-950 text-red-400 border border-red-900"
                    : "bg-amber-950 text-amber-400 border border-amber-900"
                }`}>
                  {activeDetailQuote.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs border-y border-slate-700/50 py-3.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">RUC/DNI:</span>
                  <span className="font-mono text-gray-300 font-medium">{activeDetailQuote.clientDoc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha registro:</span>
                  <span className="text-gray-300">{activeDetailQuote.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Asesor Comercial:</span>
                  <span className="text-gray-300 font-semibold">{activeDetailQuote.advisor}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider block">Items de Compra</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {activeDetailQuote.items?.map((item) => (
                    <div key={item.sku} className="p-2 bg-slate-900/60 border border-slate-800/40 rounded-lg text-xs flex justify-between items-center">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-300 truncate">{item.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">Qty: {item.qty} • S/ {item.price.toFixed(2)}</div>
                      </div>
                      <span className="font-mono font-bold text-gray-300 shrink-0 ml-2">
                        S/ {(item.qty * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/50 text-xs text-right space-y-1">
                <div className="text-gray-500 text-[10px]">TOTAL CON IMPUESTOS</div>
                <div className="text-lg font-bold font-mono text-sky-400">
                  S/ {activeDetailQuote.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Quick Status Modifiers */}
              {activeDetailQuote.status === "Pendiente" && (
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleStatusChange(activeDetailQuote.id, "Rechazada")}
                    className="flex-1 bg-red-950/20 border border-red-900/40 text-red-400 hover:bg-red-950/45 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleStatusChange(activeDetailQuote.id, "Aceptada")}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer shadow-lg"
                  >
                    Aprobar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-gray-700" />
              <span>Seleccione cualquier cotización de la lista de auditoría para examinar su desglose tributario, ítems detallados e historial de firma digital.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
