import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Search,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  HandCoins,
  RefreshCw,
  Download,
  ShieldCheck,
  Building2,
  CreditCard,
  Image as ImageIcon,
  ExternalLink,
  X,
  AlertTriangle
} from "lucide-react";
import { Quote, CompanyBankAccount, ReconciledPayment } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { downloadCSV } from "../utils/exportCsv";

interface AccountsReceivableProps {
  receivables: any[];
  currentUserName: string;
  onRegisterPayment: (
    invoiceId: string,
    amount: number,
    registeredBy: string,
    paymentDate?: string,
    paymentDetails?: {
      bank_id?: string;
      payment_method?: string;
      operation_number?: string;
      voucher_image?: string;
    }
  ) => Promise<void>;
}

export function getCommissionBracketInfo(invoiceDateStr?: string, payDateStr?: string) {
  if (!invoiceDateStr) return { days: 0, range: "Hasta 45 días", rate: 4.0, isLost: false, badgeClass: "bg-success-soft text-success-fg border-success/30", label: "1er Rango (4%)" };
  const invDate = new Date(invoiceDateStr.split("T")[0] + "T00:00:00");
  const payDate = payDateStr ? new Date(payDateStr.split("T")[0] + "T00:00:00") : new Date();
  const diffMs = Math.max(0, payDate.getTime() - invDate.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (days <= 45) {
    return { days, range: "Hasta 45 días", rate: 4.0, isLost: false, badgeClass: "bg-success-soft text-success-fg border-success/30", label: "1er Rango (4%)" };
  } else if (days <= 50) {
    return { days, range: "46 a 50 días", rate: 3.0, isLost: false, badgeClass: "bg-warning-soft text-warning-fg border-warning/30", label: "2do Rango (3%)" };
  } else if (days <= 60) {
    return { days, range: "51 a 60 días", rate: 2.0, isLost: false, badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40", label: "3er Rango (2%)" };
  } else {
    return { days, range: "+ de 60 días", rate: 0.0, isLost: true, badgeClass: "bg-danger-soft text-danger-fg border-danger/30", label: "Perdida (>60d: 0%)" };
  }
}

export function AccountsReceivable({ receivables, currentUserName, onRegisterPayment }: AccountsReceivableProps) {
  const [activeTab, setActiveTab] = useState<"credits" | "reconciliation">("credits");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  
  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [bankId, setBankId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Transferencia");
  const [operationNumber, setOperationNumber] = useState<string>("");
  const [voucherImage, setVoucherImage] = useState<string>("");
  const [antifraudError, setAntifraudError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank Accounts & Reconciled Payments from Backend
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [reconciledPayments, setReconciledPayments] = useState<ReconciledPayment[]>([]);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);
  const [previewVoucher, setPreviewVoucher] = useState<string | null>(null);

  // Load Bank Accounts and Reconciliation data
  const loadBankAccounts = async () => {
    try {
      const res = await fetch("/api/company-bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data);
        if (data.length > 0 && !bankId) {
          setBankId(data[0].id);
        }
      }
    } catch (e) {
      console.warn("Error cargando cuentas bancarias:", e);
    }
  };

  const loadReconciliationPayments = async () => {
    setLoadingReconciliation(true);
    try {
      const res = await fetch("/api/payments/reconciliation");
      if (res.ok) {
        setReconciledPayments(await res.json());
      }
    } catch (e) {
      console.warn("Error cargando pagos para conciliación:", e);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  useEffect(() => {
    loadBankAccounts();
    loadReconciliationPayments();
  }, []);

  const safeReceivables = Array.isArray(receivables) ? receivables : [];
  const filteredReceivables = safeReceivables.filter(r => {
    if (!r) return false;
    const clientName = (r.clientName || "").toLowerCase();
    const clientDoc = r.clientDoc || "";
    const id = (r.id || "").toLowerCase();
    const query = (searchQuery || "").toLowerCase();
    return clientName.includes(query) || clientDoc.includes(searchQuery) || id.includes(query);
  });

  const totalDue = receivables.reduce((acc, r) => acc + (r.creditDueAmount || r.total), 0);
  const totalPaid = receivables.reduce((acc, r) => acc + (r.creditPaidAmount || 0), 0);

  // Handle Voucher Upload
  const handleVoucherUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("El voucher no debe superar los 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setVoucherImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAntifraudError(null);
    if (!selectedInvoice || !paymentAmount || paymentAmount <= 0) return;
    
    const maxAllowed = selectedInvoice.creditDueAmount || selectedInvoice.total;
    if (paymentAmount > maxAllowed) {
      alert(`El monto máximo a amortizar es S/${maxAllowed.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onRegisterPayment(
        selectedInvoice.id,
        Number(paymentAmount),
        currentUserName,
        paymentDate,
        {
          bank_id: bankId,
          payment_method: paymentMethod,
          operation_number: operationNumber.trim() || undefined,
          voucher_image: voucherImage || undefined
        }
      );
      
      setSelectedInvoice(null);
      setPaymentAmount("");
      setOperationNumber("");
      setVoucherImage("");
      loadReconciliationPayments();
    } catch (err: any) {
      setAntifraudError(err.message || "Error registrando pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcileStatus = async (paymentId: string, status: "CONCILIADO" | "OBSERVADO") => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, verified_by: currentUserName })
      });
      if (res.ok) {
        loadReconciliationPayments();
      }
    } catch (e) {
      console.warn("Error actualizando conciliación:", e);
    }
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
      {/* Top Banner */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-ink">
            <DollarSign className="w-5 h-5 text-success-fg" />
            Cuentas por Cobrar & Conciliación Bancaria Antifraude
          </h3>
          <p className="text-xs text-ink-subtle mt-1">
            Gestión de créditos, amortizaciones bancarias, validación de vouchers y prevención de doble uso de operaciones.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-success-soft border border-success/30 rounded-xl px-4 py-2 text-right">
            <div className="text-xs font-bold text-success-fg uppercase">Recaudado</div>
            <div className="text-sm font-mono font-extrabold text-ink dark:text-success-fg">S/ {totalPaid.toFixed(2)}</div>
          </div>
          <div className="bg-danger-soft border border-danger/30 rounded-xl px-4 py-2 text-right">
            <div className="text-xs font-bold text-danger-fg uppercase">Por Cobrar</div>
            <div className="text-sm font-mono font-extrabold text-brand-fg">S/ {totalDue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("credits")}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "credits"
              ? "border-brand-fg text-brand-fg"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cartera de Créditos & Cobranzas</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-micro font-mono">
            {filteredReceivables.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("reconciliation");
            loadReconciliationPayments();
          }}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "reconciliation"
              ? "border-brand-fg text-brand-fg"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-brand-fg" />
          <span>Conciliación Bancaria Antifraude</span>
          <span className="px-1.5 py-0.2 rounded-full bg-brand/10 text-brand-fg text-micro font-mono font-bold">
            {reconciledPayments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CARTERA DE CRÉDITOS */}
      {activeTab === "credits" && (
        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-subtle" />
              <input
                type="text"
                placeholder="Buscar por cliente, DNI/RUC o N° Comprobante..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full lg:w-1/2 bg-surface-2 border-none focus:border-success/30 rounded-xl pl-10 pr-4 py-2 text-sm text-ink focus-visible:outline-none transition-all"
              />
            </div>
            <button type="button" onClick={handleExportCSV} className="px-4 py-2 bg-surface-2 hover:bg-field-hover text-ink rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line">
                  <th className="p-4">Comprobante</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Fecha Emisión</th>
                  <th className="p-4">Antigüedad & Tramo</th>
                  <th className="p-4 text-right">Total Factura</th>
                  <th className="p-4 text-right">Saldo Deudor</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs font-medium text-ink">
                {filteredReceivables.map(r => {
                  const bracket = getCommissionBracketInfo(r.date);
                  return (
                    <tr key={r.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-ink">{r.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-ink">{r.clientName}</div>
                        <div className="text-micro font-mono text-ink-subtle">{r.clientDoc}</div>
                      </td>
                      <td className="p-4 font-mono text-ink-muted">{r.date ? new Date(r.date).toLocaleDateString("es-PE") : "-"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-micro font-bold border ${bracket.badgeClass}`}>
                          {bracket.days}d ({bracket.label})
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-ink">S/ {(r.total || 0).toFixed(2)}</td>
                      <td className="p-4 text-right font-mono font-black text-brand-fg">S/ {(r.creditDueAmount || r.total || 0).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-micro font-bold uppercase ${
                          r.creditStatus === "Cancelado" 
                            ? "bg-success-soft text-success-fg border border-success/30" 
                            : "bg-warning-soft text-warning-fg border border-warning/30"
                        }`}>
                          {r.creditStatus || "Pendiente"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(r);
                            setPaymentAmount(r.creditDueAmount || r.total);
                            setAntifraudError(null);
                          }}
                          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 mx-auto"
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          <span>Cobrar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredReceivables.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-ink-subtle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-success-fg opacity-50" />
                        <span className="text-xs">No hay cuentas por cobrar pendientes.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONCILIACIÓN BANCARIA ANTIFRAUDE */}
      {activeTab === "reconciliation" && (
        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-fg" />
              <div>
                <h4 className="font-bold text-xs text-ink font-display">Bandeja de Amortizaciones y Cotejo Bancario</h4>
                <p className="text-micro text-ink-subtle">Verificación de números de operación contra extractos y vouchers bancarios</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadReconciliationPayments}
              disabled={loadingReconciliation}
              className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReconciliation ? "animate-spin" : ""}`} />
              <span>Actualizar Bandeja</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 border-b border-line text-ink-subtle font-extrabold uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha Pago</th>
                  <th className="py-3 px-4">Comprobante / Cliente</th>
                  <th className="py-3 px-4">Banco Receptor</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">N° Operación Bancaria</th>
                  <th className="py-3 px-4 text-right">Monto Amortizado</th>
                  <th className="py-3 px-4 text-center">Voucher</th>
                  <th className="py-3 px-4 text-center">Estado Conciliación</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reconciledPayments.map((p) => {
                  const isConc = p.reconciliation_status === "CONCILIADO";
                  const isObs = p.reconciliation_status === "OBSERVADO";

                  return (
                    <tr key={p.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-ink-muted whitespace-nowrap">
                        {p.date ? new Date(p.date).toLocaleString("es-PE") : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-ink">{p.quoteId}</div>
                        <div className="text-micro text-ink-subtle truncate max-w-[180px]">{p.clientName || "Cliente"}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">
                        {p.bank_name || p.bank_id || "Banco Central"}
                      </td>
                      <td className="py-3 px-4 text-ink-muted">
                        {p.payment_method || "Transferencia"}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-brand-fg">
                        {p.operation_number ? (
                          <span className="px-2 py-0.5 rounded-md bg-brand/5 border border-brand/20">
                            {p.operation_number}
                          </span>
                        ) : (
                          <span className="text-ink-subtle font-normal italic">Sin N° de Operación</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-ink">
                        S/ {Number(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.voucher_image ? (
                          <button
                            type="button"
                            onClick={() => setPreviewVoucher(p.voucher_image || null)}
                            className="p-1 rounded-lg border border-line bg-surface hover:bg-surface-2 text-brand-fg inline-flex items-center gap-1 cursor-pointer text-micro font-bold"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        ) : (
                          <span className="text-micro text-ink-subtle">Sin voucher</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-micro font-extrabold border ${
                          isConc
                            ? "bg-success-soft text-success-fg border-success/30"
                            : isObs
                            ? "bg-danger-soft text-danger-fg border-danger/30"
                            : "bg-warning-soft text-warning-fg border-warning/30"
                        }`}>
                          {p.reconciliation_status || "PENDIENTE"}
                        </span>
                        {p.verified_by && (
                          <div className="text-[10px] text-ink-subtle mt-0.5">Por: {p.verified_by}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isConc && (
                            <button
                              type="button"
                              onClick={() => handleReconcileStatus(p.id, "CONCILIADO")}
                              className="px-2 py-1 rounded text-micro font-bold bg-success-soft text-success-fg hover:bg-success hover:text-white transition-all cursor-pointer"
                              title="Marcar como Conciliado"
                            >
                              Conciliar
                            </button>
                          )}
                          {!isObs && (
                            <button
                              type="button"
                              onClick={() => handleReconcileStatus(p.id, "OBSERVADO")}
                              className="px-2 py-1 rounded text-micro font-bold bg-danger-soft text-danger-fg hover:bg-danger hover:text-white transition-all cursor-pointer"
                              title="Marcar como Observado"
                            >
                              Observar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {reconciledPayments.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-ink-subtle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-ink-subtle opacity-40" />
                        <span>No hay amortizaciones registradas en la bandeja de conciliación.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR COBRANZA CON VALIDACIÓN ANTIFRAUDE */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-ink/60 backdrop-blur-xs"
              onClick={() => setSelectedInvoice(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-surface border border-line rounded-3xl shadow-2xl p-6 w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-success-soft rounded-2xl text-success-fg">
                    <HandCoins className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-ink font-display">Registrar Cobranza Bancaria</h3>
                    <p className="text-micro text-ink-muted">Amortización protegida con validación antifraude CHOHO</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 rounded-lg hover:bg-surface-2 text-ink-subtle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Invoice Summary Box */}
              <div className="p-3.5 bg-surface-2 border border-line rounded-2xl mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-ink-subtle">Comprobante:</span>
                  <span className="font-mono font-bold text-ink">{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-subtle">Cliente:</span>
                  <span className="font-bold text-ink truncate max-w-[200px]">{selectedInvoice.clientName}</span>
                </div>
                <div className="pt-2 border-t border-line flex justify-between items-center">
                  <span className="font-extrabold uppercase text-ink-subtle">Saldo Pendiente:</span>
                  <span className="font-mono font-black text-base text-brand-fg">
                    S/ {(selectedInvoice.creditDueAmount || selectedInvoice.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Antifraud Alert Banner */}
              {antifraudError && (
                <div className="p-3.5 bg-danger-soft border border-danger/40 rounded-2xl text-xs text-danger-fg mb-4 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-tight">{antifraudError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterPayment} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-micro font-extrabold text-ink-subtle uppercase">Fecha de Operación</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink focus-visible:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-micro font-extrabold text-ink-subtle uppercase">Monto a Amortizar (S/)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      max={selectedInvoice.creditDueAmount || selectedInvoice.total}
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono font-black text-brand-fg focus-visible:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-micro font-extrabold text-ink-subtle uppercase">Banco Receptor</label>
                    <select
                      value={bankId}
                      onChange={e => setBankId(e.target.value)}
                      required
                      className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} ({b.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-micro font-extrabold text-ink-subtle uppercase">Método de Cobro</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                    >
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Depósito en Ventanilla">Depósito en Ventanilla</option>
                      <option value="Yape / Plin">Yape / Plin</option>
                      <option value="Cheque">Cheque Bancario</option>
                      <option value="Efectivo en Almacén">Efectivo en Almacén</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-micro font-extrabold text-ink-subtle uppercase">N° de Operación Bancaria</label>
                    <span className="text-[10px] text-brand-fg font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verificación Antifraude
                    </span>
                  </div>
                  <input
                    type="text"
                    value={operationNumber}
                    onChange={e => setOperationNumber(e.target.value)}
                    placeholder="Ej: 00481920 (Número del comprobante bancario)"
                    className="w-full mt-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink focus-visible:outline-none"
                  />
                  <span className="text-micro text-ink-subtle">
                    El sistema bloqueará el registro si este número ya fue usado en otra factura.
                  </span>
                </div>

                <div>
                  <label className="text-micro font-extrabold text-ink-subtle uppercase">Voucher / Comprobante (Foto o Captura)</label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="btn-secondary py-2 px-3 text-xs flex items-center gap-2 cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-brand-fg" />
                      <span>{voucherImage ? "Cambiar Voucher" : "Subir Voucher..."}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVoucherUpload}
                        className="hidden"
                      />
                    </label>
                    {voucherImage && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-line">
                        <img src={voucherImage} alt="Voucher preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="flex-1 btn-secondary py-2.5 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !paymentAmount}
                    className="flex-1 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmar Cobranza</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: VOUCHER PREVIEW */}
      {previewVoucher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs" onClick={() => setPreviewVoucher(null)}>
          <div className="relative bg-surface border border-line rounded-2xl p-4 max-w-xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-line mb-3">
              <span className="text-xs font-bold text-ink">Comprobante de Pago Bancario</span>
              <button type="button" onClick={() => setPreviewVoucher(null)} className="p-1 rounded text-ink-subtle hover:text-ink">
                ✕
              </button>
            </div>
            <div className="overflow-auto max-h-[70vh] flex justify-center">
              <img src={previewVoucher} alt="Voucher Bancario" className="rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
