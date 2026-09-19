import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Percent, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Calculator, 
  Truck, 
  ShieldCheck, 
  DollarSign, 
  Info, 
  Sparkles, 
  Package, 
  X,
  Layers,
  ShoppingBag,
  Building2,
  Tag
} from 'lucide-react';
import { DiscountRule, Product } from '../types';

interface DiscountManagerProps {
  rules: DiscountRule[];
  products: Product[];
  onAddRule: (rule: DiscountRule) => void;
  onUpdateRule?: (id: string, updates: Partial<DiscountRule>) => void;
  onDeleteRule?: (id: string) => void;
}

export function DiscountManager({ rules, products = [], onAddRule, onUpdateRule, onDeleteRule }: DiscountManagerProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'policies' | 'simulator'>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);

  // Form Fields for Modal
  const [ruleType, setRuleType] = useState<'PRODUCT' | 'CATEGORY' | 'GLOBAL'>('PRODUCT');
  const [selectedSku, setSelectedSku] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('General');
  const [role, setRole] = useState('Todos');
  const [minAmount, setMinAmount] = useState<number | ''>('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [minQty, setMinQty] = useState<number | ''>('');
  const [discountCash, setDiscountCash] = useState<number | ''>('');
  const [discountCredit, setDiscountCredit] = useState<number | ''>('');
  const [priceOfferCash, setPriceOfferCash] = useState<number | ''>('');
  const [priceOfferCredit, setPriceOfferCredit] = useState<number | ''>('');
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');

  // Simulator State
  const [simProductSku, setSimProductSku] = useState('');
  const [simAmount, setSimAmount] = useState<number>(5000);
  const [simQty, setSimQty] = useState<number>(20);
  const [simPaymentMethod, setSimPaymentMethod] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [simRegion, setSimRegion] = useState<'LIMA' | 'PROVINCIA'>('PROVINCIA');

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchesSearch = searchQuery === '' || 
        (r.sku && r.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.productName && r.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.role && r.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [rules, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(rules.map(r => r.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [rules]);

  // Open modal for edit or create
  const handleOpenModal = (ruleToEdit?: DiscountRule) => {
    if (ruleToEdit) {
      setEditingRule(ruleToEdit);
      setSelectedSku(ruleToEdit.sku || '');
      setProductName(ruleToEdit.productName || '');
      setCategory(ruleToEdit.category || 'General');
      setRole(ruleToEdit.role || 'Todos');
      setMinAmount(ruleToEdit.minAmount ?? '');
      setMaxAmount(ruleToEdit.maxAmount ?? '');
      setMinQty(ruleToEdit.minQty ?? '');
      setDiscountCash(ruleToEdit.discountCash ?? '');
      setDiscountCredit(ruleToEdit.discountCredit ?? '');
      setPriceOfferCash(ruleToEdit.priceOfferCash ?? '');
      setPriceOfferCredit(ruleToEdit.priceOfferCredit ?? '');
      setMaxDiscount(ruleToEdit.maxDiscount ?? '');
      setNotes(ruleToEdit.notes || '');
      setStatus(ruleToEdit.status || 'Activo');
      setRuleType(ruleToEdit.sku ? 'PRODUCT' : 'CATEGORY');
    } else {
      setEditingRule(null);
      setSelectedSku('');
      setProductName('');
      setCategory('General');
      setRole('Todos');
      setMinAmount('');
      setMaxAmount('');
      setMinQty('');
      setDiscountCash('');
      setDiscountCredit('');
      setPriceOfferCash('');
      setPriceOfferCredit('');
      setMaxDiscount('');
      setNotes('');
      setStatus('Activo');
      setRuleType('PRODUCT');
    }
    setIsModalOpen(true);
  };

  const handleProductSelect = (sku: string) => {
    setSelectedSku(sku);
    const prod = products.find(p => p.sku === sku);
    if (prod) {
      setProductName(prod.name);
      setCategory(prod.category || 'General');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: DiscountRule = {
      id: editingRule ? editingRule.id : `DR-${Date.now()}`,
      sku: ruleType === 'PRODUCT' ? selectedSku : undefined,
      productName: ruleType === 'PRODUCT' ? productName : undefined,
      role: role || 'Todos',
      category: category || 'General',
      minAmount: minAmount !== '' ? Number(minAmount) : undefined,
      maxAmount: maxAmount !== '' ? Number(maxAmount) : undefined,
      minQty: minQty !== '' ? Number(minQty) : undefined,
      discountCash: discountCash !== '' ? Number(discountCash) : undefined,
      discountCredit: discountCredit !== '' ? Number(discountCredit) : undefined,
      priceOfferCash: priceOfferCash !== '' ? Number(priceOfferCash) : undefined,
      priceOfferCredit: priceOfferCredit !== '' ? Number(priceOfferCredit) : undefined,
      maxDiscount: maxDiscount !== '' ? Number(maxDiscount) : (discountCash !== '' ? Number(discountCash) : 0),
      notes: notes || undefined,
      status: status
    };

    if (editingRule && onUpdateRule) {
      onUpdateRule(editingRule.id, newRule);
    } else {
      onAddRule(newRule);
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (rule: DiscountRule) => {
    const nextStatus = rule.status === 'Activo' ? 'Inactivo' : 'Activo';
    if (onUpdateRule) {
      onUpdateRule(rule.id, { status: nextStatus });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta regla de descuento?') && onDeleteRule) {
      onDeleteRule(id);
    }
  };

  // Simulator Calculation Logic
  const simulatedResult = useMemo(() => {
    const selectedProd = products.find(p => p.sku === simProductSku);
    const basePrice = selectedProd ? selectedProd.basePrice : 100;
    const subtotal = (selectedProd ? basePrice * simQty : simAmount);

    // 1. Escala por monto de venta
    let amountDiscCash = 0;
    let amountDiscCredit = 0;
    if (simAmount >= 15000) {
      amountDiscCash = 20;
      amountDiscCredit = 18;
    } else if (simAmount >= 6000) {
      amountDiscCash = 18;
      amountDiscCredit = 15;
    } else if (simAmount >= 3000) {
      amountDiscCash = 15;
      amountDiscCredit = 10;
    } else if (simAmount >= 1500) {
      amountDiscCash = 10;
      amountDiscCredit = 5;
    }

    // Check specific rule for product
    let productRuleDisc = 0;
    let specialOfferPrice: number | null = null;
    if (selectedProd) {
      const matchRule = rules.find(r => r.sku === selectedProd.sku && r.status === 'Activo');
      if (matchRule) {
        if (simPaymentMethod === 'CONTADO') {
          if (matchRule.priceOfferCash) specialOfferPrice = matchRule.priceOfferCash;
          else if (matchRule.discountCash) productRuleDisc = matchRule.discountCash;
        } else {
          if (matchRule.priceOfferCredit) specialOfferPrice = matchRule.priceOfferCredit;
          else if (matchRule.discountCredit) productRuleDisc = matchRule.discountCredit;
        }
      }
    }

    // Determine applied discount %
    const baseDiscount = simPaymentMethod === 'CONTADO' ? amountDiscCash : amountDiscCredit;
    const finalDiscountPct = Math.max(baseDiscount, productRuleDisc);

    // Calculate Net Total
    let netTotal = 0;
    if (specialOfferPrice !== null && selectedProd) {
      netTotal = specialOfferPrice * simQty;
    } else {
      netTotal = subtotal * (1 - finalDiscountPct / 100);
    }

    // Freight subsidy logic
    let freightSubsidyPct = 0;
    if (simRegion === 'PROVINCIA') {
      if (simAmount >= 15000) freightSubsidyPct = 3.5;
      else if (simAmount >= 6000) freightSubsidyPct = 2.5;
      else if (simAmount >= 3000) freightSubsidyPct = 2.0;
    }

    return {
      subtotal,
      finalDiscountPct,
      specialOfferPrice,
      netTotal,
      savings: subtotal - netTotal,
      freightSubsidyPct,
      freightSubsidyAmount: (netTotal * freightSubsidyPct) / 100
    };
  }, [simProductSku, simAmount, simQty, simPaymentMethod, simRegion, products, rules]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#2B261D] dark:via-[#3D3528] dark:to-[#2B261D] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4D4DFF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-[#4D4DFF] rounded-2xl shadow-lg shadow-[#4D4DFF]/30">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight font-display">Política y Módulo de Descuentos</h1>
              <p className="text-xs md:text-sm text-slate-300 font-medium">
                Matriz oficial de descuentos por escala de compra, fletes y promociones por producto CHOHO
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#4D4DFF] hover:bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-[#4D4DFF]/30 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Regla / Oferta SKU</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-[#E5DEC9]/40 rounded-2xl border border-slate-200 dark:border-[#E5DEC9]">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-white dark:bg-[#3D3528] text-[#4D4DFF] dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-700 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Reglas y Ofertas Personalizadas ({rules.length})</span>
        </button>
        
        <button
          onClick={() => setActiveTab('policies')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-white dark:bg-[#3D3528] text-[#4D4DFF] dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-700 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Políticas Oficiales Empresa</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-white dark:bg-[#3D3528] text-[#4D4DFF] dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-700 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Simulador de Descuentos</span>
        </button>
      </div>

      {/* TAB 1: REGLAS Y OFERTAS DE PRODUCTOS */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#FFFFFF] p-4 rounded-2xl border border-slate-200 dark:border-[#E5DEC9] shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por SKU, producto o rol..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-100 border border-slate-200 dark:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-100 border border-slate-200 dark:border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-medium"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'Todas las Categorías' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white dark:bg-[#FFFFFF] border border-slate-200 dark:border-[#E5DEC9] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#F7F8FC] border-b border-slate-200 dark:border-[#E5DEC9] text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-4">SKU / Producto</th>
                    <th className="py-4 px-4">Categoría / Rol</th>
                    <th className="py-4 px-4 text-center">Descuento Contado</th>
                    <th className="py-4 px-4 text-center">Descuento Crédito</th>
                    <th className="py-4 px-4 text-center">Precio Oferta S/</th>
                    <th className="py-4 px-4 text-center">Min. Cantidad / Monto</th>
                    <th className="py-4 px-4 text-center">Estado</th>
                    <th className="py-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-200 text-sm">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        No se encontraron reglas de descuento con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          {rule.sku ? (
                            <div>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-800 bg-slate-100 dark:bg-slate-200 px-2 py-0.5 rounded text-xs">
                                {rule.sku}
                              </span>
                              <div className="font-semibold text-slate-800 dark:text-slate-900 text-xs mt-1">
                                {rule.productName || 'Producto CHOHO'}
                              </div>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-700 italic">Descuento General / Global</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-800">{rule.category || 'General'}</div>
                          <div className="text-xs text-slate-500">Rol: {rule.role || 'Todos'}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {rule.discountCash !== undefined ? (
                            <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 font-mono font-bold rounded-lg text-xs">
                              {rule.discountCash}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {rule.discountCredit !== undefined ? (
                            <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold rounded-lg text-xs">
                              {rule.discountCredit}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {rule.priceOfferCash || rule.priceOfferCredit ? (
                            <div className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg text-xs inline-block">
                              {rule.priceOfferCash ? `S/ ${rule.priceOfferCash.toFixed(2)} (Cont.)` : ''}
                              {rule.priceOfferCredit ? ` S/ ${rule.priceOfferCredit.toFixed(2)} (Créd.)` : ''}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-xs">
                          {rule.minQty && <div>Min Qty: <strong className="font-mono">{rule.minQty} u.</strong></div>}
                          {rule.minAmount && <div>Min M: <strong className="font-mono">S/ {rule.minAmount}</strong></div>}
                          {!rule.minQty && !rule.minAmount && <span className="text-slate-400">Sin mínimo</span>}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(rule)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                              rule.status === 'Activo'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {rule.status === 'Activo' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {rule.status}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(rule)}
                              className="p-1.5 text-slate-500 hover:text-[#4D4DFF] hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="Editar Regla"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title="Eliminar Regla"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* TAB 2: POLÍTICAS OFICIALES DE LA EMPRESA */}
      {activeTab === 'policies' && (
        <div className="space-y-8">
          {/* Section 1: Escalas por Monto de Venta & Fletes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monto de Ventas */}
            <div className="bg-white dark:bg-[#FFFFFF] border border-slate-200 dark:border-[#E5DEC9] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-800">1. Tabla de Descuentos por Monto</h3>
                  <p className="text-xs text-slate-500">Aplica sobre catálogo general y pedidos corporativos</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                      <th className="py-2.5 px-3">Rango Monto Pedido</th>
                      <th className="py-2.5 px-3 text-center">% Contado</th>
                      <th className="py-2.5 px-3 text-center">% Crédito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 1,500 a S/ 2,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">10%</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">5%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 3,000 a S/ 5,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">15%</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">10%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 6,000 a S/ 14,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">18%</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">15%</td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">A partir de S/ 15,000.00</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">20%</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-blue-700">18%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subsidio de Fletes */}
            <div className="bg-white dark:bg-[#FFFFFF] border border-slate-200 dark:border-[#E5DEC9] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/40 rounded-2xl text-blue-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-800">2. Política Subsidio de Flete</h3>
                  <p className="text-xs text-slate-500">Exclusivo para despachos a Provincia</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                      <th className="py-2.5 px-3">Monto de Factura Neto</th>
                      <th className="py-2.5 px-3 text-center">Subsidio % Flete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 3,000 a S/ 5,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">2.0% de factura</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 6,000 a S/ 14,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">2.5% de factura</td>
                    </tr>
                    <tr className="bg-blue-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">A partir de S/ 15,000.00</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-blue-700">3.5% de factura</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Tablas Especiales de Oferta por Producto (Imágenes proporcionadas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pastillas y Zapatas de Freno */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <ShoppingBag className="w-4 h-4" /> Pastillas y Zapatas de Freno
              </div>
              <div className="text-xs text-slate-500">Escala de precios promocionales por cantidad</div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2">Lote (unidades)</th>
                    <th className="p-2 text-center">Pastilla S/</th>
                    <th className="p-2 text-center">Zapata S/</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-medium">10 Unidades</td>
                    <td className="p-2 text-center font-mono">S/ 4.50</td>
                    <td className="p-2 text-center font-mono">S/ 9.80</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">30 Unidades</td>
                    <td className="p-2 text-center font-mono">S/ 4.20</td>
                    <td className="p-2 text-center font-mono">S/ 9.20</td>
                  </tr>
                  <tr className="bg-indigo-50 font-bold">
                    <td className="p-2">50 Unidades</td>
                    <td className="p-2 text-center font-mono text-indigo-700">S/ 3.90</td>
                    <td className="p-2 text-center font-mono text-indigo-700">S/ 8.60</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vedamotors & Spartan AC-0008 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Vedamotors / Servitec / Spartan
              </div>
              <div className="text-xs text-slate-500">Promoción al contado y al crédito diferido</div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-purple-50 rounded-xl flex justify-between items-center">
                  <div>
                    <strong className="block text-slate-800">Vedamotors / Servitec</strong>
                    <span className="text-slate-500">Descuento Directo</span>
                  </div>
                  <span className="font-bold text-purple-700 font-mono text-sm">20% OFF</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <strong className="block text-slate-800">Alforja Spartan (AC-0008)</strong>
                  <div className="flex justify-between font-mono">
                    <span>Precio Contado:</span>
                    <span className="font-bold text-emerald-600">S/ 303.80</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Precio Crédito:</span>
                    <span className="font-bold text-blue-600">S/ 345.50</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Piñones, Seguros y Palancas */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Layers className="w-4 h-4" /> Piñones, Seguros y Palancas
              </div>
              <div className="text-xs text-slate-500">Precios especiales por volumen de lote</div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2">Ítem</th>
                    <th className="p-2 text-center">Unidades</th>
                    <th className="p-2 text-center">Precio c/u</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-medium">Piñón de Arrastre</td>
                    <td className="p-2 text-center">20 u.</td>
                    <td className="p-2 text-center font-mono font-bold text-amber-700">S/ 4.80</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Seguro de Piñón</td>
                    <td className="p-2 text-center">100 u.</td>
                    <td className="p-2 text-center font-mono font-bold text-amber-700">S/ 0.45</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Palancas de Freno</td>
                    <td className="p-2 text-center">30 u.</td>
                    <td className="p-2 text-center font-mono font-bold text-amber-700">S/ 6.50</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Catalinas Spartan / Choho / Gold */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" /> Catalinas de Tracción (Spartan, CHOHO, Gold Chain)
              </div>
              <div className="text-xs text-slate-500">Escala progresiva de precios para distribuidores</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl">
                  <span className="font-bold text-red-700 block mb-1">Lote Base (10 a 29 Unidades)</span>
                  <p className="text-slate-600">Descuento base de política + 5% extra al contado.</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <span className="font-bold text-red-800 block mb-1">Lote Intermedio (30 a 99 Unidades)</span>
                  <p className="text-slate-600">Precio distribuidor directo con hasta 15% al contado.</p>
                </div>
                <div className="p-3 bg-red-600 text-white rounded-2xl">
                  <span className="font-bold block mb-1">Lote Mayorista (100+ Unidades)</span>
                  <p className="text-red-100">Máximo descuento de fábrica de 20% al contado + envío gratis a Provincia.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIMULADOR DE DESCUENTOS Y COTIZACIÓN */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Controls */}
          <div className="lg:col-span-1 bg-white dark:bg-[#FFFFFF] border border-slate-200 dark:border-[#E5DEC9] p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Calculator className="w-5 h-5 text-[#4D4DFF]" />
              <h3 className="font-bold text-slate-900 text-base">Parámetros de la Venta</h3>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Producto (Opcional)</label>
              <select
                value={simProductSku}
                onChange={e => setSimProductSku(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
              >
                <option value="">Ninguno (Cálculo por Monto General)</option>
                {products.map(p => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.name} (S/ {p.basePrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Monto Total Pedido (S/)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={simAmount}
                onChange={e => setSimAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cantidad de Unidades</label>
              <input
                type="number"
                min="1"
                value={simQty}
                onChange={e => setSimQty(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Condición de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimPaymentMethod('CONTADO')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simPaymentMethod === 'CONTADO'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💵 Al Contado
                </button>
                <button
                  type="button"
                  onClick={() => setSimPaymentMethod('CREDITO')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simPaymentMethod === 'CREDITO'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💳 Crédito Diferido
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Destino de Envío</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimRegion('LIMA')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simRegion === 'LIMA'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🏙️ Lima Metropol.
                </button>
                <button
                  type="button"
                  onClick={() => setSimRegion('PROVINCIA')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simRegion === 'PROVINCIA'
                      ? 'bg-[#4D4DFF] text-white border-[#4D4DFF] shadow-md shadow-[#4D4DFF]/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🚛 Provincias
                </button>
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Resultado del Simulador</span>
                  <h2 className="text-xl font-extrabold">Resumen de Liquidación Comercial</h2>
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-mono font-bold border border-emerald-500/30">
                  {simPaymentMethod}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block">Subtotal Base</span>
                  <span className="text-lg font-mono font-bold text-white">S/ {simulatedResult.subtotal.toFixed(2)}</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block">% Descuento</span>
                  <span className="text-lg font-mono font-extrabold text-emerald-400">{simulatedResult.finalDiscountPct}%</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block">Ahorro Cliente</span>
                  <span className="text-lg font-mono font-bold text-emerald-300">S/ {simulatedResult.savings.toFixed(2)}</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block">Subsidio Flete</span>
                  <span className="text-lg font-mono font-bold text-blue-400">
                    {simulatedResult.freightSubsidyPct > 0 ? `${simulatedResult.freightSubsidyPct}%` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-emerald-300 uppercase font-bold tracking-wider">Monto Total Neto a Facturar</span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-1">
                    S/ {simulatedResult.netTotal.toFixed(2)}
                  </div>
                  {simulatedResult.specialOfferPrice && (
                    <span className="text-xs text-purple-300 block mt-1 font-mono">
                      ✨ Precio de oferta especial aplicado: S/ {simulatedResult.specialOfferPrice.toFixed(2)} / unidad
                    </span>
                  )}
                </div>

                {simulatedResult.freightSubsidyAmount > 0 && (
                  <div className="text-right bg-blue-900/30 p-3 rounded-xl border border-blue-500/30">
                    <span className="text-[11px] text-blue-300 font-medium block">Aporte Empresa Flete</span>
                    <span className="text-sm font-mono font-bold text-blue-200">
                      S/ {simulatedResult.freightSubsidyAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-500" /> Los cálculos incluyen IGV y reglas vigentes del catálogo CHOHO Peru.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR O EDITAR REGLA DE DESCUENTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#FFFFFF] border border-slate-200 dark:border-slate-100 shadow-2xl rounded-3xl w-full max-w-lg p-6 relative my-8"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-xl text-slate-900 mb-1 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#4D4DFF]" />
                {editingRule ? 'Editar Regla de Descuento' : 'Nueva Regla o Promoción de Descuento'}
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Configure un descuento por producto, catálogo o rol comercial.
              </p>

              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
                {/* Tipo de Regla */}
                <div>
                  <label className="font-bold text-slate-600 uppercase block mb-1">Tipo de Aplique</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRuleType('PRODUCT')}
                      className={`py-2 px-3 rounded-xl font-bold cursor-pointer transition-colors ${
                        ruleType === 'PRODUCT' ? 'bg-[#4D4DFF] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Producto Específico (SKU)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('CATEGORY')}
                      className={`py-2 px-3 rounded-xl font-bold cursor-pointer transition-colors ${
                        ruleType === 'CATEGORY' ? 'bg-[#4D4DFF] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Categoría / Rol General
                    </button>
                  </div>
                </div>

                {/* SKU Selector if Product */}
                {ruleType === 'PRODUCT' && (
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">Seleccionar Producto del Catálogo</label>
                    <select
                      value={selectedSku}
                      onChange={e => handleProductSelect(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    >
                      <option value="">Seleccione SKU...</option>
                      {products.map(p => (
                        <option key={p.sku} value={p.sku}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Categoría y Rol */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">Categoría</label>
                    <input
                      type="text"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="Ej. Transmisión, Frena"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">Rol Autorizado</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    >
                      <option value="Todos">Todos (Global)</option>
                      <option value="Vendedor Junior">Vendedor Junior</option>
                      <option value="Vendedor Senior">Vendedor Senior</option>
                      <option value="Gerencia">Gerencia</option>
                    </select>
                  </div>
                </div>

                {/* Porcentajes de Descuento */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">% Descuento Contado</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountCash}
                      onChange={e => setDiscountCash(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 15"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">% Descuento Crédito</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountCredit}
                      onChange={e => setDiscountCredit(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 10"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    />
                  </div>
                </div>

                {/* Precios Fijos de Oferta */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-purple-700 uppercase block mb-1">Precio Oferta Contado S/</label>
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={priceOfferCash}
                      onChange={e => setPriceOfferCash(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 303.80"
                      className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-purple-700 uppercase block mb-1">Precio Oferta Crédito S/</label>
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={priceOfferCredit}
                      onChange={e => setPriceOfferCredit(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 345.50"
                      className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                {/* Mínimos */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">Mín. Cantidad (Unidades)</label>
                    <input
                      type="number"
                      min="1"
                      value={minQty}
                      onChange={e => setMinQty(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 10"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 uppercase block mb-1">Mín. Monto Venta S/</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 3000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                    />
                  </div>
                </div>

                {/* Notas / Observaciones */}
                <div>
                  <label className="font-bold text-slate-600 uppercase block mb-1">Notas / Políticas de Campaña</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. Válido hasta fin de mes o agotar stock"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="font-bold text-slate-600 uppercase block mb-1">Estado de la Regla</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Activo' | 'Inactivo')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4D4DFF]"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full bg-[#4D4DFF] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-[#4D4DFF]/30 cursor-pointer text-sm"
                  >
                    {editingRule ? 'Actualizar Regla' : 'Guardar Regla de Descuento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
