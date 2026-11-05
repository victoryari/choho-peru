import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, DollarSign, X, Receipt, Plus, Sparkles, FileSpreadsheet, Download, 
  UploadCloud, FileCheck, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, 
  Search, Filter, Trash2, Eye, Building2, Calendar, FileText, Check, RefreshCw, Users, Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TravelBudget, TravelExpense, PettyCashExpense, PettyCashFund } from '../types';
import { parseSunatInvoiceXml, ParsedSunatInvoice } from '../utils/sunatXmlParser';

interface TravelBudgetsProps {
  budgets: TravelBudget[];
  onAddBudget: (budget: TravelBudget) => void;
  expenses: TravelExpense[];
  currentUserName?: string;
  currentUserRole?: string;
}

export function TravelBudgets({ 
  budgets, 
  onAddBudget, 
  expenses,
  currentUserName = "Administración",
  currentUserRole = "Admin"
}: TravelBudgetsProps) {
  // Navigation Tabs: 'petty-cash' (Rendición Caja Chica) vs 'travel-budgets' (Asignación a Vendedores)
  const [activeTab, setActiveTab] = useState<'petty-cash' | 'travel-budgets'>('petty-cash');

  // --- Petty Cash Fund & Expenses State ---
  const [pettyFund, setPettyFund] = useState<PettyCashFund>({
    id: "FUND-001",
    name: "Caja Chica Administración - Sede Lima",
    assignedAmount: 2500,
    responsible: "Administración General",
    status: "Activo"
  });
  const [pettyExpenses, setPettyExpenses] = useState<PettyCashExpense[]>([]);
  const [isLoadingPetty, setIsLoadingPetty] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [isTravelBudgetModalOpen, setIsTravelBudgetModalOpen] = useState(false);

  // Fund Edit Form State
  const [fundAmountInput, setFundAmountInput] = useState<number | "">(2500);
  const [fundNameInput, setFundNameInput] = useState("Caja Chica Administración - Sede Lima");

  // New Petty Cash Expense Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<PettyCashExpense['category']>("Alimentación");
  const [docType, setDocType] = useState<PettyCashExpense['docType']>("Factura");
  const [rucIssuer, setRucIssuer] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [igv, setIgv] = useState<number | "">("");
  const [subtotal, setSubtotal] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [xmlFileName, setXmlFileName] = useState<string | null>(null);

  // SUNAT validation & loading
  const [isValidatingSunat, setIsValidatingSunat] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isDraggingXml, setIsDraggingXml] = useState(false);
  const [xmlSuccessNotice, setXmlSuccessNotice] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [sunatValidationResult, setSunatValidationResult] = useState<{
    valid: boolean;
    companyName?: string;
    condition?: string;
    state?: string;
    isDuplicate?: boolean;
    duplicateDetails?: string;
    message: string;
  } | null>(null);

  // Registration Mode for Petty Cash Expense: 'manual' (default) vs 'xml'
  const [entryMode, setEntryMode] = useState<'manual' | 'xml'>('manual');
  const [autoCalcIgv, setAutoCalcIgv] = useState(true);

  const handleAmountChange = (val: number | "") => {
    setAmount(val);
    if (val !== "" && autoCalcIgv && docType === "Factura") {
      const numVal = Number(val);
      const calculatedSubtotal = Math.round((numVal / 1.18) * 100) / 100;
      const calculatedIgv = Math.round((numVal - calculatedSubtotal) * 100) / 100;
      setSubtotal(calculatedSubtotal);
      setIgv(calculatedIgv);
    }
  };

  const handleDocTypeChange = (newDoc: PettyCashExpense['docType']) => {
    setDocType(newDoc);
    if (newDoc === "Factura") {
      if (amount !== "" && autoCalcIgv) {
        const numVal = Number(amount);
        const calculatedSubtotal = Math.round((numVal / 1.18) * 100) / 100;
        const calculatedIgv = Math.round((numVal - calculatedSubtotal) * 100) / 100;
        setSubtotal(calculatedSubtotal);
        setIgv(calculatedIgv);
      }
    } else {
      if (amount !== "") {
        setSubtotal(Number(amount));
        setIgv(0);
      }
    }
  };

  const toggleAutoCalcIgv = (checked: boolean) => {
    setAutoCalcIgv(checked);
    if (checked && amount !== "" && docType === "Factura") {
      const numVal = Number(amount);
      const calculatedSubtotal = Math.round((numVal / 1.18) * 100) / 100;
      const calculatedIgv = Math.round((numVal - calculatedSubtotal) * 100) / 100;
      setSubtotal(calculatedSubtotal);
      setIgv(calculatedIgv);
    }
  };

  // --- Travel Budget Assignment State (Legacy Tab) ---
  const [seller, setSeller] = useState("");
  const [assigned, setAssigned] = useState<number | "">("");

  // Load Petty Cash Fund & Expenses from backend
  const fetchPettyCashData = async () => {
    setIsLoadingPetty(true);
    try {
      const [resFund, resExpenses] = await Promise.all([
        fetch("/api/petty-cash/fund"),
        fetch("/api/petty-cash")
      ]);

      if (resFund.ok) {
        const fundData = await resFund.json();
        if (fundData && fundData.assignedAmount !== undefined) {
          setPettyFund(fundData);
          setFundAmountInput(fundData.assignedAmount);
          setFundNameInput(fundData.name);
        }
      }

      if (resExpenses.ok) {
        const expensesData = await resExpenses.json();
        if (Array.isArray(expensesData)) {
          setPettyExpenses(expensesData);
        }
      }
    } catch (err) {
      console.warn("Error cargando datos de caja chica:", err);
    } finally {
      setIsLoadingPetty(false);
    }
  };

  useEffect(() => {
    fetchPettyCashData();
  }, []);

  // Financial calculations for Petty Cash
  const totalRendido = useMemo(() => {
    return pettyExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [pettyExpenses]);

  const saldoDisponible = useMemo(() => {
    return (Number(pettyFund.assignedAmount) || 0) - totalRendido;
  }, [pettyFund.assignedAmount, totalRendido]);

  const porcentajeConsumido = useMemo(() => {
    const total = Number(pettyFund.assignedAmount) || 1;
    return Math.min(100, Math.max(0, (totalRendido / total) * 100));
  }, [pettyFund.assignedAmount, totalRendido]);

  // Travel Budgets calculations (Vendedores)
  const computedBudgets = useMemo(() => {
    const defaultBudgets = budgets.length > 0 ? budgets : [
      { id: 'TB-1', seller: 'Ana Torres', assigned: 1500, spent: 0, balance: 1500, status: 'Activo' },
      { id: 'TB-2', seller: 'Luis Gomez', assigned: 2000, spent: 0, balance: 2000, status: 'Activo' },
      { id: 'TB-3', seller: 'Carlos Mendoza', assigned: 1800, spent: 0, balance: 1800, status: 'Activo' }
    ] as TravelBudget[];

    return defaultBudgets.map(b => {
      const sellerExpenses = expenses.filter(e => e.advisor === b.seller && e.approvalStatus === 'Aprobado');
      const spent = sellerExpenses.reduce((sum, e) => sum + e.amount, 0);
      const balance = b.assigned - spent;
      const status = balance <= 0 ? 'Agotado' : (balance < (b.assigned * 0.2) ? 'Crítico' : 'Activo');
      return { ...b, spent, balance, status };
    });
  }, [budgets, expenses]);

  const totalAssignedVendedores = computedBudgets.reduce((sum, b) => sum + b.assigned, 0);

  // Filtered Petty Cash Expenses
  const filteredPettyExpenses = useMemo(() => {
    return pettyExpenses.filter(exp => {
      const matchSearch = 
        (exp.rucIssuer || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (`${exp.series}-${exp.number}`).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.category || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === "all" || exp.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [pettyExpenses, searchTerm, categoryFilter]);

  // Handle XML File Drag & Drop or Selection
  const handleXmlFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml")) {
      alert("Por favor selecciona un archivo con extensión .xml correspondiente a la factura electrónica.");
      return;
    }

    try {
      const xmlContent = await file.text();
      const parsed: ParsedSunatInvoice = parseSunatInvoiceXml(xmlContent);

      // Auto-fill form fields
      setDocType(parsed.docType);
      setSeries(parsed.series);
      setNumber(parsed.number);
      setDate(parsed.issueDate);
      setRucIssuer(parsed.rucIssuer);
      setCompanyName(parsed.companyName);
      setAmount(parsed.totalAmount);
      setIgv(parsed.igv);
      setSubtotal(parsed.subtotal);
      setCategory(parsed.suggestedCategory);
      setNotes(parsed.description);
      setXmlFileName(file.name);

      // Return to manual view so user can review and edit every value against their printed voucher
      setEntryMode('manual');

      setXmlSuccessNotice(`¡Factura ${parsed.series}-${parsed.number} importada desde XML! Verificando en SUNAT...`);

      // Trigger automatic SUNAT validation & Duplicate check
      await triggerSunatValidation(parsed.rucIssuer, parsed.series, parsed.number, parsed.totalAmount, parsed.docType);
    } catch (err: any) {
      console.error("Error al procesar XML de SUNAT:", err);
      alert(err?.message || "No se pudo leer el archivo XML. Verifica que sea un comprobante UBL 2.1 de SUNAT.");
    }
  };

  // Trigger SUNAT Online Validation
  const triggerSunatValidation = async (rucToValidate: string, ser: string, num: string, amt: number, doc: string) => {
    const cleanRuc = (rucToValidate || "").trim();
    if (!/^(10|20)\d{9}$/.test(cleanRuc)) {
      setSunatValidationResult({
        valid: false,
        message: "El RUC debe tener 11 dígitos y empezar con 10 o 20."
      });
      return;
    }

    setIsValidatingSunat(true);
    setSunatValidationResult(null);

    try {
      const res = await fetch("/api/expenses/validate-sunat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruc: cleanRuc,
          series: ser || series || "F001",
          number: num || number || "001",
          amount: Number(amt) || Number(amount) || 0,
          docType: doc || docType
        })
      });

      const data = await res.json();
      setSunatValidationResult(data);
      if (data.companyName) {
        setCompanyName(data.companyName);
      }
      setXmlSuccessNotice(`Comprobante validado en SUNAT: Proveedor ${data.companyName || cleanRuc} (${data.state || "ACTIVO"} / ${data.condition || "HABIDO"}).`);
    } catch (err) {
      console.error("Error validando en SUNAT:", err);
      setSunatValidationResult({
        valid: false,
        message: "No se pudo conectar con el servicio de validación SUNAT. Verifica tu conexión."
      });
    } finally {
      setIsValidatingSunat(false);
    }
  };

  // Image / PDF Receipt upload
  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Petty Cash Expense
  const handleSubmitPettyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rucIssuer.trim() || !amount || Number(amount) <= 0) {
      alert("Por favor completa los campos obligatorios: RUC y Monto Total.");
      return;
    }

    if (sunatValidationResult?.isDuplicate) {
      alert("No se puede registrar el gasto: este comprobante ya ha sido rendido anteriormente en el sistema.");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const payload: Omit<PettyCashExpense, "id"> = {
        fundId: pettyFund.id,
        fundName: pettyFund.name,
        responsible: currentUserName,
        date,
        category,
        docType,
        rucIssuer: rucIssuer.trim(),
        companyName: companyName.trim() || "Proveedor Comercial",
        series: (series || "F001").trim().toUpperCase(),
        number: (number || "001").trim(),
        amount: Number(amount),
        igv: Number(igv) || 0,
        subtotal: Number(subtotal) || (Number(amount) - (Number(igv) || 0)),
        currency: "PEN",
        receiptImage: receiptImage || undefined,
        xmlFileName: xmlFileName || undefined,
        sunatStatus: sunatValidationResult?.valid ? "ACEPTADO" : "PENDIENTE",
        sunatCondition: (sunatValidationResult?.condition as any) || "HABIDO",
        sunatState: (sunatValidationResult?.state as any) || "ACTIVO",
        approvalStatus: "Aprobado",
        notes: notes.trim()
      };

      const res = await fetch("/api/petty-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar el gasto en caja chica.");
      }

      const created = await res.json();
      setPettyExpenses([created, ...pettyExpenses]);

      setStatusMsg(`¡Gasto de S/ ${Number(created.amount).toFixed(2)} registrado exitosamente en Caja Chica!`);
      setTimeout(() => setStatusMsg(null), 5000);

      // Reset modal & form
      setIsExpenseModalOpen(false);
      resetExpenseForm();
    } catch (err: any) {
      alert(err?.message || "Ocurrió un error al guardar el gasto.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const resetExpenseForm = () => {
    setEntryMode('manual');
    setAutoCalcIgv(true);
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("Alimentación");
    setDocType("Factura");
    setRucIssuer("");
    setCompanyName("");
    setSeries("");
    setNumber("");
    setAmount("");
    setIgv("");
    setSubtotal("");
    setNotes("");
    setReceiptImage(null);
    setXmlFileName(null);
    setSunatValidationResult(null);
    setXmlSuccessNotice(null);
  };

  // Delete Petty Cash Expense
  const handleDeletePettyExpense = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este comprobante de la rendición de caja chica?")) return;

    try {
      await fetch(`/api/petty-cash/${id}`, { method: "DELETE" });
      setPettyExpenses(pettyExpenses.filter(e => e.id !== id));
      setStatusMsg("Comprobante eliminado de la rendición.");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el comprobante.");
    }
  };

  // Save Fund Amount
  const handleSaveFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAmountInput || Number(fundAmountInput) <= 0) return;

    try {
      const res = await fetch("/api/petty-cash/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fundNameInput,
          assignedAmount: Number(fundAmountInput),
          responsible: currentUserName
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setPettyFund(updated);
        setIsFundModalOpen(false);
        setStatusMsg("Fondo de Caja Chica actualizado correctamente.");
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      alert("Error al actualizar el fondo fijo.");
    }
  };

  // Export Liquidation to Excel (.xlsx)
  const handleExportPettyCashExcel = () => {
    if (pettyExpenses.length === 0) {
      alert("No hay comprobantes registrados en la rendición para exportar.");
      return;
    }

    const rows = pettyExpenses.map((exp, idx) => ({
      "Ítem": idx + 1,
      "Fecha": exp.date,
      "Tipo Comprobante": exp.docType,
      "Serie-Número": `${exp.series}-${exp.number}`,
      "RUC Proveedor": exp.rucIssuer,
      "Razón Social Emisor": exp.companyName,
      "Categoría Gasto": exp.category,
      "Base Imponible (S/)": Number(exp.subtotal || 0).toFixed(2),
      "IGV (S/)": Number(exp.igv || 0).toFixed(2),
      "Importe Total (S/)": Number(exp.amount || 0).toFixed(2),
      "Estado SUNAT": exp.sunatCondition === "HABIDO" ? "HABIDO / ACTIVO" : (exp.sunatCondition || "VALIDADO"),
      "Rendido Por": exp.responsible,
      "Detalle / Observaciones": exp.notes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 32 },
      { wch: 20 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 35 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rendicion_Caja_Chica");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `rendicion_caja_chica_${today}.xlsx`);
  };

  // Submit Legacy Seller Budget
  const handleSubmitSellerBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller || !assigned || Number(assigned) <= 0) return;

    onAddBudget({
      id: `TB-${Math.floor(Math.random() * 10000)}`,
      seller,
      assigned: Number(assigned),
      spent: 0,
      balance: Number(assigned),
      status: 'Activo'
    });

    setIsTravelBudgetModalOpen(false);
    setSeller("");
    setAssigned("");
    setStatusMsg(`Presupuesto de S/ ${Number(assigned).toFixed(2)} asignado a ${seller}.`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 md:p-8 space-y-6 text-left"
    >
      {/* Module Title Header */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-brand-fg uppercase tracking-wider mb-1">
            <Coins className="w-4 h-4" /> Tesorería & Administración
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-ink">
            Caja Chica & Viáticos
          </h1>
          <p className="text-xs sm:text-sm text-ink-subtle mt-1">
            Rendición electrónica de gastos de caja chica con lectura XML UBL 2.1, validación SUNAT y asignación de fondos comerciales.
          </p>
        </div>

        {/* Global Action depending on active tab */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'petty-cash' ? (
            <>
              <button
                type="button"
                onClick={handleExportPettyCashExcel}
                className="bg-surface-2 hover:bg-surface-3 border border-line text-ink font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
                title="Descargar hoja de liquidación de caja chica en Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Planilla Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetExpenseForm();
                  setIsExpenseModalOpen(true);
                }}
                className="btn-primary gap-2 shrink-0 cursor-pointer shadow-md shadow-brand/30"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Rendir Comprobante de Caja Chica</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsTravelBudgetModalOpen(true)}
              className="btn-primary gap-2 shrink-0 cursor-pointer shadow-md shadow-brand/30"
            >
              <DollarSign className="w-4 h-4" />
              <span>Nueva Asignación a Vendedor</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Tabs Selector: Rendición de Caja Chica vs Asignación de Viáticos */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('petty-cash')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'petty-cash'
              ? 'border-brand text-brand-fg bg-surface rounded-t-2xl'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-2/50 rounded-t-xl'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Rendición de Caja Chica</span>
          <span className="text-micro font-mono bg-brand-soft px-2 py-0.5 rounded-full text-brand-fg">
            {pettyExpenses.length} comprobantes
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('travel-budgets')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'travel-budgets'
              ? 'border-brand text-brand-fg bg-surface rounded-t-2xl'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-2/50 rounded-t-xl'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Asignación de Viáticos a Vendedores</span>
          <span className="text-micro font-mono bg-surface-2 px-2 py-0.5 rounded-full text-ink-muted">
            {computedBudgets.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RENDICIÓN DE CAJA CHICA */}
      {activeTab === 'petty-cash' && (
        <div className="space-y-6">
          {/* KPI Financial Cards for Petty Cash */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Fondo Fijo Asignado */}
            <div className="bg-surface p-5 rounded-3xl border border-line shadow-xs space-y-2">
              <div className="flex items-center justify-between text-ink-subtle">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-brand-fg" /> Fondo Fijo Aperturado
                </span>
                <button
                  type="button"
                  onClick={() => setIsFundModalOpen(true)}
                  className="text-micro font-bold text-brand-fg hover:underline cursor-pointer"
                >
                  Editar
                </button>
              </div>
              <div className="text-2xl font-black font-mono text-ink">
                S/ {Number(pettyFund.assignedAmount).toFixed(2)}
              </div>
              <p className="text-micro text-ink-muted truncate" title={pettyFund.name}>
                {pettyFund.name}
              </p>
            </div>

            {/* Card 2: Total Rendido / Gastado */}
            <div className="bg-surface p-5 rounded-3xl border border-line shadow-xs space-y-2">
              <div className="flex items-center justify-between text-ink-subtle">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-rose-500" /> Total Rendido en Comprobantes
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                S/ {totalRendido.toFixed(2)}
              </div>
              <p className="text-micro text-ink-muted">
                {pettyExpenses.length} facturas y comprobantes procesados
              </p>
            </div>

            {/* Card 3: Saldo Disponible */}
            <div className="bg-surface p-5 rounded-3xl border border-line shadow-xs space-y-2">
              <div className="flex items-center justify-between text-ink-subtle">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" /> Saldo en Efectivo en Caja
                </span>
                <span className={`px-2 py-0.5 rounded-full text-micro font-bold uppercase ${
                  saldoDisponible < 300 
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20" 
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                }`}>
                  {saldoDisponible <= 0 ? "Agotado" : (saldoDisponible < 500 ? "Crítico" : "Saludable")}
                </span>
              </div>
              <div className={`text-2xl font-black font-mono ${saldoDisponible < 300 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                S/ {saldoDisponible.toFixed(2)}
              </div>
              <p className="text-micro text-ink-muted">
                Dinero restante disponible para gastos
              </p>
            </div>

            {/* Card 4: Reposición Requerida */}
            <div className="bg-surface p-5 rounded-3xl border border-line shadow-xs space-y-2">
              <div className="flex items-center justify-between text-ink-subtle">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600" /> Monto a Reembolsar / Reponer
                </span>
                <span className="text-micro font-mono font-bold text-ink-subtle">
                  {porcentajeConsumido.toFixed(0)}%
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-ink">
                S/ {totalRendido.toFixed(2)}
              </div>
              <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    porcentajeConsumido > 80 ? "bg-rose-500" : (porcentajeConsumido > 50 ? "bg-amber-500" : "bg-brand")
                  }`}
                  style={{ width: `${porcentajeConsumido}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Notice Banner: Physical Invoice + Optional XML */}
          <div className="p-4 rounded-2xl bg-surface-2 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-soft text-brand-fg flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-ink">Registro de Facturas Físicas & Validación Tributaria SUNAT</span>
                <p className="text-micro text-ink-subtle mt-0.5">
                  Rinde facturas impresas, boletas y tickets con consulta automática de RUC (ACTIVO y HABIDO) y cálculo de IGV. También puedes importar el archivo XML de forma opcional.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  resetExpenseForm();
                  setEntryMode('manual');
                  setIsExpenseModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-brand-contrast rounded-xl font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Rendir Comprobante Físico</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetExpenseForm();
                  setEntryMode('xml');
                  setIsExpenseModalOpen(true);
                }}
                className="px-3 py-1.5 bg-surface hover:bg-surface-3 border border-line text-ink rounded-xl font-bold cursor-pointer text-micro flex items-center gap-1.5"
                title="Cargar archivo XML de factura electrónica"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cargar XML (Opcional)</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por RUC, proveedor o serie..."
                className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-10 pr-4 py-2 text-xs text-ink placeholder:text-ink-subtle focus-visible:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-mono text-ink-subtle uppercase tracking-wider shrink-0 flex items-center gap-1 font-semibold">
                <Filter className="w-3 h-3" /> Categoría:
              </span>
              {['all', 'Alimentación', 'Movilidad', 'Combustible', 'Peaje', 'Útiles y Oficina', 'Envíos y Mensajería', 'Mantenimiento', 'Otros'].map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                    categoryFilter === cat
                      ? "bg-brand text-brand-contrast shadow-sm"
                      : "bg-surface-2 text-ink-muted hover:text-ink"
                  }`}
                >
                  {cat === 'all' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Rendered Petty Cash Expenses */}
          <div className="bg-surface border border-line shadow-xs rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-ink-muted font-mono text-micro uppercase tracking-wider">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Comprobante</th>
                    <th className="py-3 px-4">Proveedor / Emisor</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-center">Estado SUNAT</th>
                    <th className="py-3 px-4 text-right">Base / IGV</th>
                    <th className="py-3 px-4 text-right">Total Rendido</th>
                    <th className="py-3 px-4 text-center">Sustento</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredPettyExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-ink-subtle">
                        <Receipt className="w-10 h-10 mx-auto mb-2 text-ink-muted opacity-40" />
                        <p className="font-bold">No hay comprobantes de caja chica registrados aún.</p>
                        <p className="text-micro mt-1">Haz clic en "Rendir Comprobante de Caja Chica" para cargar tu primera factura o boleta.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPettyExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-3 px-4 font-mono whitespace-nowrap text-ink">
                          {exp.date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-ink">{exp.docType}</div>
                          <div className="font-mono text-micro text-ink-subtle font-semibold">
                            {exp.series}-{exp.number}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="font-bold text-ink truncate" title={exp.companyName}>
                            {exp.companyName}
                          </div>
                          <div className="font-mono text-micro text-ink-subtle">
                            RUC: {exp.rucIssuer}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-micro font-bold bg-surface-2 border border-line text-ink">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-bold ${
                            exp.sunatCondition === "HABIDO" || exp.sunatStatus === "ACEPTADO"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            {exp.sunatCondition || "HABIDO"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-micro text-ink-muted whitespace-nowrap">
                          <div>S/ {Number(exp.subtotal || 0).toFixed(2)}</div>
                          <div className="text-ink-subtle">IGV: S/ {Number(exp.igv || 0).toFixed(2)}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm text-ink whitespace-nowrap">
                          S/ {Number(exp.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {exp.xmlFileName && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-micro font-bold border border-emerald-500/20" title={`XML: ${exp.xmlFileName}`}>
                                XML
                              </span>
                            )}
                            {exp.receiptImage ? (
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptImage(exp.receiptImage || null)}
                                className="p-1 rounded-lg text-brand-fg hover:bg-surface-2 transition-colors cursor-pointer"
                                title="Ver comprobante adjunto"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-micro text-ink-subtle italic">Sin foto</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeletePettyExpense(exp.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Eliminar comprobante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASIGNACIÓN DE VIÁTICOS A VENDEDORES (Fuerza de Ventas de Campo) */}
      {activeTab === 'travel-budgets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-surface p-5 rounded-3xl border border-line shadow-xs">
              <div className="flex items-center gap-2 text-ink-muted mb-2">
                <Users className="w-4 h-4 text-brand-fg" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Total Asignado a Vendedores</h3>
              </div>
              <div className="text-2xl font-black font-mono text-ink">S/ {totalAssignedVendedores.toFixed(2)}</div>
              <p className="text-micro text-ink-subtle mt-1">Presupuestos de viaje para fuerza de ventas en ruta</p>
            </div>
          </div>

          <div className="bg-surface border border-line shadow-xs rounded-3xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-fg" />
                Cuadro de Presupuestos Asignados por Asesor
              </h3>
              <button
                type="button"
                onClick={() => setIsTravelBudgetModalOpen(true)}
                className="btn-primary text-xs py-2 px-3.5 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Asignación
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-muted uppercase font-mono text-micro">
                    <th className="py-3 px-4">Vendedor / Asesor</th>
                    <th className="py-3 px-4 text-right">Asignado</th>
                    <th className="py-3 px-4 text-right">Consumido en Campo</th>
                    <th className="py-3 px-4 text-right">Saldo Disponible</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {computedBudgets.map((b, i) => (
                    <tr key={i} className="hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4 text-sm font-bold text-ink">{b.seller}</td>
                      <td className="py-3 px-4 text-sm font-mono font-bold text-ink text-right">S/ {b.assigned.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-mono text-rose-600 dark:text-rose-400 text-right">S/ {b.spent.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-mono font-black text-brand-fg text-right">S/ {b.balance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-micro font-bold uppercase tracking-wide ${
                          b.status === 'Activo' ? 'bg-success-soft text-success-fg' : 
                          b.status === 'Agotado' ? 'bg-danger-soft text-danger-fg' : 'bg-danger-soft text-danger-fg'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Rendir Comprobante de Caja Chica (Con Lector XML y Validación SUNAT) */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-line flex items-center justify-between shrink-0 bg-surface">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-soft text-brand-fg flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base font-display text-ink flex items-center gap-2">
                      Rendición de Comprobante — Caja Chica
                    </h3>
                    <p className="text-xs text-ink-subtle">
                      Registra los datos de la factura o comprobante físico impreso. También puedes cargar opcionalmente el archivo XML.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="text-ink-subtle hover:text-ink p-1.5 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Modo: Comprobante Físico (Predeterminado) vs Importar XML (Opcional) */}
              <div className="px-6 pt-3 pb-2 bg-surface flex flex-wrap items-center justify-between gap-2 border-b border-line/60">
                <div className="flex items-center p-1 bg-surface-2 rounded-2xl border border-line w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setEntryMode('manual')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      entryMode === 'manual'
                        ? 'bg-surface text-ink shadow-xs border border-line/50 font-extrabold'
                        : 'text-ink-subtle hover:text-ink'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-fg" />
                    <span>Factura o Comprobante Físico (Manual)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode('xml')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      entryMode === 'xml'
                        ? 'bg-surface text-ink shadow-xs border border-line/50 font-extrabold'
                        : 'text-ink-subtle hover:text-ink'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Importar con Archivo XML</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-soft text-brand-fg font-normal">
                      Opcional
                    </span>
                  </button>
                </div>

                {xmlFileName && (
                  <span className="inline-flex items-center gap-1.5 text-micro font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    XML: {xmlFileName}
                  </span>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* VISTA 1: IMPORTADOR XML OPCIONAL */}
                {entryMode === 'xml' && (
                  <div className="space-y-4 animate-in fade-in">
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
                      className={`p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        isDraggingXml
                          ? "border-brand bg-brand-soft/40 scale-[1.01]"
                          : "border-brand/40 hover:border-brand bg-brand-soft/10 hover:bg-brand-soft/20"
                      }`}
                    >
                      <input
                        type="file"
                        id="sunat-xml-input"
                        accept=".xml"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files[0]) {
                            handleXmlFileUpload(files[0]);
                          }
                        }}
                      />
                      <label htmlFor="sunat-xml-input" className="cursor-pointer flex flex-col items-center w-full">
                        <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand-fg flex items-center justify-center mb-3">
                          <Sparkles className="w-6 h-6 text-amber-500" />
                        </div>
                        <span className="text-sm font-bold text-ink">
                          {xmlFileName ? `Archivo cargado: ${xmlFileName}` : "Sube el archivo XML de la Factura Electrónica (UBL 2.1)"}
                        </span>
                        <p className="text-xs text-ink-subtle mt-1.5 max-w-md">
                          Arrastra y suelta tu archivo .xml aquí para rellenar RUC, Proveedor, Serie, Número, Fechas y Montos sin transcribir.
                        </p>
                        <div className="mt-4 px-4 py-2 bg-brand text-brand-contrast rounded-xl text-xs font-bold shadow-xs">
                          Seleccionar archivo .XML del equipo
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-line text-xs">
                      <span className="text-ink-subtle">
                        ¿Tienes una factura impresa o ticket físico en papel?
                      </span>
                      <button
                        type="button"
                        onClick={() => setEntryMode('manual')}
                        className="text-brand-fg font-bold hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ir al registro manual</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VISTA 2: REGISTRO MANUAL DE FACTURA IMPRESA / COMPROBANTE FÍSICO */}
                {entryMode === 'manual' && (
                  <div className="space-y-4">
                    {/* Banner de origen si viene de XML o sugerencia opcional */}
                    {xmlFileName ? (
                      <div className="p-3 bg-brand-soft/30 border border-brand/30 text-ink rounded-2xl text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-brand-fg shrink-0" />
                          <div>
                            <span className="font-bold">Datos importados desde XML:</span>{" "}
                            <span className="font-mono text-ink-subtle">{xmlFileName}</span>
                            <p className="text-micro text-ink-subtle mt-0.5">
                              Revisa y ajusta cualquier campo para que coincida exactamente con tu factura impresa.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setXmlFileName(null)}
                          className="text-micro text-ink-subtle hover:text-ink underline shrink-0 cursor-pointer"
                        >
                          Quitar XML
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-2/60 border border-line rounded-xl text-micro text-ink-subtle">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-brand-fg" />
                          Registrando factura o boleta física entregada para rendición
                        </span>
                        <button
                          type="button"
                          onClick={() => setEntryMode('xml')}
                          className="text-brand-fg font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          ¿Tienes el XML? Cargar aquí
                        </button>
                      </div>
                    )}

                    {/* XML Success Notice */}
                    {xmlSuccessNotice && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{xmlSuccessNotice}</span>
                      </div>
                    )}

                    {/* SUNAT Validation Result Box */}
                    {sunatValidationResult && (
                      <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        sunatValidationResult.isDuplicate 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                          : (sunatValidationResult.valid 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" 
                              : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300")
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-1.5">
                            {sunatValidationResult.isDuplicate ? (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span>{sunatValidationResult.isDuplicate ? "¡Alerta de Duplicidad!" : "Verificación Tributaria SUNAT"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {sunatValidationResult.state && (
                              <span className="px-2 py-0.5 rounded-full text-micro font-bold bg-surface border border-line text-ink">
                                Estado: {sunatValidationResult.state}
                              </span>
                            )}
                            {sunatValidationResult.condition && (
                              <span className={`px-2 py-0.5 rounded-full text-micro font-bold ${
                                sunatValidationResult.condition === "HABIDO" 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-rose-600 text-white"
                              }`}>
                                Condición: {sunatValidationResult.condition}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-micro leading-relaxed">
                          {sunatValidationResult.message}
                        </p>
                      </div>
                    )}

                    {/* Main Form Fields */}
                    <form id="petty-cash-form" onSubmit={handleSubmitPettyExpense} className="space-y-4">
                      {/* Fila 1: Tipo de Comprobante, RUC Emisor y Razón Social */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Tipo de Comprobante</label>
                          <select
                            value={docType}
                            onChange={(e) => handleDocTypeChange(e.target.value as any)}
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                          >
                            <option value="Factura">Factura Electrónica / Física</option>
                            <option value="Boleta">Boleta de Venta</option>
                            <option value="Ticket">Ticket / Peaje / Estacionamiento</option>
                            <option value="Recibo">Recibo de Caja / Simple</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">RUC Emisor (11 Dígitos)</label>
                          <div className="flex gap-1.5 mt-1">
                            <input
                              type="text"
                              required
                              maxLength={11}
                              value={rucIssuer}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                setRucIssuer(val);
                                if (val.length === 11) {
                                  triggerSunatValidation(val, series, number, Number(amount) || 0, docType);
                                }
                              }}
                              onBlur={() => {
                                if (rucIssuer.trim().length === 11) {
                                  triggerSunatValidation(rucIssuer.trim(), series, number, Number(amount) || 0, docType);
                                }
                              }}
                              placeholder="20100070970"
                              className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => triggerSunatValidation(rucIssuer, series, number, Number(amount) || 0, docType)}
                              disabled={isValidatingSunat || rucIssuer.length < 11}
                              className="px-2.5 py-1.5 bg-surface-2 hover:bg-surface-3 text-ink rounded-xl text-micro font-bold border border-line cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                              title="Consultar RUC en SUNAT"
                            >
                              {isValidatingSunat ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Consultar"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Razón Social Proveedor</label>
                          <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Nombre o razón social del emisor"
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                          />
                        </div>
                      </div>

                      {/* Fila 2: Serie, Número, Fecha y Categoría */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Serie (Ej. F001)</label>
                          <input
                            type="text"
                            required
                            maxLength={10}
                            value={series}
                            onChange={(e) => setSeries(e.target.value.toUpperCase())}
                            placeholder="F001"
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Número Correlativo</label>
                          <input
                            type="text"
                            required
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="00045231"
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Fecha de Emisión</label>
                          <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Categoría de Gasto</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as any)}
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                          >
                            <option value="Alimentación">Alimentación</option>
                            <option value="Movilidad">Movilidad</option>
                            <option value="Combustible">Combustible</option>
                            <option value="Peaje">Peaje</option>
                            <option value="Útiles y Oficina">Útiles y Oficina</option>
                            <option value="Envíos y Mensajería">Envíos y Mensajería</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                            <option value="Otros">Otros</option>
                          </select>
                        </div>
                      </div>

                      {/* Fila 3: Importes y Desglose Automático de IGV */}
                      <div className="bg-surface-2/40 p-3.5 rounded-2xl border border-line space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-micro font-bold text-brand-fg uppercase">
                              Importe Total a Rendir (S/) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.1"
                              required
                              value={amount}
                              onChange={(e) => handleAmountChange(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full mt-1 bg-surface border-2 border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink focus-visible:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-micro font-bold text-ink-muted uppercase">Base Imponible / Subtotal (S/)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={subtotal}
                              onChange={(e) => setSubtotal(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full mt-1 bg-surface border border-line focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-micro font-bold text-ink-muted uppercase">IGV 18% (S/)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={igv}
                              onChange={(e) => setIgv(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full mt-1 bg-surface border border-line focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                            />
                          </div>
                        </div>

                        {/* Checkbox de cálculo automático */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-ink-subtle px-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={autoCalcIgv}
                              onChange={(e) => toggleAutoCalcIgv(e.target.checked)}
                              className="w-4 h-4 rounded text-brand focus:ring-brand/20 accent-brand cursor-pointer"
                            />
                            <span className="font-semibold text-ink">
                              Desglosar Base Imponible e IGV (18%) automáticamente al ingresar el Total
                            </span>
                          </label>
                          <span className="text-micro text-ink-muted">
                            {docType === "Factura" ? "Aplica a facturas con IGV" : "Boletas y tickets no desglosan crédito fiscal"}
                          </span>
                        </div>
                      </div>

                      {/* Fila 4: Detalle y Comprobante Físico Digitalizado (Foto/PDF) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">Concepto / Detalle del Gasto</label>
                          <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe el motivo o concepto del gasto de caja chica..."
                            className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-micro font-bold text-ink-muted uppercase">
                            Foto / PDF del Comprobante Impreso (Sustento Físico)
                          </label>
                          <div className="mt-1 flex items-center gap-3">
                            <label className="flex-1 p-3 bg-surface-2 hover:bg-surface-3 border border-dashed border-line rounded-xl cursor-pointer text-center text-xs text-ink transition-colors flex flex-col items-center justify-center min-h-[78px]">
                              <span className="font-bold flex items-center justify-center gap-1.5 text-ink">
                                <UploadCloud className="w-4 h-4 text-brand-fg" />
                                {receiptImage ? "Cambiar foto/documento" : "Adjuntar foto o escaneo del comprobante"}
                              </span>
                              <span className="text-[10px] text-ink-subtle mt-0.5">
                                Formatos soportados: JPG, PNG o PDF
                              </span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleReceiptImageUpload}
                                className="hidden"
                              />
                            </label>
                            {receiptImage && (
                              <div className="w-16 h-16 rounded-xl bg-surface-2 border border-line overflow-hidden shrink-0 relative group">
                                <img src={receiptImage} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setReceiptImage(null)}
                                  className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-micro font-bold"
                                  title="Quitar imagen"
                                >
                                  Quitar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-line flex items-center justify-between gap-3 bg-surface shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-field-hover text-ink text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  form="petty-cash-form"
                  disabled={isSubmittingExpense || sunatValidationResult?.isDuplicate}
                  className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingExpense ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Registrando Rendición...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Registrar en Caja Chica (S/ {Number(amount || 0).toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Configurar Monto del Fondo Fijo de Caja Chica */}
      <AnimatePresence>
        {isFundModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-3xl shadow-2xl max-w-md w-full p-6 relative text-left"
            >
              <button
                type="button"
                onClick={() => setIsFundModalOpen(false)}
                className="absolute top-4 right-4 text-ink-subtle hover:text-ink cursor-pointer p-1.5 rounded-xl hover:bg-surface-2"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-2xl bg-brand-soft text-brand-fg flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base font-display text-ink">
                    Fondo Fijo de Caja Chica
                  </h3>
                  <p className="text-micro text-ink-subtle">
                    Ajusta el monto total aperturado para la caja chica.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveFund} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink-muted uppercase">Nombre del Fondo</label>
                  <input
                    type="text"
                    required
                    value={fundNameInput}
                    onChange={(e) => setFundNameInput(e.target.value)}
                    className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-muted uppercase">Monto Aperturado (S/)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={fundAmountInput}
                    onChange={(e) => setFundAmountInput(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-sm font-mono font-bold text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFundModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-2 text-ink text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary text-xs">
                    Guardar Fondo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Ver Comprobante Digital / Imagen */}
      <AnimatePresence>
        {selectedReceiptImage && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-3xl max-w-2xl w-full p-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                <span className="text-xs font-bold text-ink">Comprobante de Sustento Digital</span>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptImage(null)}
                  className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/20 rounded-2xl p-2">
                <img src={selectedReceiptImage} alt="Comprobante" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Asignar Presupuesto a Vendedor (Legacy) */}
      <AnimatePresence>
        {isTravelBudgetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-3xl w-full max-w-md p-6 relative text-left"
            >
              <button
                type="button"
                onClick={() => setIsTravelBudgetModalOpen(false)}
                className="absolute top-4 right-4 text-ink-subtle hover:text-ink cursor-pointer p-1.5 rounded-xl hover:bg-surface-2"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-ink font-display">
                <Users className="w-5 h-5 text-brand-fg" />
                Asignar Presupuesto de Viaje a Vendedor
              </h3>

              <form onSubmit={handleSubmitSellerBudget} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink-muted uppercase">Asesor Comercial</label>
                  <select
                    required
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                  >
                    <option value="">Seleccione Asesor...</option>
                    <option value="Ana Torres">Ana Torres</option>
                    <option value="Luis Gomez">Luis Gomez</option>
                    <option value="Carlos Mendoza">Carlos Mendoza</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-muted uppercase">Monto Asignado (S/)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={assigned}
                    onChange={(e) => setAssigned(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Ej. 1500.00"
                    className="w-full mt-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-mono text-ink focus-visible:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full mt-4"
                >
                  Confirmar Asignación
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
