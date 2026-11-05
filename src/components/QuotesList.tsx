import React, { useState } from "react";
import { ClipboardList, Search, FileText, CheckCircle2, AlertCircle, X, ChevronRight, Clock, MapPin, Printer, Download, MessageCircle } from "lucide-react";
import { Quote } from "../types";
import { downloadCSV } from "../utils/exportCsv";
import { generateQuotePDF, shareQuoteViaWhatsApp } from "../utils/quotePdfGenerator";

interface QuotesListProps {
  quotes: Quote[];
  onUpdateQuoteStatus: (id: string, status: 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Facturada') => Promise<void>;
}

export function QuotesList({ quotes, onUpdateQuoteStatus }: QuotesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [activeDetailQuote, setActiveDetailQuote] = useState<Quote | null>(null);

  const statuses = ["Todos", "Pendiente", "Aceptada", "Facturada", "Rechazada"];

  const quoteList = Array.isArray(quotes) ? quotes : [];
  const filteredQuotes = quoteList.filter((q) => {
    if (!q) return false;
    const clientName = (q.clientName || "").toLowerCase();
    const id = (q.id || "").toLowerCase();
    const clientDoc = q.clientDoc || "";
    const search = (searchTerm || "").toLowerCase();
    const matchesSearch =
      clientName.includes(search) ||
      id.includes(search) ||
      clientDoc.includes(search);
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
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
            <input
              type="text"
              placeholder="Buscar por código de cotización, nombre o RUC cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-subtle focus-visible:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {statuses.map((st) => (
              <button type="button"
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedStatus === st
                    ? "bg-brand text-brand-contrast shadow-md shadow-brand/30"
                    : "bg-surface dark:bg-surface-2 border border-line/60 dark:border-line text-ink-muted hover:text-ink dark:hover:text-ink"
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
        <div className="lg:col-span-2 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4 h-fit">
          <div className="flex justify-between items-center pb-3 border-b border-line">
            <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand-fg" />
              Registro Histórico de Cotizaciones de Campo ({filteredQuotes.length})
            </h4>
            <button type="button" onClick={handleExportCSV} className="px-3 py-1.5 bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <Download className="w-3 h-3" /> Exportar CSV
            </button>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="py-12 text-center text-ink-subtle text-xs">
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
                      ? "border-brand bg-danger-soft/50 dark:bg-danger-soft shadow-xs"
                      : "bg-surface-2 dark:bg-surface-2/40 border-line hover:border-line-strong dark:hover:border-line-strong"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-brand-fg">{q.id}</span>
                      <span className="text-xs text-ink-subtle font-mono">{q.date}</span>
                      <span className={`text-micro font-bold px-2 py-0.5 rounded-full ${
                        q.status === "Aceptada"
                          ? "bg-success-soft/30 text-success-fg border border-success/30"
                          : q.status === "Facturada"
                          ? "bg-brand/10 text-brand-fg border border-brand/30"
                          : q.status === "Rechazada"
                          ? "bg-danger-soft/40 text-danger-fg border border-danger/30"
                          : "bg-warning-soft/40 text-warning-fg border border-warning/30"
                      }`}>
                        {q.status === "Aceptada" ? "Aprobada" : q.status}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-ink mt-1.5 truncate max-w-[280px]">
                      {q.clientName}
                    </h5>
                    <p className="text-xs text-ink-subtle mt-0.5">
                      RUC/DNI: {q.clientDoc} • Asesor: {q.advisor}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <span className="text-micro text-ink-subtle block font-mono font-medium">TOTAL NETO</span>
                      <span className="text-xs font-mono font-extrabold text-ink">
                        S/ {q.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-subtle" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Quote Detail Sidebar Panel */}
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit">
          <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-4">
            Detalle del Documento Comercial
          </h4>

          {activeDetailQuote ? (
            <div className="space-y-5 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-brand-fg font-bold block">{activeDetailQuote.id}</span>
                  <h5 className="text-xs font-bold text-ink mt-1 leading-snug">{activeDetailQuote.clientName}</h5>
                </div>
                <span className={`text-micro font-bold px-2 py-0.5 rounded-full ${
                  activeDetailQuote.status === "Aceptada"
                    ? "bg-success-soft/30 text-success-fg border border-success/30"
                    : activeDetailQuote.status === "Facturada"
                    ? "bg-brand/10 text-brand-fg border border-brand/30"
                    : activeDetailQuote.status === "Rechazada"
                    ? "bg-danger-soft/40 text-danger-fg border border-danger/30"
                    : "bg-warning-soft/40 text-warning-fg border border-warning/30"
                }`}>
                  {activeDetailQuote.status === "Aceptada" ? "Aprobada" : activeDetailQuote.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs border-y border-line py-3.5">
                <div className="flex justify-between">
                  <span className="text-ink-subtle font-medium">RUC/DNI:</span>
                  <span className="font-mono text-ink dark:text-ink-muted font-bold">{activeDetailQuote.clientDoc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-subtle font-medium">Fecha registro:</span>
                  <span className="text-ink dark:text-ink-muted font-semibold">{activeDetailQuote.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-subtle font-medium">Asesor Comercial:</span>
                  <span className="text-ink font-bold">{activeDetailQuote.advisor}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-xs text-ink-subtle font-semibold uppercase font-mono tracking-wider block">Items de Compra</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {activeDetailQuote.items?.map((item) => (
                    <div key={item.sku} className="p-2.5 bg-surface-2 dark:bg-surface-2/60 border border-line rounded-xl text-xs flex justify-between items-center">
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{item.name}</div>
                        <div className="text-xs text-ink-subtle font-mono">Qty: {item.qty} • S/ {item.price.toFixed(2)}</div>
                      </div>
                      <span className="font-mono font-bold text-brand-fg shrink-0 ml-2">
                        S/ {(item.qty * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-line text-xs text-right space-y-1">
                <div className="text-ink-subtle text-xs font-semibold">TOTAL CON IMPUESTOS</div>
                <div className="text-xl font-extrabold font-mono text-brand-fg">
                  S/ {activeDetailQuote.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* PDF & WhatsApp Sharing Actions */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => shareQuoteViaWhatsApp(activeDetailQuote)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Compartir por WhatsApp (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateQuotePDF(activeDetailQuote, { autoDownload: true })}
                  className="w-full bg-surface-2 hover:bg-surface-3 border border-line text-ink text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-brand-fg" />
                  <span>Descargar Documento PDF</span>
                </button>
              </div>

              {/* Quick Status Modifiers */}
              {activeDetailQuote.status === "Pendiente" && (
                <div className="pt-2 flex gap-2">
                  <button type="button"
                    onClick={() => handleStatusChange(activeDetailQuote.id, "Rechazada")}
                    className="flex-1 bg-danger-soft border border-danger/30 text-danger-fg hover:bg-danger-soft/50 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Rechazar
                  </button>
                  <button type="button"
                    onClick={() => handleStatusChange(activeDetailQuote.id, "Aceptada")}
                    className="flex-1 bg-brand hover:bg-brand/90 text-brand-contrast text-xs font-bold py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-brand/30"
                  >
                    Aprobar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-ink-subtle text-xs flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-ink-subtle dark:text-ink" />
              <span>Seleccione cualquier cotización de la lista de auditoría para examinar su desglose tributario e ítems detallados.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
