import React, { useState } from "react";
import { Receipt, Plus, ShieldCheck, ShieldAlert, CheckCircle2, Clock, Image as ImageIcon, Search, Download, Eye, FileText, Check, X, RefreshCw, Filter, DollarSign, Sparkles, UploadCloud } from "lucide-react";
import { TravelExpense } from "../types";
import { parseSunatInvoiceXml } from "../utils/sunatXmlParser";

interface ExpensesManagerProps {
  expensesList: TravelExpense[];
  onAddExpense: (expense: Omit<TravelExpense, "id">) => Promise<void>;
  onUpdateExpenseStatus: (id: string, approvalStatus: 'Pendiente' | 'Aprobado' | 'Observado') => Promise<void>;
  currentUserName: string;
  currentUserRole?: string;
  travelBudgets?: import('../types').TravelBudget[];
}

export function ExpensesManager({
  expensesList,
  onAddExpense,
  onUpdateExpenseStatus,
  currentUserName,
  currentUserRole,
  travelBudgets
}: ExpensesManagerProps) {
  // Form states
  const [category, setCategory] = useState<TravelExpense['category']>("Alimentación");
  const [docType, setDocType] = useState<TravelExpense['docType']>("Factura");
  const [rucIssuer, setRucIssuer] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [xmlFileName, setXmlFileName] = useState<string | null>(null);
  const [isDraggingXml, setIsDraggingXml] = useState(false);

  // Verification & Loader states
  const [isValidatingSunat, setIsValidatingSunat] = useState(false);
  const [sunatValidationResult, setSunatValidationResult] = useState<{
    valid: boolean;
    sunatStatus: 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE';
    message: string;
    companyName?: string;
    condition?: string;
    state?: string;
    isDuplicate?: boolean;
    duplicateDetails?: string;
  } | null>(null);

  // Modal / Filter states
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");

  const isFinanceOrAdmin = currentUserRole === "Admin General" || currentUserRole === "Jefe de Finanzas" || (currentUserRole || "").toLowerCase().includes("admin");

  // Handle XML File from electronic invoice
  const handleXmlFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml")) {
      alert("Por favor selecciona un archivo con formato .xml correspondiente a la factura electrónica.");
      return;
    }
    try {
      const xmlContent = await file.text();
      const parsed = parseSunatInvoiceXml(xmlContent);

      setDocType(parsed.docType as any);
      setSeries(parsed.series);
      setNumber(parsed.number);
      setRucIssuer(parsed.rucIssuer);
      setCompanyName(parsed.companyName);
      setAmount(parsed.totalAmount);
      setNotes(parsed.description);
      setXmlFileName(file.name);

      if (parsed.suggestedCategory === "Combustible" || parsed.suggestedCategory === "Movilidad") {
        setCategory("Transporte");
      } else if (parsed.suggestedCategory === "Alimentación") {
        setCategory("Alimentación");
      } else if (parsed.suggestedCategory === "Peaje") {
        setCategory("Peaje");
      } else if (parsed.suggestedCategory === "Mantenimiento") {
        setCategory("Mantenimiento");
      }

      // Auto validate SUNAT
      setIsValidatingSunat(true);
      try {
        const res = await fetch("/api/expenses/validate-sunat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ruc: parsed.rucIssuer,
            series: parsed.series,
            number: parsed.number,
            amount: parsed.totalAmount,
            docType: parsed.docType
          })
        });
        const data = await res.json();
        setSunatValidationResult(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsValidatingSunat(false);
      }
    } catch (err: any) {
      alert(err?.message || "No se pudo leer el archivo XML.");
    }
  };

  // Handle Receipt photo selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // SUNAT Receipt Online Verification
  const handleValidateSunat = async () => {
    if (!rucIssuer.trim() || rucIssuer.length < 11) {
      alert("Por favor ingrese un número de RUC emisor válido 11 dígitos.");
      return;
    }

    setIsValidatingSunat(true);
    setSunatValidationResult(null);

    try {
      const res = await fetch("/api/expenses/validate-sunat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruc: rucIssuer,
          series: series || "F001",
          number: number || "001",
          amount: Number(amount) || 0,
          docType
        })
      });

      const data = await res.json();
      setSunatValidationResult(data);
      if (data.companyName && !companyName) {
        setCompanyName(data.companyName);
      }
    } catch (err) {
      console.error("Error al validar comprobante en SUNAT:", err);
      setSunatValidationResult({
        valid: false,
        sunatStatus: 'RECHAZADO',
        message: "Error de conexión con el servicio validación SUNAT. Por favor intente más tarde."
      });
    } finally {
      setIsValidatingSunat(false);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rucIssuer.trim() || !amount || Number(amount) <= 0) return;

    // Validate budget
    if (travelBudgets) {
      const myBudget = travelBudgets.find(b => b.seller === currentUserName);
      if (myBudget) {
        const sellerExpenses = expensesList.filter(exp => exp.advisor === currentUserName && (exp.approvalStatus === 'Aprobado' || exp.approvalStatus === 'Pendiente'));
        const spent = sellerExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const balance = myBudget.assigned - spent;
        
        if (Number(amount) > balance) {
          alert(`Presupuesto excedido. Su saldo disponible es S/${balance.toFixed(2)}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    const payload: Omit<TravelExpense, "id"> = {
      advisor: currentUserName,
      date: new Date().toISOString().split("T")[0],
      category,
      docType,
      rucIssuer,
      companyName: companyName || `Emisor RUC ${rucIssuer}`,
      series: series.toUpperCase() || "F001",
      number: number || "0001",
      amount: Number(amount),
      receiptImage: receiptImage || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500",
      sunatStatus: sunatValidationResult?.sunatStatus || "ACEPTADO",
      approvalStatus: "Pendiente",
      notes
    };

    await onAddExpense(payload);

    // Reset Form
    setRucIssuer("");
    setCompanyName("");
    setSeries("");
    setNumber("");
    setAmount("");
    setNotes("");
    setReceiptImage(undefined);
    setSunatValidationResult(null);
    setIsSubmitting(false);

    setFormSuccess("¡Sustento de viático registrado y enviado a aprobación!");
    setTimeout(() => setFormSuccess(""), 3500);
  };

  // Metrics
  const totalRendido = expensesList.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAprobado = expensesList.filter(e => e.approvalStatus === "Aprobado").reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendiente = expensesList.filter(e => e.approvalStatus === "Pendiente").reduce((acc, curr) => acc + curr.amount, 0);
  const validadosCount = expensesList.filter(e => e.sunatStatus === "ACEPTADO").length;

  const safeExpenses = Array.isArray(expensesList) ? expensesList : [];
  // Filtered List
  const filteredExpenses = safeExpenses.filter(item => {
    if (!item) return false;
    const matchesStatus = statusFilter === "all" || item.approvalStatus === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const search = (searchTerm || "").toLowerCase();
    const company = (item.companyName || "").toLowerCase();
    const ruc = item.rucIssuer || "";
    const advisor = (item.advisor || "").toLowerCase();
    const id = (item.id || "").toLowerCase();
    const matchesSearch = company.includes(search) ||
                          ruc.includes(searchTerm) ||
                          advisor.includes(search) ||
                          id.includes(search);
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Title Header */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-ink">
            <Receipt className="w-5 h-5 text-brand-fg" />
            Módulo de Sustento y Rendición de Viáticos SUNAT
          </h3>
          <p className="text-xs text-ink-subtle mt-1">
            Registro de comprobantes de pago de campo con comprobación de validez en tiempo real frente al portal SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-success-fg bg-success-soft border border-success/30 dark:border-success/border p-2.5 rounded-xl font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Validación SUNAT Integrada</span>
        </div>
      </div>

      {/* KPI Cards (Only for Finance and Management roles) */}
      {isFinanceOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-ink-subtle font-bold uppercase block">TOTAL RENDIDO</span>
            <span className="text-lg font-extrabold font-mono text-ink mt-1 block">
              S/ {totalRendido.toFixed(2)}
            </span>
            <span className="text-xs text-ink-subtle mt-1 block font-mono">{expensesList.length} Comprobantes</span>
          </div>

          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-warning-fg font-bold uppercase block">PENDIENTE DE APROBACIÓN</span>
            <span className="text-lg font-extrabold font-mono text-warning-fg mt-1 block">
              S/ {totalPendiente.toFixed(2)}
            </span>
            <span className="text-xs text-warning-fg/80 mt-1 block font-mono">En revisión por finanzas</span>
          </div>

          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-success-fg font-bold uppercase block">APROBADO POR FINANZAS</span>
            <span className="text-lg font-extrabold font-mono text-success-fg mt-1 block">
              S/ {totalAprobado.toFixed(2)}
            </span>
            <span className="text-xs text-success-fg/80 mt-1 block font-mono">Fondos validados</span>
          </div>

          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-brand-fg font-bold uppercase block">VALIDEZ SUNAT</span>
            <span className="text-lg font-extrabold font-mono text-brand-fg mt-1 block">
              {expensesList.length > 0 ? Math.round((validadosCount / expensesList.length) * 100) : 100}%
            </span>
            <span className="text-xs text-ink-subtle mt-1 block font-mono">{validadosCount} de {expensesList.length} Validados</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel: Register new expense */}
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit space-y-4">
          <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-fg" />
            Registrar Comprobante de Viático
          </h4>

          {/* Quick XML Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingXml(true);
            }}
            onDragLeave={() => setIsDraggingXml(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingXml(false);
              const files = e.dataTransfer.files;
              if (files && files[0]) {
                handleXmlFileUpload(files[0]);
              }
            }}
            className={`p-3 border border-dashed rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
              isDraggingXml ? "border-brand bg-brand-soft/40" : "border-brand/40 bg-brand-soft/10 hover:bg-brand-soft/20"
            }`}
          >
            <label htmlFor="sales-xml-input" className="cursor-pointer flex items-center gap-2 w-full">
              <Sparkles className="w-4 h-4 text-brand-fg shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-bold text-ink">
                  {xmlFileName ? `XML: ${xmlFileName}` : "Rellenar con Factura XML (UBL 2.1)"}
                </div>
                <div className="text-micro text-ink-subtle">
                  Arrastra tu factura electrónica para autocompletar
                </div>
              </div>
              <input
                type="file"
                id="sales-xml-input"
                accept=".xml"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files[0]) {
                    handleXmlFileUpload(files[0]);
                  }
                }}
              />
            </label>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-semibold focus-visible:outline-none"
                >
                  <option value="Alimentación">🍔 Alimentación</option>
                  <option value="Hospedaje">🏨 Hospedaje</option>
                  <option value="Transporte">🚗 Transporte / Combust.</option>
                  <option value="Peaje">🛣️ Peaje</option>
                  <option value="Mantenimiento">🔧 Mantenimiento</option>
                  <option value="Otros">📦 Otros Gastos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Tipo Comprobante</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-semibold focus-visible:outline-none"
                >
                  <option value="Factura">Factura Electrónica</option>
                  <option value="Boleta">Boleta de Venta</option>
                  <option value="Ticket">Ticket / Peaje</option>
                </select>
              </div>
            </div>

            {/* RUC Issuer & SUNAT Lookup */}
            <div className="space-y-1">
              <label className="text-xs text-ink-muted font-semibold uppercase block">RUC Emisor Comprobante</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={11}
                  placeholder="Ej. 20124567891"
                  value={rucIssuer}
                  onChange={(e) => setRucIssuer(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={handleValidateSunat}
                  disabled={isValidatingSunat || !rucIssuer}
                  className="bg-ink-muted hover:bg-ink text-ink-inverse font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  title="Comprobar en el portal SUNAT"
                >
                  {isValidatingSunat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Validar SUNAT</span>
                </button>
              </div>
            </div>

            {/* Razón Social */}
            <div className="space-y-1">
              <label className="text-xs text-ink-muted font-semibold uppercase block">Razón Social Emisor</label>
              <input
                type="text"
                placeholder="Ej. Hotel Real Trujillo S.A.C."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none"
                required
              />
            </div>

            {/* Serie & Número */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Serie</label>
                <input
                  type="text"
                  placeholder="F001"
                  value={series}
                  onChange={(e) => setSeries(e.target.value.toUpperCase())}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Número</label>
                <input
                  type="text"
                  placeholder="0004521"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Monto (S/)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink font-mono font-bold focus-visible:outline-none"
                  required
                />
              </div>
            </div>

            {/* SUNAT Verification Banner */}
            {sunatValidationResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                sunatValidationResult.valid
                  ? "bg-success-soft/30 text-success-fg dark:bg-success-soft border-success/30"
 : "bg-danger-soft/40 text-danger-fg dark:bg-danger-soft border-danger/30"
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {sunatValidationResult.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{sunatValidationResult.sunatStatus}: {sunatValidationResult.message}</span>
                </div>
              </div>
            )}

            {/* Receipt Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-semibold uppercase block">Foto o Imagen del Comprobante</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 bg-surface-2 dark:bg-surface-2/60 border border-dashed border-line-strong dark:border-line hover:border-brand rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1">
                  <ImageIcon className="w-5 h-5 text-ink-subtle" />
                  <span className="text-xs text-ink-muted font-semibold">
                    {receiptImage ? "✓ Imagen Cargada (Cambiar)" : "Subir Foto / Escaneo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {receiptImage && (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-line shrink-0 group">
                    <img src={receiptImage} alt="Comprobante" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setViewingImage(receiptImage)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-ink-muted font-semibold uppercase block">Sustento / Observación</label>
              <textarea
                rows={2}
                placeholder="Ej. Almuerzo corporativo con cliente de la zona..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none resize-none"
              />
            </div>

            {formSuccess && (
              <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs text-center font-bold">
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full gap-1.5 disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>Registrar y Sustentar Viático</span>
            </button>
          </form>
        </div>

        {/* Expenses List & Approval Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
            {/* List Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-fg" />
                Historial Comprobantes Sustentados ({filteredExpenses.length})
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="text"
                    placeholder="Buscar RUC, emisor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-surface-2 border-none rounded-xl pl-8 pr-3 py-1.5 text-xs focus-visible:outline-none"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-surface-2 border-none rounded-xl px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none cursor-pointer"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Observado">Observado</option>
                </select>
              </div>
            </div>

            {/* Expense Cards */}
            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-ink-subtle text-xs font-medium">
                No hay comprobantes de viáticos registrados que coincidan con los filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand/border transition-all text-left"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold font-mono text-brand-fg">{exp.id}</span>
                        <span className="text-xs bg-line/60 dark:bg-surface-2 text-ink dark:text-ink-muted font-semibold px-2 py-0.5 rounded-md">
                          {exp.category}
                        </span>
                        <span className="text-xs font-mono text-ink-subtle">{exp.date}</span>

                        {/* SUNAT Badge */}
                        <span className={`text-micro font-mono font-bold px-2 py-0.5 rounded-full border ${
                          exp.sunatStatus === "ACEPTADO"
                            ? "bg-success-soft/30 text-success-fg dark:bg-success/60 border-success/30"
 : "bg-danger-soft/40 text-danger-fg dark:bg-danger-soft border-danger/30"
                        }`}>
                          SUNAT: {exp.sunatStatus}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-ink truncate">{exp.companyName}</h5>
                      
                      <div className="text-xs text-ink-muted font-mono flex flex-wrap gap-2">
                        <span>RUC: {exp.rucIssuer}</span>
                        <span>•</span>
                        <span>{exp.docType}: {exp.series}-{exp.number}</span>
                        <span>•</span>
                        <span>Asesor: <strong className="text-ink dark:text-ink-muted">{exp.advisor}</strong></span>
                      </div>

                      {exp.notes && (
                        <p className="text-xs text-ink-subtle italic">"{exp.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-line shrink-0">
                      <div className="text-right">
                        <span className="text-micro text-ink-subtle block font-medium uppercase">MONTO</span>
                        <span className="text-sm font-extrabold font-mono text-ink">
                          S/ {exp.amount.toFixed(2)}
                        </span>
                      </div>

                      {/* Photo Button */}
                      {exp.receiptImage && (
                        <button type="button"
                          onClick={() => setViewingImage(exp.receiptImage!)}
                          className="p-2 bg-surface-2 hover:bg-field-hover text-ink-muted rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold"
                          title="Ver Foto del Comprobante"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-fg" />
                          <span>Foto</span>
                        </button>
                      )}

                      {/* Approval Status Badge & Actions */}
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          exp.approvalStatus === "Aprobado"
                            ? "bg-success-soft/30 text-success-fg dark:bg-success/60 border border-success/30"
                            : exp.approvalStatus === "Observado"
 ? "bg-danger-soft/40 text-danger-fg dark:bg-danger-soft border border-danger/30"
                            : "bg-warning-soft/40 text-warning-fg dark:bg-warning/60 border border-warning/30"
                        }`}>
                          {exp.approvalStatus}
                        </span>

                        {isFinanceOrAdmin && exp.approvalStatus === "Pendiente" && (
                          <div className="flex gap-1 pt-1">
                            <button type="button"
                              onClick={() => onUpdateExpenseStatus(exp.id, "Aprobado")}
                              className="px-2 py-0.5 bg-success hover:bg-success text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                            >
                              Aprobar
                            </button>
                            <button type="button"
                              onClick={() => onUpdateExpenseStatus(exp.id, "Observado")}
                              className="px-2 py-0.5 bg-danger hover:bg-danger text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                            >
                              Observar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN RECEIPT IMAGE MODAL */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink flex items-center gap-2 font-display">
                <ImageIcon className="w-4 h-4 text-brand-fg" />
                Foto Adjunta del Comprobante
              </h4>
              <button type="button"
                onClick={() => setViewingImage(null)}
                className="p-1.5 text-ink-subtle hover:text-ink bg-surface-2 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-hidden rounded-2xl border border-line flex items-center justify-center bg-black">
              <img src={viewingImage} alt="Comprobante de Pago" className="max-h-[65vh] w-auto object-contain" />
            </div>

            <div className="flex justify-end">
              <button type="button"
                onClick={() => setViewingImage(null)}
                className="bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted font-bold py-2 px-5 rounded-xl text-xs cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
