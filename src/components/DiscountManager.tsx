import React, { useState, useMemo, useEffect } from 'react';
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
      setCategory('General');
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
    if (confirm('¿Está seguro de eliminar esta regla descuento?') && onDeleteRule) {
      onDeleteRule(id);
    }
  };

  // Simulator Calculation Logic
  // El simulador consulta al servidor: la politica de descuentos vive en la base
  // de datos y no puede duplicarse aqui, o volverian a divergir.
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    let vigente = true;
    setSimLoading(true);

    // Sin producto elegido, se simula un monto de linea generico.
    const payload = simProductSku
      ? { sku: simProductSku, qty: simQty, metodoPago: simPaymentMethod, region: simRegion }
      : { basePrice: simAmount, qty: 1, metodoPago: simPaymentMethod, region: simRegion };

    fetch("/api/discounts/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!data || data.error) throw new Error(data?.error || "No se pudo calcular");
        if (vigente) setSimResult(data);
      })
      .catch(() => {
        if (vigente) setSimResult(null);
      })
      .finally(() => {
        if (vigente) setSimLoading(false);
      });

    return () => { vigente = false; };
  }, [simProductSku, simAmount, simQty, simPaymentMethod, simRegion]);

  const simulatedResult = useMemo(() => {
    if (!simResult) {
      return {
        subtotal: simAmount,
        finalDiscountPct: 0,
        specialOfferPrice: null,
        netTotal: simAmount,
        savings: 0,
        freightSubsidyPct: 0,
        freightSubsidyAmount: 0
      };
    }

    const subsidyPct = simResult.reglaSubsidio
      ? Number(simResult.reglaSubsidio.discountCash || 0)
      : 0;
    const specialOffer = simResult.reglaAplicada?.discountType === 'PRECIO_ESPECIAL'
      ? Number(
          simPaymentMethod === 'CONTADO'
            ? simResult.reglaAplicada.priceOfferCash
            : simResult.reglaAplicada.priceOfferCredit
        )
      : null;

    return {
      subtotal: simResult.precioBase * simResult.qty,
      finalDiscountPct: simResult.descuentoPorcentaje,
      specialOfferPrice: specialOffer,
      netTotal: simResult.totalLinea,
      savings: simResult.descuentoTotal,
      freightSubsidyPct: subsidyPct,
      freightSubsidyAmount: (simResult.totalLinea * subsidyPct) / 100
    };
  }, [simResult, simAmount, simPaymentMethod]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface-2 via-surface-2 to-surface-2 p-6 rounded-3xl text-ink shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand rounded-2xl shadow-lg shadow-brand/30">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight font-display">Política y Módulo de Descuentos</h1>
              <p className="text-xs md:text-sm text-ink-subtle font-medium">
                Matriz oficial de descuentos por escala de compra, fletes y promociones por producto CHOHO
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-brand-contrast px-5 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-brand/30 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Regla / Oferta SKU</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-2 rounded-2xl border border-line">
        <button type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-surface dark:bg-surface-2 text-brand-fg dark:text-white shadow-sm'
              : 'text-ink-muted dark:text-ink hover:text-ink'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Reglas y Ofertas Personalizadas ({rules.length})</span>
        </button>
        
        <button type="button"
          onClick={() => setActiveTab('policies')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-surface dark:bg-surface-2 text-brand-fg dark:text-white shadow-sm'
              : 'text-ink-muted dark:text-ink hover:text-ink'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Políticas Oficiales Empresa</span>
        </button>

        <button type="button"
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-surface dark:bg-surface-2 text-brand-fg dark:text-white shadow-sm'
              : 'text-ink-muted dark:text-ink hover:text-ink'
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-line shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por SKU, producto o rol..."
                className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-line dark:border-line-strong rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-ink-subtle" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-surface-2 border border-line dark:border-line-strong rounded-xl px-3 py-2 text-sm focus-visible:outline-none font-medium"
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
          <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-line text-xs font-bold text-ink-muted uppercase tracking-wider">
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
                <tbody className="divide-y divide-line text-sm">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-subtle">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        No se encontraron reglas de descuento con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-surface-2/80 transition-colors">
                        <td className="py-4 px-4">
                          {rule.sku ? (
                            <div>
                              <span className="font-mono font-bold text-ink bg-surface-2 dark:bg-line px-2 py-0.5 rounded text-xs">
                                {rule.sku}
                              </span>
                              <div className="font-semibold text-ink text-xs mt-1">
                                {rule.productName || 'Producto CHOHO'}
                              </div>
                            </div>
                          ) : (
                            <span className="font-bold text-ink italic">Descuento General / Global</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-ink">{rule.category || 'General'}</div>
                          <div className="text-xs text-ink-muted">Rol: {rule.role || 'Todos'}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {rule.discountCash !== undefined ? (
                            <span className="inline-block px-2.5 py-1 bg-success-soft text-success-fg font-mono font-bold rounded-lg text-xs">
                              {rule.discountCash}%
                            </span>
                          ) : (
                            <span className="text-ink-subtle">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {rule.discountCredit !== undefined ? (
                            <span className="inline-block px-2.5 py-1 bg-brand-soft text-brand-fg font-mono font-bold rounded-lg text-xs">
                              {rule.discountCredit}%
                            </span>
                          ) : (
                            <span className="text-ink-subtle">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {rule.priceOfferCash || rule.priceOfferCredit ? (
                            <div className="font-mono font-bold text-brand-fg bg-brand-soft px-2 py-1 rounded-lg text-xs inline-block">
                              {rule.priceOfferCash ? `S/${rule.priceOfferCash.toFixed(2)}(Cont.)` : ''}
                              {rule.priceOfferCredit ? `S/${rule.priceOfferCredit.toFixed(2)}(Créd.)` : ''}
                            </div>
                          ) : (
                            <span className="text-ink-subtle">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-xs">
                          {rule.minQty && <div>Min Qty: <strong className="font-mono">{rule.minQty} u.</strong></div>}
                          {rule.minAmount && <div>Min M: <strong className="font-mono">S/ {rule.minAmount}</strong></div>}
                          {!rule.minQty && !rule.minAmount && <span className="text-ink-subtle">Sin mínimo</span>}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button type="button"
                            onClick={() => handleToggleStatus(rule)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                              rule.status === 'Activo'
                                ? 'bg-success-soft text-success-fg hover:bg-success-soft'
                                : 'bg-line text-ink-muted hover:bg-line-strong'
                            }`}
                          >
                            {rule.status === 'Activo' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {rule.status}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button"
                              onClick={() => handleOpenModal(rule)}
                              className="p-1.5 text-ink-muted hover:text-brand-fg hover:bg-field-hover rounded-lg cursor-pointer transition-colors"
                              title="Editar Regla"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button type="button"
                              onClick={() => handleDelete(rule.id)}
                              className="p-1.5 text-ink-muted hover:text-danger-fg hover:bg-danger-soft rounded-lg cursor-pointer transition-colors"
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
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-success-soft rounded-2xl text-success-fg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-ink">1. Tabla de Descuentos por Monto</h3>
                  <p className="text-xs text-ink-muted">Aplica sobre catálogo general y pedidos corporativos</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-2 border-b border-line font-bold text-ink-muted uppercase">
                      <th className="py-2.5 px-3">Rango Monto Pedido</th>
                      <th className="py-2.5 px-3 text-center">% Contado</th>
                      <th className="py-2.5 px-3 text-center">% Crédito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 1,500 a S/ 2,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-success-fg">10%</td>
                      <td className="py-2.5 px-3 text-center font-bold text-brand-fg">5%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 3,000 a S/ 5,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-success-fg">15%</td>
                      <td className="py-2.5 px-3 text-center font-bold text-brand-fg">10%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 6,000 a S/ 14,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-success-fg">18%</td>
                      <td className="py-2.5 px-3 text-center font-bold text-brand-fg">15%</td>
                    </tr>
                    <tr className="bg-success-soft/50">
                      <td className="py-2.5 px-3 font-bold text-ink">A partir de S/ 15,000.00</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-success-fg">20%</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-brand-fg">18%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subsidio de Fletes */}
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-brand-soft dark:bg-brand/40 rounded-2xl text-brand-fg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-ink">2. Política Subsidio de Flete</h3>
                  <p className="text-xs text-ink-muted">Exclusivo para despachos a Provincia</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-2 border-b border-line font-bold text-ink-muted uppercase">
                      <th className="py-2.5 px-3">Monto de Factura Neto</th>
                      <th className="py-2.5 px-3 text-center">Subsidio % Flete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 3,000 a S/ 5,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-brand-fg">2.0% de factura</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">De S/ 6,000 a S/ 14,999.99</td>
                      <td className="py-2.5 px-3 text-center font-bold text-brand-fg">2.5% de factura</td>
                    </tr>
                    <tr className="bg-brand-soft/50">
                      <td className="py-2.5 px-3 font-bold text-ink">A partir de S/ 15,000.00</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-brand-fg">3.5% de factura</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Tablas Especiales de Oferta por Producto (Imágenes proporcionadas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pastillas y Zapatas de Freno */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-brand-fg font-bold text-sm">
                <ShoppingBag className="w-4 h-4" /> Pastillas y Zapatas de Freno
              </div>
              <div className="text-xs text-ink-muted">Escala de precios promocionales por cantidad</div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 text-ink">
                    <th className="p-2">Lote (unidades)</th>
                    <th className="p-2 text-center">Pastilla S/</th>
                    <th className="p-2 text-center">Zapata S/</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
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
                  <tr className="bg-brand-soft font-bold">
                    <td className="p-2">50 Unidades</td>
                    <td className="p-2 text-center font-mono text-brand-fg">S/ 3.90</td>
                    <td className="p-2 text-center font-mono text-brand-fg">S/ 8.60</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vedamotors & Spartan AC-0008 */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-brand-fg font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Vedamotors / Servitec / Spartan
              </div>
              <div className="text-xs text-ink-muted">Promoción al contado y al crédito diferido</div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-brand-soft rounded-xl flex justify-between items-center">
                  <div>
                    <strong className="block text-ink">Vedamotors / Servitec</strong>
                    <span className="text-ink-muted">Descuento Directo</span>
                  </div>
                  <span className="font-bold text-brand-fg font-mono text-sm">20% OFF</span>
                </div>
                <div className="p-2.5 bg-surface-2 rounded-xl space-y-1">
                  <strong className="block text-ink">Alforja Spartan (AC-0008)</strong>
                  <div className="flex justify-between font-mono">
                    <span>Precio Contado:</span>
                    <span className="font-bold text-success-fg">S/ 303.80</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Precio Crédito:</span>
                    <span className="font-bold text-brand-fg">S/ 345.50</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Piñones, Seguros y Palancas */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-warning-fg font-bold text-sm">
                <Layers className="w-4 h-4" /> Piñones, Seguros y Palancas
              </div>
              <div className="text-xs text-ink-muted">Precios especiales por volumen de lote</div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 text-ink">
                    <th className="p-2">Ítem</th>
                    <th className="p-2 text-center">Unidades</th>
                    <th className="p-2 text-center">Precio c/u</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="p-2 font-medium">Piñón de Arrastre</td>
                    <td className="p-2 text-center">20 u.</td>
                    <td className="p-2 text-center font-mono font-bold text-warning-fg">S/ 4.80</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Seguro de Piñón</td>
                    <td className="p-2 text-center">100 u.</td>
                    <td className="p-2 text-center font-mono font-bold text-warning-fg">S/ 0.45</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Palancas de Freno</td>
                    <td className="p-2 text-center">30 u.</td>
                    <td className="p-2 text-center font-mono font-bold text-warning-fg">S/ 6.50</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Catalinas Spartan / Choho / Gold */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-sm space-y-3 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 text-danger-fg font-bold text-sm">
                <ShieldCheck className="w-4 h-4" /> Catalinas de Tracción (Spartan, CHOHO, Gold Chain)
              </div>
              <div className="text-xs text-ink-muted">Escala progresiva de precios para distribuidores</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-danger-soft/50 border border-danger/30 rounded-2xl">
                  <span className="font-bold text-danger-fg block mb-1">Lote Base (10 a 29 Unidades)</span>
                  <p className="text-ink-muted">Descuento base de política + 5% extra al contado.</p>
                </div>
                <div className="p-3 bg-danger-soft border border-danger/30 rounded-2xl">
                  <span className="font-bold text-danger-fg block mb-1">Lote Intermedio (30 a 99 Unidades)</span>
                  <p className="text-ink-muted">Precio distribuidor directo con hasta 15% al contado.</p>
                </div>
                <div className="p-3 bg-danger text-white rounded-2xl">
                  <span className="font-bold block mb-1">Lote Mayorista (100+ Unidades)</span>
                  <p className="text-danger-fg">Máximo descuento de fábrica de 20% al contado + envío gratis a Provincia.</p>
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
          <div className="lg:col-span-1 bg-surface border border-line p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Calculator className="w-5 h-5 text-brand-fg" />
              <h3 className="font-bold text-ink text-base">Parámetros de la Venta</h3>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted uppercase block mb-1">Producto (Opcional)</label>
              <select
                value={simProductSku}
                onChange={e => setSimProductSku(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
              <label className="text-xs font-bold text-ink-muted uppercase block mb-1">Monto Total Pedido (S/)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={simAmount}
                onChange={e => setSimAmount(Number(e.target.value))}
                className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted uppercase block mb-1">Cantidad de Unidades</label>
              <input
                type="number"
                min="1"
                value={simQty}
                onChange={e => setSimQty(Number(e.target.value))}
                className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted uppercase block mb-1">Condición de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimPaymentMethod('CONTADO')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simPaymentMethod === 'CONTADO'
                      ? 'bg-success text-white border-success/60 shadow-md shadow-success/20'
                      : 'bg-surface-2 text-ink-muted border-line hover:bg-field-hover'
                  }`}
                >
                  💵 Al Contado
                </button>
                <button
                  type="button"
                  onClick={() => setSimPaymentMethod('CREDITO')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simPaymentMethod === 'CREDITO'
                      ? 'bg-brand text-brand-contrast border-brand/60 shadow-md shadow-brand/20'
                      : 'bg-surface-2 text-ink-muted border-line hover:bg-field-hover'
                  }`}
                >
                  💳 Crédito Diferido
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted uppercase block mb-1">Destino de Envío</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimRegion('LIMA')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simRegion === 'LIMA'
                      ? 'bg-ink text-ink-inverse border-line-strong shadow-md'
                      : 'bg-surface-2 text-ink-muted border-line hover:bg-field-hover'
                  }`}
                >
                  🏙️ Lima Metropol.
                </button>
                <button
                  type="button"
                  onClick={() => setSimRegion('PROVINCIA')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all ${
                    simRegion === 'PROVINCIA'
                      ? 'bg-brand text-brand-contrast border-brand shadow-md shadow-brand/20'
                      : 'bg-surface-2 text-ink-muted border-line hover:bg-field-hover'
                  }`}
                >
                  🚛 Provincias
                </button>
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-surface-2 via-surface-2 to-surface-2 p-8 rounded-3xl text-ink shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-96 h-96 bg-success/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-line-strong pb-4">
                <div>
                  <span className="text-xs font-bold text-success-fg uppercase tracking-wider block">Resultado del Simulador</span>
                  <h2 className="text-xl font-extrabold">Resumen de Liquidación Comercial</h2>
                </div>
                <div className="px-3 py-1 bg-success/20 text-success-fg rounded-full text-xs font-mono font-bold border border-success/border">
                  {simPaymentMethod}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-ink/80 p-4 rounded-2xl border border-line-strong/50">
                  <span className="text-xs text-ink-subtle block">Subtotal Base</span>
                  <span className="text-lg font-mono font-bold text-white">S/ {simulatedResult.subtotal.toFixed(2)}</span>
                </div>

                <div className="bg-ink/80 p-4 rounded-2xl border border-line-strong/50">
                  <span className="text-xs text-ink-subtle block">% Descuento</span>
                  <span className="text-lg font-mono font-extrabold text-success-fg">{simulatedResult.finalDiscountPct}%</span>
                </div>

                <div className="bg-ink/80 p-4 rounded-2xl border border-line-strong/50">
                  <span className="text-xs text-ink-subtle block">Ahorro Cliente</span>
                  <span className="text-lg font-mono font-bold text-success-fg">S/ {simulatedResult.savings.toFixed(2)}</span>
                </div>

                <div className="bg-ink/80 p-4 rounded-2xl border border-line-strong/50">
                  <span className="text-xs text-ink-subtle block">Subsidio Flete</span>
                  <span className="text-lg font-mono font-bold text-brand-fg">
                    {simulatedResult.freightSubsidyPct > 0 ? `${simulatedResult.freightSubsidyPct}%` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-success-soft border border-success/border p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-success-fg uppercase font-bold tracking-wider">Monto Total Neto a Facturar</span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-success-fg mt-1">
                    S/ {simulatedResult.netTotal.toFixed(2)}
                  </div>
                  {simulatedResult.specialOfferPrice && (
                    <span className="text-xs text-brand-fg block mt-1 font-mono">
                      ✨ Precio de oferta especial aplicado: S/ {simulatedResult.specialOfferPrice.toFixed(2)} / unidad
                    </span>
                  )}
                </div>

                {simulatedResult.freightSubsidyAmount > 0 && (
                  <div className="text-right bg-brand/30 p-3 rounded-xl border border-brand/border">
                    <span className="text-xs text-brand-fg font-medium block">Aporte Empresa Flete</span>
                    <span className="text-sm font-mono font-bold text-brand-fg">
                      S/ {simulatedResult.freightSubsidyAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line-strong flex items-center justify-between text-xs text-ink-subtle">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-ink-muted" /> Los cálculos incluyen IGV y reglas vigentes del catálogo CHOHO Peru.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR O EDITAR REGLA DE DESCUENTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line shadow-2xl rounded-3xl w-full max-w-lg p-6 relative my-8"
            >
              <button type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-ink-subtle hover:text-ink cursor-pointer p-1 rounded-lg hover:bg-field-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-xl text-ink mb-1 flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-fg" />
                {editingRule ? 'Editar Regla de Descuento' : 'Nueva Regla o Promoción de Descuento'}
              </h3>
              <p className="text-xs text-ink-muted mb-5">
                Configure un descuento por producto, catálogo o rol comercial.
              </p>

              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
                {/* Tipo de Regla */}
                <div>
                  <label className="font-bold text-ink-muted uppercase block mb-1">Tipo de Aplique</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRuleType('PRODUCT')}
                      className={`py-2 px-3 rounded-xl font-bold cursor-pointer transition-colors ${
                        ruleType === 'PRODUCT' ? 'bg-brand text-brand-contrast' : 'bg-surface-2 text-ink-muted'
                      }`}
                    >
                      Producto Específico (SKU)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleType('CATEGORY')}
                      className={`py-2 px-3 rounded-xl font-bold cursor-pointer transition-colors ${
                        ruleType === 'CATEGORY' ? 'bg-brand text-brand-contrast' : 'bg-surface-2 text-ink-muted'
                      }`}
                    >
                      Categoría / Rol General
                    </button>
                  </div>
                </div>

                {/* SKU Selector if Product */}
                {ruleType === 'PRODUCT' && (
                  <div>
                    <label className="font-bold text-ink-muted uppercase block mb-1">Seleccionar Producto del Catálogo</label>
                    <select
                      value={selectedSku}
                      onChange={e => handleProductSelect(e.target.value)}
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                    <label className="font-bold text-ink-muted uppercase block mb-1">Categoría</label>
                    <input
                      type="text"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="Ej. Transmisión, Frena"
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-ink-muted uppercase block mb-1">Rol Autorizado</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                    <label className="font-bold text-ink-muted uppercase block mb-1">% Descuento Contado</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountCash}
                      onChange={e => setDiscountCash(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 15"
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-ink-muted uppercase block mb-1">% Descuento Crédito</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountCredit}
                      onChange={e => setDiscountCredit(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 10"
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                </div>

                {/* Precios Fijos de Oferta */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-brand-fg uppercase block mb-1">Precio Oferta Contado S/</label>
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={priceOfferCash}
                      onChange={e => setPriceOfferCash(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 303.80"
                      className="w-full bg-brand-soft border border-brand/30 rounded-xl px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-brand-fg uppercase block mb-1">Precio Oferta Crédito S/</label>
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={priceOfferCredit}
                      onChange={e => setPriceOfferCredit(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 345.50"
                      className="w-full bg-brand-soft border border-brand/30 rounded-xl px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    />
                  </div>
                </div>

                {/* Mínimos */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-ink-muted uppercase block mb-1">Mín. Cantidad (Unidades)</label>
                    <input
                      type="number"
                      min="1"
                      value={minQty}
                      onChange={e => setMinQty(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 10"
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-ink-muted uppercase block mb-1">Mín. Monto Venta S/</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 3000"
                      className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                </div>

                {/* Notas / Observaciones */}
                <div>
                  <label className="font-bold text-ink-muted uppercase block mb-1">Notas / Políticas de Campaña</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. Válido hasta fin de mes o agotar stock"
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="font-bold text-ink-muted uppercase block mb-1">Estado de la Regla</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Activo' | 'Inactivo')}
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="btn-primary w-full"
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
