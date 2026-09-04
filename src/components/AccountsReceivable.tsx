import React, { useState } from "react";
import { DollarSign, Search, Calendar, FileText, CheckCircle2, ChevronRight, AlertCircle, HandCoins, RefreshCw, Download } from "lucide-react";
import { Quote } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { downloadCSV } from "../utils/exportCsv";

interface AccountsReceivableProps {
  receivables: any[];
  currentUserName: string;
  onRegisterPayment: (invoiceId: string, amount: number, registeredBy: string) => Promise<void>;
}

export function AccountsReceivable({ receivables, currentUserName, onRegisterPayment }: AccountsReceivableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  
  // Payment Modal State
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredReceivables = receivables.filter(r => 
    r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.clientDoc.includes(searchQuery) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDue = receivables.reduce((acc, r) => acc + (r.creditDueAmount || r.total), 0);
  const totalPaid = receivables.reduce((acc, r) => acc + (r.creditPaidAmount || 0), 0);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || paymentAmount <= 0) return;
    
    // Validar monto no mayor a la deuda
    const maxAllowed = selectedInvoice.creditDueAmount || selectedInvoice.total;
    if (paymentAmount > maxAllowed) {
      alert(`El monto máximo a amortizar es S/ ${maxAllowed.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    await onRegisterPayment(selectedInvoice.id, Number(paymentAmount), currentUserName);
    setIsSubmitting(false);
    
    setSelectedInvoice(null);
    setPaymentAmount("");
  };

  const handleExportCSV = () => {
    const csvData = receivables.map(r => ({
      "Comprobante": r.id,
      "Cliente": r.clientName,
      "Documento": r.clientDoc,
      "Fecha": r.date,
      "Estado Crédito": r.creditStatus || "Pendiente",
      "Total Emitido (S/)": (r.total || 0).toFixed(2),
      "Saldo Deudor (S/)": (r.creditDueAmount || r.total || 0).toFixed(2),
      "Total Pagado (S/)": (r.creditPaidAmount || 0).toFixed(2)
    }));
    downloadCSV(csvData, "Reporte_Cuentas_Cobrar");
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-white">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Cuentas por Cobrar (Créditos)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Control financiero de ventas al crédito, amortizaciones y saldos pendientes.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-2 text-right">
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Recaudado</div>
            <div className="text-sm font-mono font-extrabold text-slate-900 dark:text-emerald-100">S/ {totalPaid.toFixed(2)}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-2 text-right">
            <div className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Por Cobrar</div>
            <div className="text-sm font-mono font-extrabold text-[#E51920] dark:text-red-400">S/ {totalDue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, DNI/RUC o N° Comprobante..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none transition-all"
            />
          </div>
          <button onClick={handleExportCSV} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">Comprobante</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Fecha Emisión</th>
                <th className="p-4 text-right">Total Emitido</th>
                <th className="p-4 text-right">Saldo Deudor</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredReceivables.map(r => {
                const total = r.total || 0;
                const dueAmount = r.creditDueAmount !== undefined ? r.creditDueAmount : total;
                const paidAmount = r.creditPaidAmount || 0;
                const status = r.creditStatus || "Pendiente";
                
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-4">
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {r.id}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.clientName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.clientDoc}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {r.date}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">S/ {total.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-sm font-extrabold text-[#E51920] dark:text-red-400">S/ {dueAmount.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        status === 'Pagado Parcial' 
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200' 
                          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(r)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        Cobrar
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredReceivables.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
                      <span className="text-xs">No hay cuentas por cobrar pendientes.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedInvoice(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-md z-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <HandCoins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-display">Registrar Cobranza</h3>
                  <p className="text-xs text-slate-500">Amortización de deuda</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl mb-6 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Comprobante:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-slate-900 dark:text-white max-w-[180px] truncate">{selectedInvoice.clientName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Emitido:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">S/ {(selectedInvoice.total || 0).toFixed(2)}</span>
                </div>
                <div className="pt-3 mt-1 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Deuda Actual:</span>
                  <span className="text-lg font-mono font-extrabold text-[#E51920] dark:text-red-400">
                    S/ {(selectedInvoice.creditDueAmount || selectedInvoice.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRegisterPayment}>
                <div className="space-y-1.5 mb-6">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Monto a Amortizar (S/)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      max={selectedInvoice.creditDueAmount || selectedInvoice.total}
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-lg text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">El monto no puede superar la deuda actual.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !paymentAmount}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar Pago
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
