import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Download, X, Plus, Calculator, CheckCircle2, Clock, Layers, MapPin, Search, Trash2, FileText, Sparkles, ShieldCheck, Edit3, Save, RotateCcw } from 'lucide-react';
import { Commission, Quote, User, SalesZone, CalculationType } from '../types';

interface CommissionsProps {
  commissions: Commission[];
  onAddCommission: (comm: Commission) => void;
  onUpdateCommissionStatus?: (id: string, status: 'Pagado' | 'Pendiente') => void;
  onDeleteCommission?: (id: string) => void;
  quotes?: Quote[];
  users?: User[];
}

// INITIAL BASELINE MATRIX DEFINITIONS FROM OFFICIAL TABLES
const DEFAULT_LIMA_CONDITIONS = [
  { condition: 'CONTADO', general: 5.0, diferenciada: 2.5, xProducto: 3.0, xProductoDif: 1.5, liquidacionXProd: 0.75 },
  { condition: 'A 30 DIAS', general: 4.0, diferenciada: 2.0, xProducto: 2.0, xProductoDif: 1.0, liquidacionXProd: 0.50 },
  { condition: 'A 45 DIAS', general: 3.0, diferenciada: 1.5, xProducto: 2.0, xProductoDif: 1.0, liquidacionXProd: 0.50 },
  { condition: 'A 60 DIAS', general: 2.0, diferenciada: 1.5, xProducto: 1.0, xProductoDif: 1.0, liquidacionXProd: 0.50 },
  { condition: '+ DE 60 DIAS', general: 0.0, diferenciada: 0.0, xProducto: 0.0, xProductoDif: 0.0, liquidacionXProd: 0.00 },
];

const DEFAULT_LIMA_PRODUCTS = [
  { category: 'LLANTAS, CAMARAS', general: 3.0, diferenciada: 1.5 },
  { category: 'KIT, CADENAS, CATALINAS', general: 3.0, diferenciada: 1.5 },
  { category: 'BATERIAS', general: 3.0, diferenciada: 1.5 },
  { category: 'ACCESORIOS Y REPUESTOS', general: 5.0, diferenciada: 2.5 },
];

const DEFAULT_PROV_METAS_CONDITIONS = [
  { condition: 'CONTADO', general: 4.0, diferenciada: 2.0, xProducto: 3.0, xProductoDif: 1.5, liquidacionXProd: 0.75 },
  { condition: 'A 45 DIAS', general: 4.0, diferenciada: 2.0, xProducto: 2.0, xProductoDif: 1.0, liquidacionXProd: 0.50 },
  { condition: 'A 50 DIAS', general: 3.0, diferenciada: 1.5, xProducto: 2.0, xProductoDif: 1.0, liquidacionXProd: 0.50 },
  { condition: 'A 60 DIAS', general: 2.0, diferenciada: 1.5, xProducto: 1.0, xProductoDif: 1.0, liquidacionXProd: 0.50 },
  { condition: '+ DE 60 DIAS', general: 0.0, diferenciada: 0.0, xProducto: 0.0, xProductoDif: 0.0, liquidacionXProd: 0.00 },
];

const DEFAULT_PROV_METAS_PRODUCTS = [
  { category: 'LLANTAS, CAMARAS', general: 3.0, diferenciada: 1.5 },
  { category: 'KIT, CADENAS, CATALINAS', general: 3.0, diferenciada: 1.5 },
  { category: 'BATERIAS', general: 3.0, diferenciada: 1.5 },
  { category: 'ACCESORIOS Y REPUESTOS', general: 4.0, diferenciada: 2.0 },
];

const DEFAULT_PROV_FIRST_SALE_CONDITIONS = [
  { condition: 'CONTADO', general: 1.5, diferenciada: 0.75, xProducto: 0.5, xProductoDif: 0.25, liquidacionXProd: 0.13 },
  { condition: 'A 45 DIAS', general: 1.5, diferenciada: 0.75, xProducto: 0.5, xProductoDif: 0.25, liquidacionXProd: 0.13 },
  { condition: 'A 50 DIAS', general: 1.5, diferenciada: 0.75, xProducto: 0.5, xProductoDif: 0.25, liquidacionXProd: 0.13 },
  { condition: 'A 60 DIAS', general: 1.0, diferenciada: 0.50, xProducto: 0.5, xProductoDif: 0.25, liquidacionXProd: 0.13 },
  { condition: '+ DE 60 DIAS', general: 0.0, diferenciada: 0.00, xProducto: 0.0, xProductoDif: 0.00, liquidacionXProd: 0.00 },
];

const DEFAULT_PROV_FIRST_SALE_PRODUCTS = [
  { category: 'LLANTAS, CAMARAS', general: 0.5, diferenciada: 0.25 },
  { category: 'KIT, CADENAS, CATALINAS', general: 0.5, diferenciada: 0.25 },
  { category: 'BATERIAS', general: 0.5, diferenciada: 0.25 },
  { category: 'ACCESORIOS Y REPUESTOS', general: 1.5, diferenciada: 0.75 },
];

export function Commissions({
  commissions,
  onAddCommission,
  onUpdateCommissionStatus,
  onDeleteCommission,
  quotes = [],
  users = []
}: CommissionsProps) {
  const [activeTab, setActiveTab] = useState<SalesZone>('Zona - Lima');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMatrixModalOpen, setIsEditMatrixModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState<string>('TODAS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Editable Matrices State
  const [limaConditions, setLimaConditions] = useState(DEFAULT_LIMA_CONDITIONS);
  const [limaProducts, setLimaProducts] = useState(DEFAULT_LIMA_PRODUCTS);
  const [limaVacationRate, setLimaVacationRate] = useState(2.5);

  const [provMetasConditions, setProvMetasConditions] = useState(DEFAULT_PROV_METAS_CONDITIONS);
  const [provMetasProducts, setProvMetasProducts] = useState(DEFAULT_PROV_METAS_PRODUCTS);
  const [provMetasVacationRate, setProvMetasVacationRate] = useState(2.5);
  const [provMetasVacationCap, setProvMetasVacationCap] = useState(15000);

  const [provFirstConditions, setProvFirstConditions] = useState(DEFAULT_PROV_FIRST_SALE_CONDITIONS);
  const [provFirstProducts, setProvFirstProducts] = useState(DEFAULT_PROV_FIRST_SALE_PRODUCTS);
  const [provFirstVacationRate, setProvFirstVacationRate] = useState(0.75);

  // Load custom tables from backend if modified
  useEffect(() => {
    fetch('/api/commission-tables')
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data) {
          if (data.limaConditions) setLimaConditions(data.limaConditions);
          if (data.limaProducts) setLimaProducts(data.limaProducts);
          if (data.limaVacationRate) setLimaVacationRate(data.limaVacationRate);
          if (data.provMetasConditions) setProvMetasConditions(data.provMetasConditions);
          if (data.provMetasProducts) setProvMetasProducts(data.provMetasProducts);
          if (data.provMetasVacationRate) setProvMetasVacationRate(data.provMetasVacationRate);
          if (data.provMetasVacationCap) setProvMetasVacationCap(data.provMetasVacationCap);
          if (data.provFirstConditions) setProvFirstConditions(data.provFirstConditions);
          if (data.provFirstProducts) setProvFirstProducts(data.provFirstProducts);
          if (data.provFirstVacationRate) setProvFirstVacationRate(data.provFirstVacationRate);
        }
      })
      .catch(e => console.error("Error cargando tablas de comisiones:", e));
  }, []);

  const handleSaveMatrixChanges = async () => {
    const payload = {
      limaConditions,
      limaProducts,
      limaVacationRate,
      provMetasConditions,
      provMetasProducts,
      provMetasVacationRate,
      provMetasVacationCap,
      provFirstConditions,
      provFirstProducts,
      provFirstVacationRate
    };

    try {
      await fetch('/api/commission-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setSaveSuccessMsg('¡Parámetros de comisiones actualizados correctamente!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      setIsEditMatrixModalOpen(false);
    } catch (err) {
      console.error('Error guardando matriz:', err);
    }
  };

  const handleResetMatrixDefaults = () => {
    setLimaConditions(DEFAULT_LIMA_CONDITIONS);
    setLimaProducts(DEFAULT_LIMA_PRODUCTS);
    setLimaVacationRate(2.5);
    setProvMetasConditions(DEFAULT_PROV_METAS_CONDITIONS);
    setProvMetasProducts(DEFAULT_PROV_METAS_PRODUCTS);
    setProvMetasVacationRate(2.5);
    setProvMetasVacationCap(15000);
    setProvFirstConditions(DEFAULT_PROV_FIRST_SALE_CONDITIONS);
    setProvFirstProducts(DEFAULT_PROV_FIRST_SALE_PRODUCTS);
    setProvFirstVacationRate(0.75);

    handleSaveMatrixChanges();
  };

  // Form state
  const [seller, setSeller] = useState('');
  const [zone, setZone] = useState<SalesZone>('Zona - Lima');
  const [calculationType, setCalculationType] = useState<CalculationType>('Por Condición');
  const [condition, setCondition] = useState('CONTADO');
  const [productCategory, setProductCategory] = useState('ACCESORIOS Y REPUESTOS');
  const [isDiferenciada, setIsDiferenciada] = useState(false);
  const [salesTotalInput, setSalesTotalInput] = useState<number | ''>('');
  const [month, setMonth] = useState('Septiembre 2026');
  const [notes, setNotes] = useState('');

  // Auto-detect seller zone & auto-calculate total sales from quotes
  const handleSellerChange = (selectedSellerName: string) => {
    setSeller(selectedSellerName);
    const foundUser = users.find(u => u.name === selectedSellerName);
    if (foundUser && foundUser.salesZone) {
      setZone(foundUser.salesZone);
    }

    if (quotes && quotes.length > 0) {
      const sellerQuotes = quotes.filter(q =>
        q.advisor === selectedSellerName && (q.status === 'Aceptada' || (q.status as string) === 'billed' || (q.status as string) === 'Aprobada')
      );
      const totalFromQuotes = sellerQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
      if (totalFromQuotes > 0) {
        setSalesTotalInput(totalFromQuotes);
      }
    }
  };

  // Dynamic Rate Calculation Engine
  const computeCommissionRateAndAmount = (
    currentZone: SalesZone,
    calcType: CalculationType,
    cond: string,
    cat: string,
    isDif: boolean,
    amount: number
  ) => {
    let rate = 0;
    let cappedSales = amount;
    let isCapped = false;

    if (calcType === 'Periodo Vacacional') {
      if (currentZone === 'Zona - Lima') {
        rate = limaVacationRate;
      } else if (currentZone === 'Provincia - Con Metas') {
        rate = provMetasVacationRate;
        if (amount > provMetasVacationCap) {
          cappedSales = provMetasVacationCap;
          isCapped = true;
        }
      } else if (currentZone === 'Provincia - Desde 1era Venta') {
        rate = provFirstVacationRate;
      }
      const calculatedComm = cappedSales * (rate / 100);
      return { rate, commissionAmt: calculatedComm, cappedSales, isCapped };
    }

    if (calcType === 'Por Condición') {
      let list = limaConditions;
      if (currentZone === 'Provincia - Con Metas') list = provMetasConditions;
      if (currentZone === 'Provincia - Desde 1era Venta') list = provFirstConditions;

      const item = list.find(c => c.condition === cond) || list[0];
      rate = isDif ? item.diferenciada : item.general;
    } else if (calcType === 'Por Producto') {
      let list = limaProducts;
      if (currentZone === 'Provincia - Con Metas') list = provMetasProducts;
      if (currentZone === 'Provincia - Desde 1era Venta') list = provFirstProducts;

      const item = list.find(p => p.category === cat) || list[0];
      rate = isDif ? item.diferenciada : item.general;
    }

    const calculatedComm = amount * (rate / 100);
    return { rate, commissionAmt: calculatedComm, cappedSales, isCapped: false };
  };

  const currentAmount = typeof salesTotalInput === 'number' ? salesTotalInput : 0;
  const currentCalculation = computeCommissionRateAndAmount(
    zone,
    calculationType,
    condition,
    productCategory,
    isDiferenciada,
    currentAmount
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller || salesTotalInput === '' || Number(salesTotalInput) < 0) return;

    const { rate, commissionAmt } = currentCalculation;

    onAddCommission({
      id: `COM-${Math.floor(1000 + Math.random() * 9000)}`,
      seller,
      zone,
      salesTotal: Number(salesTotalInput),
      rate,
      commission: commissionAmt,
      month,
      status: 'Pendiente',
      calculationType,
      condition: calculationType === 'Por Condición' ? condition : calculationType === 'Por Producto' ? productCategory : 'Vacaciones',
      productCategory: calculationType === 'Por Producto' ? productCategory : undefined,
      isDiferenciada,
      notes,
      createdAt: new Date().toISOString()
    });

    setIsModalOpen(false);
    setSeller('');
    setSalesTotalInput('');
    setNotes('');
  };

  // Filtered list
  const filteredCommissions = commissions.filter(c => {
    const matchesSearch = (c.seller || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.month || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = filterZone === 'TODAS' || c.zone === filterZone;
    const matchesStatus = filterStatus === 'TODOS' || c.status === filterStatus;
    return matchesSearch && matchesZone && matchesStatus;
  });

  // KPI Metrics
  const totalPaid = commissions.filter(c => c.status === 'Pagado').reduce((sum, c) => sum + c.commission, 0);
  const totalPending = commissions.filter(c => c.status === 'Pendiente').reduce((sum, c) => sum + c.commission, 0);
  const totalSales = commissions.reduce((sum, c) => sum + c.salesTotal, 0);
  const avgRate = commissions.length > 0 ? (commissions.reduce((sum, c) => sum + c.rate, 0) / commissions.length).toFixed(2) : '0.00';

  const exportToCSV = () => {
    const headers = ["ID", "Asesor", "Zona", "Mes", "Modalidad", "Condicion / Categoria", "Diferenciada", "Venta (S/)", "Tasa (%)", "Comision (S/)", "Estado"];
    const rows = filteredCommissions.map(c => [
      c.id,
      `"${c.seller}"`,
      `"${c.zone}"`,
      `"${c.month}"`,
      `"${c.calculationType || ''}"`,
      `"${c.condition || ''}"`,
      c.isDiferenciada ? "SI" : "NO",
      c.salesTotal.toFixed(2),
      c.rate.toFixed(2),
      c.commission.toFixed(2),
      c.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comisiones_choho_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 space-y-8 text-left"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#4D4DFF]/10 text-[#4D4DFF] text-xs font-bold uppercase tracking-wider">
              Módulo Financiero B2B
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-display text-slate-900 dark:text-[#3D3528] mt-1">
            Gestión y Cálculo de Comisiones
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#7F735F]">
            Matriz de parámetros oficial para Zona Lima, Provincia Con Metas y Provincia Desde 1era Venta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditMatrixModalOpen(true)}
            className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-800 dark:text-amber-400 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer hover:bg-amber-100"
            title="Ajustar tasas de comisiones o topes"
          >
            <Edit3 className="w-4 h-4 text-amber-600" />
            Editar Parámetros
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#4D4DFF] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-[#4D4DFF]/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Liquidación
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer hidden sm:flex shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#FFFFFF] p-5 rounded-2xl border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Comisiones Pagadas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">S/ {totalPaid.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Liquidaciones procesadas</div>
        </div>

        <div className="bg-white dark:bg-[#FFFFFF] p-5 rounded-2xl border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Por Liquidar (Pendiente)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">S/ {totalPending.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{commissions.filter(c => c.status === 'Pendiente').length} asesores pendientes</div>
        </div>

        <div className="bg-white dark:bg-[#FFFFFF] p-5 rounded-2xl border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Tasa Promedio</span>
            <div className="p-2 bg-blue-50 text-[#4D4DFF] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#4D4DFF]">{avgRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Sobre total de ventas</div>
        </div>

        <div className="bg-white dark:bg-[#FFFFFF] p-5 rounded-2xl border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ventas Evaluadas</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#3D3528]">S/ {totalSales.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Base imponible acumulada</div>
        </div>
      </div>

      {/* OFFICIAL COMMISSION TABLES VISUALIZER */}
      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#E5DEC9] pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-[#3D3528] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4D4DFF]" />
              Tablas de Parámetros de Comisiones por Zona
            </h3>
            <p className="text-xs text-slate-500">
              Consulta las matrices oficiales de porcentaje según zona, plazo de crédito, producto y periodo vacacional.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#F7F8FC] dark:bg-[#F7F8FC] p-1.5 rounded-2xl border border-slate-100 dark:border-[#E5DEC9] overflow-x-auto">
            {(['Zona - Lima', 'Provincia - Con Metas', 'Provincia - Desde 1era Venta'] as SalesZone[]).map((zoneName) => (
              <button
                key={zoneName}
                onClick={() => setActiveTab(zoneName)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === zoneName
                    ? 'bg-[#4D4DFF] text-white shadow-md shadow-[#4D4DFF]/20'
                    : 'text-slate-600 dark:text-[#7F735F] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {zoneName}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: ZONA LIMA */}
        {activeTab === 'Zona - Lima' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#4D4DFF]" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#3D3528]">COMISIONES VENTAS — ZONA LIMA</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Condition Table */}
              <div className="lg:col-span-2 overflow-x-auto border border-slate-100 dark:border-[#E5DEC9] rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8FC] dark:bg-[#F7F8FC] border-b border-slate-100 dark:border-[#E5DEC9]">
                      <th className="py-3 px-3 font-bold text-slate-600 uppercase">Condición (Crédito)</th>
                      <th className="py-3 px-3 font-bold text-[#4D4DFF] text-center uppercase">% General</th>
                      <th className="py-3 px-3 font-bold text-purple-600 text-center uppercase">% Diferenciada</th>
                      <th className="py-3 px-3 font-bold text-emerald-600 text-center uppercase">% x Producto</th>
                      <th className="py-3 px-3 font-bold text-slate-500 text-center uppercase">% Dif. Prod</th>
                      <th className="py-3 px-3 font-bold text-amber-600 text-center uppercase">% Liquidación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {limaConditions.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-[#3D3528]">{row.condition}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#4D4DFF] font-mono">{row.general.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-purple-600 font-mono">{row.diferenciada.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 font-mono">{row.xProducto.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{row.xProductoDif.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-600 font-mono">{row.liquidacionXProd > 0 ? `${row.liquidacionXProd}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Product Table & Vacation Box */}
              <div className="space-y-4">
                <div className="border border-slate-100 dark:border-[#E5DEC9] rounded-2xl overflow-hidden">
                  <div className="bg-[#F7F8FC] dark:bg-[#F7F8FC] px-3 py-2 border-b border-slate-100 dark:border-[#E5DEC9] font-bold text-xs text-slate-700">
                    Por Productos (Lima)
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#E5DEC9] text-[10px] uppercase text-slate-400">
                        <th className="py-2 px-3">Línea</th>
                        <th className="py-2 px-3 text-right">% General</th>
                        <th className="py-2 px-3 text-right">% Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {limaProducts.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50">
                          <td className="py-2 px-3 font-medium text-slate-800 text-[11px]">{p.category}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#4D4DFF] font-mono">{p.general}%</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-600 font-mono">{p.diferenciada}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-[#4D4DFF] uppercase tracking-wider mb-1">Cálculo Vacacional (Lima)</div>
                  <div className="text-xl font-black text-slate-900">{limaVacationRate}% <span className="text-xs font-semibold text-slate-500">% General</span></div>
                  <p className="text-[11px] text-slate-500 mt-1">Por ventas realizadas en días de vacaciones. <strong>Sin tope máximo</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROVINCIA CON METAS */}
        {activeTab === 'Provincia - Con Metas' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#3D3528]">COMISIÓN CON METAS — PROVINCIA</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Condition Table */}
              <div className="lg:col-span-2 overflow-x-auto border border-slate-100 dark:border-[#E5DEC9] rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8FC] dark:bg-[#F7F8FC] border-b border-slate-100 dark:border-[#E5DEC9]">
                      <th className="py-3 px-3 font-bold text-slate-600 uppercase">Condición (Crédito)</th>
                      <th className="py-3 px-3 font-bold text-[#4D4DFF] text-center uppercase">% General</th>
                      <th className="py-3 px-3 font-bold text-purple-600 text-center uppercase">% Diferenciada</th>
                      <th className="py-3 px-3 font-bold text-emerald-600 text-center uppercase">% x Producto</th>
                      <th className="py-3 px-3 font-bold text-slate-500 text-center uppercase">% Dif. Prod</th>
                      <th className="py-3 px-3 font-bold text-amber-600 text-center uppercase">% Liquidación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provMetasConditions.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-[#3D3528]">{row.condition}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#4D4DFF] font-mono">{row.general.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-purple-600 font-mono">{row.diferenciada.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 font-mono">{row.xProducto.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{row.xProductoDif.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-600 font-mono">{row.liquidacionXProd > 0 ? `${row.liquidacionXProd}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Product Table & Vacation Box with Cap */}
              <div className="space-y-4">
                <div className="border border-slate-100 dark:border-[#E5DEC9] rounded-2xl overflow-hidden">
                  <div className="bg-[#F7F8FC] dark:bg-[#F7F8FC] px-3 py-2 border-b border-slate-100 dark:border-[#E5DEC9] font-bold text-xs text-slate-700">
                    Por Productos (Provincia Metas)
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#E5DEC9] text-[10px] uppercase text-slate-400">
                        <th className="py-2 px-3">Línea</th>
                        <th className="py-2 px-3 text-right">% General</th>
                        <th className="py-2 px-3 text-right">% Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provMetasProducts.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50">
                          <td className="py-2 px-3 font-medium text-slate-800 text-[11px]">{p.category}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#4D4DFF] font-mono">{p.general}%</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-600 font-mono">{p.diferenciada}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50/70 border border-amber-300 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Cálculo Vacacional (Provincia Metas)</div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">TOPE APLICADO</span>
                  </div>
                  <div className="text-xl font-black text-slate-900">{provMetasVacationRate}% <span className="text-xs font-normal text-slate-500">(Tope S/ {provMetasVacationCap.toLocaleString('es-PE')} de venta)</span></div>
                  <p className="text-[11px] text-slate-600 mt-1">Comisión máxima a pagar en vacaciones: <strong>S/ {(provMetasVacationCap * (provMetasVacationRate / 100)).toFixed(2)}</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROVINCIA DESDE 1ERA VENTA */}
        {activeTab === 'Provincia - Desde 1era Venta' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#3D3528]">COMISIÓN DESDE 1ERA. VENTA — PROVINCIA</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Condition Table */}
              <div className="lg:col-span-2 overflow-x-auto border border-slate-100 dark:border-[#E5DEC9] rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8FC] dark:bg-[#F7F8FC] border-b border-slate-100 dark:border-[#E5DEC9]">
                      <th className="py-3 px-3 font-bold text-slate-600 uppercase">Condición (Crédito)</th>
                      <th className="py-3 px-3 font-bold text-[#4D4DFF] text-center uppercase">% General</th>
                      <th className="py-3 px-3 font-bold text-purple-600 text-center uppercase">% Diferenciada</th>
                      <th className="py-3 px-3 font-bold text-emerald-600 text-center uppercase">% x Producto</th>
                      <th className="py-3 px-3 font-bold text-slate-500 text-center uppercase">% Dif. Prod</th>
                      <th className="py-3 px-3 font-bold text-amber-600 text-center uppercase">% Liquidación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provFirstConditions.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-[#3D3528]">{row.condition}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#4D4DFF] font-mono">{row.general.toFixed(2)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-purple-600 font-mono">{row.diferenciada.toFixed(2)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 font-mono">{row.xProducto.toFixed(2)}%</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{row.xProductoDif.toFixed(2)}%</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-600 font-mono">{row.liquidacionXProd > 0 ? `${row.liquidacionXProd}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Product Table & Vacation Box */}
              <div className="space-y-4">
                <div className="border border-slate-100 dark:border-[#E5DEC9] rounded-2xl overflow-hidden">
                  <div className="bg-[#F7F8FC] dark:bg-[#F7F8FC] px-3 py-2 border-b border-slate-100 dark:border-[#E5DEC9] font-bold text-xs text-slate-700">
                    Por Productos (1era Venta)
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#E5DEC9] text-[10px] uppercase text-slate-400">
                        <th className="py-2 px-3">Línea</th>
                        <th className="py-2 px-3 text-right">% General</th>
                        <th className="py-2 px-3 text-right">% Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provFirstProducts.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50">
                          <td className="py-2 px-3 font-medium text-slate-800 text-[11px]">{p.category}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#4D4DFF] font-mono">{p.general}%</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-600 font-mono">{p.diferenciada}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Cálculo Vacacional (1era Venta)</div>
                  <div className="text-xl font-black text-slate-900">{provFirstVacationRate}% <span className="text-xs font-semibold text-slate-500">% General</span></div>
                  <p className="text-[11px] text-slate-500 mt-1">Por ventas realizadas en días de vacaciones. <strong>Sin tope máximo</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SETTLEMENTS HISTORICAL LIST */}
      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-[#3D3528] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4D4DFF]" />
              Historial de Liquidaciones Registradas
            </h3>
            <p className="text-xs text-slate-500">Resumen y control de pago de comisiones procesadas.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por asesor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none rounded-xl text-xs text-slate-800 dark:text-[#3D3528] focus:ring-2 focus:ring-[#4D4DFF]/20 focus:outline-none"
              />
            </div>

            {/* Filter Zone */}
            <select
              value={filterZone}
              onChange={e => setFilterZone(e.target.value)}
              className="bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#3D3528] focus:outline-none"
            >
              <option value="TODAS">Todas las Zonas</option>
              <option value="Zona - Lima">Zona - Lima</option>
              <option value="Provincia - Con Metas">Provincia - Con Metas</option>
              <option value="Provincia - Desde 1era Venta">Provincia - Desde 1era Venta</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#3D3528] focus:outline-none"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 dark:border-[#E5DEC9] rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F8FC] dark:bg-[#F7F8FC] border-b border-slate-100 dark:border-[#E5DEC9]">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asesor Comercial</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Zona</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Periodo</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Regla / Modalidad</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ventas Evaluadas</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tasa (%)</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Comisión</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No se encontraron liquidaciones registradas.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-100/50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 text-sm font-bold text-slate-900 dark:text-[#3D3528]">
                      {c.seller}
                      {c.notes && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{c.notes}</div>}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                        <MapPin className="w-3 h-3 text-[#4D4DFF]" />
                        {c.zone}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">{c.month}</td>
                    <td className="py-4 px-4 text-xs text-slate-700">
                      <span className="font-semibold block">{c.calculationType || 'Por Condición'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.condition} {c.isDiferenciada ? '(Diferenciada)' : ''}</span>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-slate-700 text-right">S/ {c.salesTotal.toFixed(2)}</td>
                    <td className="py-4 px-4 text-sm font-mono text-slate-800 font-bold text-right">{c.rate.toFixed(2)}%</td>
                    <td className="py-4 px-4 text-sm font-mono font-black text-emerald-600 text-right">S/ {c.commission.toFixed(2)}</td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => onUpdateCommissionStatus && onUpdateCommissionStatus(c.id, c.status === 'Pagado' ? 'Pendiente' : 'Pagado')}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all ${
                          c.status === 'Pagado' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                        title="Hacer clic para cambiar estado"
                      >
                        {c.status === 'Pagado' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {c.status}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {onDeleteCommission && (
                        <button
                          onClick={() => onDeleteCommission(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar liquidación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NUEVA LIQUIDACIÓN CON CALCULADORA */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-2xl rounded-3xl w-full max-w-xl p-6 md:p-8 relative overflow-hidden"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-[#E5DEC9] pb-4">
                <div className="p-3 bg-[#4D4DFF]/10 text-[#4D4DFF] rounded-2xl">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-[#3D3528]">
                    Generar Nueva Liquidación
                  </h3>
                  <p className="text-xs text-slate-500">Calculadora automatizada basada en la matriz de comisiones.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seller Selection */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Asesor Comercial</label>
                    <select
                      required
                      value={seller}
                      onChange={(e) => handleSellerChange(e.target.value)}
                      className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-[#3D3528] font-bold focus:outline-none"
                    >
                      <option value="">Seleccionar Asesor...</option>
                      {users.length > 0 ? (
                        users.map(u => (
                          <option key={u.id} value={u.name}>
                            {u.name} {u.salesZone ? `(${u.salesZone})` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Carlos Mendoza">Carlos Mendoza (Zona Lima)</option>
                          <option value="R. Mendoza">R. Mendoza (Provincia Metas)</option>
                          <option value="Ana Torres">Ana Torres (Provincia 1era Venta)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Zone Selection */}
                  <div>
                    <label className="text-[11px] font-bold text-[#4D4DFF] uppercase block mb-1">Zona de Ventas / Esquema</label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value as SalesZone)}
                      className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2.5 text-xs font-extrabold text-slate-800 dark:text-[#3D3528] focus:outline-none"
                    >
                      <option value="Zona - Lima">Zona - Lima</option>
                      <option value="Provincia - Con Metas">Provincia - Con Metas</option>
                      <option value="Provincia - Desde 1era Venta">Provincia - Desde 1era Venta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Calculation Mode */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Modalidad de Regla</label>
                    <select
                      value={calculationType}
                      onChange={(e) => setCalculationType(e.target.value as CalculationType)}
                      className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-[#3D3528] focus:outline-none"
                    >
                      <option value="Por Condición">Por Condición de Pago (Crédito)</option>
                      <option value="Por Producto">Por Categoría de Producto</option>
                      <option value="Periodo Vacacional">Periodo Vacacional</option>
                    </select>
                  </div>

                  {/* Dynamic Rule Option */}
                  {calculationType === 'Por Condición' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Plazo de Cobro (Días)</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-[#3D3528] focus:outline-none"
                      >
                        <option value="CONTADO">CONTADO</option>
                        {zone === 'Zona - Lima' && <option value="A 30 DIAS">A 30 DIAS</option>}
                        <option value="A 45 DIAS">A 45 DIAS</option>
                        {(zone === 'Provincia - Con Metas' || zone === 'Provincia - Desde 1era Venta') && <option value="A 50 DIAS">A 50 DIAS</option>}
                        <option value="A 60 DIAS">A 60 DIAS</option>
                        <option value="+ DE 60 DIAS">+ DE 60 DIAS</option>
                      </select>
                    </div>
                  )}

                  {calculationType === 'Por Producto' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Línea de Producto</label>
                      <select
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                        className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-[#3D3528] focus:outline-none"
                      >
                        <option value="LLANTAS, CAMARAS">LLANTAS, CAMARAS</option>
                        <option value="KIT, CADENAS, CATALINAS">KIT, CADENAS, CATALINAS</option>
                        <option value="BATERIAS">BATERIAS</option>
                        <option value="ACCESORIOS Y REPUESTOS">ACCESORIOS Y REPUESTOS</option>
                      </select>
                    </div>
                  )}

                  {calculationType === 'Periodo Vacacional' && (
                    <div className="flex items-center">
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-800 font-medium">
                        {zone === 'Provincia - Con Metas' ? (
                          <span>Se aplicará tope máximo de venta de <strong>S/ {provMetasVacationCap.toLocaleString('es-PE')}</strong> (Tasa: {provMetasVacationRate}%).</span>
                        ) : zone === 'Zona - Lima' ? (
                          <span>Tasa general de <strong>{limaVacationRate}%</strong> sin tope.</span>
                        ) : (
                          <span>Tasa general de <strong>{provFirstVacationRate}%</strong> sin tope.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Differentiated rate checkbox */}
                {calculationType !== 'Periodo Vacacional' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="diferenciadaCheck"
                      checked={isDiferenciada}
                      onChange={(e) => setIsDiferenciada(e.target.checked)}
                      className="w-4 h-4 text-[#4D4DFF] rounded focus:ring-[#4D4DFF]"
                    />
                    <label htmlFor="diferenciadaCheck" className="text-xs font-semibold text-purple-700 cursor-pointer">
                      Aplicar Tarifa Diferenciada (Ventas con descuento o precio preferencial)
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sales Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Monto de Ventas (S/)</label>
                      {seller && quotes && quotes.some(q => q.advisor === seller) && (
                        <button
                          type="button"
                          onClick={() => {
                            const sellerQuotes = quotes.filter(q => q.advisor === seller && (q.status === 'Aceptada' || (q.status as string) === 'billed' || (q.status as string) === 'Aprobada'));
                            const total = sellerQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
                            if (total > 0) setSalesTotalInput(total);
                          }}
                          className="text-[10px] text-[#4D4DFF] font-bold hover:underline cursor-pointer flex items-center gap-1"
                          title="Auto-calcular de cotizaciones registradas del asesor"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Auto-calcular de ventas</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Ej. 15000.00"
                      value={salesTotalInput}
                      onChange={(e) => setSalesTotalInput(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none"
                    />
                  </div>

                  {/* Period */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Periodo a Liquidar</label>
                    <input
                      type="text"
                      required
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="Ej. Septiembre 2026"
                      className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* LIVE CALCULATION PREVIEW BOX */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Vista Previa del Cálculo
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">Tasa: {currentCalculation.rate.toFixed(2)}%</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-[11px] text-slate-400">Comisión Estimada a Pagar:</div>
                      {currentCalculation.isCapped && (
                        <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                          *Tope de venta aplicado: S/ {provMetasVacationCap.toLocaleString('es-PE')}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      S/ {currentCalculation.commissionAmt.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Observaciones / Notas</label>
                  <input
                    type="text"
                    placeholder="Ej. Cobranza realizada dentro del plazo pactado"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-4 py-2 text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-[#4D4DFF] hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-[#4D4DFF]/30 cursor-pointer text-sm"
                >
                  Generar Liquidación Oficial
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT MATRIX PARAMETERS */}
      <AnimatePresence>
        {isEditMatrixModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-2xl rounded-3xl w-full max-w-4xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto text-left space-y-6"
            >
              <button
                onClick={() => setIsEditMatrixModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                    <Edit3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-[#3D3528]">
                      Editar Parámetros y Porcentajes de Comisiones
                    </h3>
                    <p className="text-xs text-slate-500">Modifica libremente las tasas para cada zona, condición o categoría.</p>
                  </div>
                </div>

                <button
                  onClick={handleResetMatrixDefaults}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  title="Restablecer valores originales de fábrica"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer Valores</span>
                </button>
              </div>

              {/* SECTIONS BY ZONE */}
              <div className="space-y-6">
                {/* ZONA LIMA */}
                <div className="space-y-3 bg-[#F7F8FC] p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-extrabold text-sm text-[#4D4DFF]">1. ZONA LIMA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {limaConditions.map((condRow, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-slate-800">{condRow.condition}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block">% General</label>
                            <input
                              type="number"
                              step="0.1"
                              value={condRow.general}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLimaConditions(prev => prev.map((item, i) => i === idx ? { ...item, general: val } : item));
                              }}
                              className="w-full border rounded px-2 py-1 font-mono font-bold text-[#4D4DFF]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block">% Diferenciada</label>
                            <input
                              type="number"
                              step="0.1"
                              value={condRow.diferenciada}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLimaConditions(prev => prev.map((item, i) => i === idx ? { ...item, diferenciada: val } : item));
                              }}
                              className="w-full border rounded px-2 py-1 font-mono font-bold text-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-xs font-bold">
                    <label>Tasa Vacacional Lima (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={limaVacationRate}
                      onChange={(e) => setLimaVacationRate(Number(e.target.value))}
                      className="w-24 border rounded px-2 py-1 font-mono font-bold text-blue-600"
                    />
                  </div>
                </div>

                {/* PROVINCIA CON METAS */}
                <div className="space-y-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="font-extrabold text-sm text-emerald-700">2. PROVINCIA (CON METAS)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {provMetasConditions.map((condRow, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-slate-800">{condRow.condition}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block">% General</label>
                            <input
                              type="number"
                              step="0.1"
                              value={condRow.general}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setProvMetasConditions(prev => prev.map((item, i) => i === idx ? { ...item, general: val } : item));
                              }}
                              className="w-full border rounded px-2 py-1 font-mono font-bold text-[#4D4DFF]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block">% Diferenciada</label>
                            <input
                              type="number"
                              step="0.1"
                              value={condRow.diferenciada}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setProvMetasConditions(prev => prev.map((item, i) => i === idx ? { ...item, diferenciada: val } : item));
                              }}
                              className="w-full border rounded px-2 py-1 font-mono font-bold text-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <label>Tasa Vacacional Prov. Metas (%):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={provMetasVacationRate}
                        onChange={(e) => setProvMetasVacationRate(Number(e.target.value))}
                        className="w-20 border rounded px-2 py-1 font-mono font-bold text-emerald-600"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label>Tope Máximo de Venta (S/):</label>
                      <input
                        type="number"
                        step="1000"
                        value={provMetasVacationCap}
                        onChange={(e) => setProvMetasVacationCap(Number(e.target.value))}
                        className="w-32 border rounded px-2 py-1 font-mono font-bold text-amber-700"
                      />
                    </div>
                  </div>
                </div>

                {/* PROVINCIA DESDE 1ERA VENTA */}
                <div className="space-y-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-200">
                  <h4 className="font-extrabold text-sm text-purple-700">3. PROVINCIA (DESDE 1ERA VENTA)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {provFirstConditions.map((condRow, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-slate-800">{condRow.condition}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block">% General</label>
                            <input
                              type="number"
                              step="0.05"
                              value={condRow.general}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setProvFirstConditions(prev => prev.map((item, i) => i === idx ? { ...item, general: val } : item));
                              }}
                              className="w-full border rounded px-2 py-1 font-mono font-bold text-[#4D4DFF]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block">% Diferenciada</label>
                            <input
                              type="number"
                              step="0.05"
                              value={condRow.diferenciada}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setProvFirstConditions(prev => prev.map((item, i) => i === idx ? { ...item, diferenciada: val } : item));
                              }}
                              className="w-full border rounded px-2 py-1 font-mono font-bold text-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-xs font-bold">
                    <label>Tasa Vacacional 1era Venta (%):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={provFirstVacationRate}
                      onChange={(e) => setProvFirstVacationRate(Number(e.target.value))}
                      className="w-24 border rounded px-2 py-1 font-mono font-bold text-purple-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsEditMatrixModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMatrixChanges}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Nuevos Parámetros</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
