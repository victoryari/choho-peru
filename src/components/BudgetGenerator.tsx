import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Trash2, Search, FileText, Check, ArrowRight, User, Hash, 
  AlertTriangle, ShieldCheck, Zap, Plus, ShoppingCart, 
  CreditCard, Calendar, DollarSign, Store, Sparkles, X, ChevronRight,
  Phone, Download, Copy, CheckCheck, MessageCircle, ExternalLink,
  Percent, Tag
} from "lucide-react";
import { calcularPrecioLinea, ContextoCalculo } from "../utils/discountEngine";
import { QuoteItem, Quote, Product } from "../types";
import { useAppStore } from "../store/useAppStore";
import { 
  generateQuotePDF, 
  shareQuoteViaWhatsApp, 
  buildQuoteWhatsAppMessage,
  normalizePeruvianPhone 
} from "../utils/quotePdfGenerator";

interface BudgetGeneratorProps {
  budgetItems: QuoteItem[];
  onUpdateQty: (sku: string, newQty: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearBudget: () => void;
  onSaveQuote: (quote: Omit<Quote, "id" | "date"> & { paymentType?: "Contado" | "Crédito"; validityDays?: number }) => Promise<Quote | null>;
  currentUserName: string;
  region?: "LIMA" | "PROVINCIA";
  advisorRole?: string;
  errorMsg?: string | null;
  onClearError?: () => void;
}

export function BudgetGenerator({
  budgetItems,
  onUpdateQty,
  onRemoveItem,
  onClearBudget,
  onSaveQuote,
  currentUserName,
  region,
  advisorRole,
  errorMsg,
  onClearError
}: BudgetGeneratorProps) {
  const { products, setBudgetItems, companySettings, discountRules } = useAppStore();

  // Search & Omnibox states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Client & Document states
  const [ruc, setRuc] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSearchingSUNAT, setIsSearchingSUNAT] = useState(false);
  const [sunatStatus, setSunatStatus] = useState<"idle" | "success" | "error">("idle");
  const [apiSource, setApiSource] = useState<string | null>(null);

  // Commercial conditions
  const [paymentType, setPaymentType] = useState<"Contado" | "Crédito">("Contado");
  const [creditDays, setCreditDays] = useState<number>(15);
  const [validityDays, setValidityDays] = useState<number>(15);
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");

  // Save & Share states
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuoteForShare, setSavedQuoteForShare] = useState<Quote | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Keyboard shortcut listener: F2 or Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered products for quick-add dropdown
  const filteredProducts = searchQuery.trim().length >= 1
    ? products.filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        return (
          p.sku.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
        );
      }).slice(0, 7)
    : [];

  // Popular / High rotation quick chips
  const popularProducts = products.slice(0, 4);

  // Add product to quote
  const handleAddProduct = (product: Product, qtyToAdd = 1) => {
    const existing = budgetItems.find((i) => i.sku === product.sku);
    if (existing) {
      onUpdateQty(product.sku, existing.qty + qtyToAdd);
    } else {
      setBudgetItems([
        ...budgetItems,
        {
          sku: product.sku,
          name: product.name,
          price: product.basePrice,
          qty: qtyToAdd
        }
      ]);
    }
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  // Real-time calculation of discounts and prices per line based on commercial rules
  const lineCalculations = useMemo(() => {
    // Monto bruto total acumulado del pedido para evaluar escalas comerciales globales
    const totalBrutoPedido = budgetItems.reduce((acc, item) => {
      const matchingProd = products.find((p) => p.sku === item.sku);
      const base = Number(matchingProd?.basePrice ?? item.basePrice ?? item.price ?? 0);
      return acc + (base * item.qty);
    }, 0);

    return budgetItems.map((item) => {
      const matchingProd = products.find((p) => p.sku === item.sku);
      const basePrice = Number(matchingProd?.basePrice ?? item.basePrice ?? item.price ?? 0);
      const ctx: ContextoCalculo = {
        sku: item.sku,
        productName: item.name || matchingProd?.name || null,
        categoriaId: matchingProd?.categoriaId || null,
        basePrice,
        qty: Number(item.qty) || 1,
        metodoPago: paymentType === "Crédito" ? "CREDITO" : "CONTADO",
        region: region || null,
        role: advisorRole || null,
        familiaId: matchingProd?.familia?.id || null,
        subFamiliaId: matchingProd?.subFamilia?.id || null,
        lineaId: matchingProd?.linea?.id || null,
        montoTotalPedido: totalBrutoPedido,
      };

      const resultado = calcularPrecioLinea((discountRules || []) as any, ctx);
      const hasDiscount = resultado.descuentoUnitario > 0;
      const savingsLine = resultado.descuentoUnitario * item.qty;

      return {
        ...item,
        matchingProd,
        basePrice,
        priceFinal: resultado.precioUnitario,
        discountUnit: resultado.descuentoUnitario,
        discountTotal: savingsLine,
        discountPercent: resultado.descuentoPorcentaje,
        lineTotal: resultado.totalLinea,
        ruleApplied: resultado.reglaAplicada,
        subsidyRule: resultado.reglaSubsidio,
        hasDiscount,
        message: resultado.mensaje,
      };
    });
  }, [budgetItems, products, discountRules, paymentType, region, advisorRole]);

  // Computations based on company settings and authorized discounted prices
  const igvPercent = Number(companySettings?.igvPercent || 18);
  const igvRate = igvPercent / 100;
  const grossTotal = lineCalculations.reduce((acc, curr) => acc + (curr.basePrice * curr.qty), 0);
  const totalSavings = lineCalculations.reduce((acc, curr) => acc + curr.discountTotal, 0);
  const total = Number(lineCalculations.reduce((acc, curr) => acc + curr.lineTotal, 0).toFixed(2));
  const subtotal = Number((total / (1 + igvRate)).toFixed(2));
  const igv = Number((total - subtotal).toFixed(2));
  const totalUnits = budgetItems.reduce((acc, curr) => acc + curr.qty, 0);
  const globalDiscountPercent = grossTotal > 0 ? (totalSavings / grossTotal) * 100 : 0;

  // Document type helper
  const cleanDoc = ruc.trim().replace(/\D/g, "");
  const detectedDocType = cleanDoc.length === 8 ? "DNI" : cleanDoc.length === 11 ? "RUC" : cleanDoc.length > 0 ? "DOC" : null;

  // Connects with real server-side SUNAT / Peru API query
  const querySUNAT = async () => {
    if (!cleanDoc) return;
    setIsSearchingSUNAT(true);
    setSunatStatus("idle");
    setApiSource(null);
    try {
      const res = await fetch(`/api/sunat/${cleanDoc}`);
      if (!res.ok) throw new Error("Error querying SUNAT");
      const data = await res.json();
      if (data.businessName) {
        setClientName(data.businessName);
        setAddress(data.address || "Dirección Fiscal Registrada en SUNAT");
        if (data.phone) setClientPhone(data.phone);
        setSunatStatus("success");
        setApiSource(data.source === "PeruAPI" ? "Peru API" : "SUNAT / RENIEC");
      } else {
        setSunatStatus("error");
      }
    } catch (err) {
      setSunatStatus("error");
    } finally {
      setIsSearchingSUNAT(false);
    }
  };

  const handleSave = async (status: "Pendiente" | "Aceptada") => {
    if (budgetItems.length === 0) return;
    if (!clientName.trim()) {
      alert("Por favor ingrese el nombre del cliente o consulte con RUC/DNI.");
      return;
    }

    setIsSaving(true);
    onClearError?.();
    try {
      const quotePayload = {
        clientName: clientName.trim(),
        clientDoc: ruc.trim() || "S/D",
        clientAddress: address.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        advisor: currentUserName,
        total,
        subtotal,
        igv,
        status,
        items: lineCalculations.map((l) => ({
          sku: l.sku,
          name: l.name,
          qty: l.qty,
          price: l.priceFinal,
          basePrice: l.basePrice,
          discountUnit: l.discountUnit,
          discountTotal: l.discountTotal,
          discountPercent: l.discountPercent,
          discountMessage: l.message
        })),
        paymentType,
        validityDays
      };

      const savedQuote = await onSaveQuote(quotePayload);
      if (!savedQuote) return;

      const completeQuote: Quote = {
        ...savedQuote,
        clientPhone: clientPhone.trim(),
        clientAddress: address.trim(),
        paymentType,
        validityDays
      };

      setSavedQuoteForShare(completeQuote);
      setIsShareModalOpen(true);
      setShareFeedback(null);
    } catch (err) {
      console.error("Error saving quote", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!savedQuoteForShare) return;
    setIsSharingWhatsApp(true);
    setShareFeedback(null);
    try {
      const res = await shareQuoteViaWhatsApp(savedQuoteForShare, clientPhone);
      if (res.method === "whatsapp-web") {
        setShareFeedback({
          type: "info",
          message: "Se generó el PDF y se abrió WhatsApp Web con el mensaje oficial. ¡Solo arrastre o adjunte el PDF descargado!"
        });
      } else if (res.method === "native-share") {
        setShareFeedback({
          type: "success",
          message: "¡Cotización compartida con archivo PDF adjunto a WhatsApp!"
        });
      }
    } catch (err) {
      console.error("Error sharing quote:", err);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!savedQuoteForShare) return;
    generateQuotePDF(savedQuoteForShare, { autoDownload: true });
    setShareFeedback({
      type: "success",
      message: `El archivo Cotizacion_${savedQuoteForShare.id}.pdf se descargó exitosamente.`
    });
  };

  const handleCopyMessage = () => {
    if (!savedQuoteForShare) return;
    const msg = buildQuoteWhatsAppMessage(savedQuoteForShare);
    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleCloseAndNewQuote = () => {
    setIsShareModalOpen(false);
    setSavedQuoteForShare(null);
    setShareFeedback(null);
    onClearBudget();
    setRuc("");
    setClientName("");
    setAddress("");
    setClientPhone("");
    setSunatStatus("idle");
    setApiSource(null);
  };

  return (
    <div className="space-y-4 text-left">
      {/* POS Top Action & Search Bar */}
      <div className="bg-surface border border-line rounded-2xl p-4 shadow-xs relative">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Omnibox POS Search */}
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-fg" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por SKU, Nombre o Modelo (ej. 428H, Corona, Piñón, Pulsar)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full bg-surface-2 hover:bg-surface-3 focus:bg-surface border border-line focus:border-brand rounded-xl pl-10 pr-24 py-2.5 text-xs text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 transition-all font-medium"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-ink-subtle hover:text-ink cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-mono font-bold text-ink-subtle">
                  F2 / Ctrl+K
                </span>
              </div>
            </div>

            {/* Fast Dropdown Results */}
            {isSearchFocused && searchQuery.trim().length >= 1 && (
              <div 
                className="absolute left-0 right-0 top-full mt-2 bg-surface border border-line rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="p-2 border-b border-line bg-surface-2/60 flex items-center justify-between text-micro text-ink-subtle font-bold uppercase tracking-wider">
                  <span>Resultados en Catálogo ({filteredProducts.length})</span>
                  <span>Clic o Enter para agregar</span>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-muted">
                    No se encontraron repuestos con el término <span className="font-bold text-ink">"{searchQuery}"</span>
                  </div>
                ) : (
                  <div className="divide-y divide-line/60">
                    {filteredProducts.map((prod) => {
                      const inCart = budgetItems.find((i) => i.sku === prod.sku);
                      const isLowStock = prod.stock > 0 && prod.stock <= 5;
                      const isOutOfStock = prod.stock <= 0;

                      return (
                        <div
                          key={prod.sku}
                          onClick={() => handleAddProduct(prod)}
                          className="p-3 hover:bg-surface-2 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {prod.img ? (
                              <img src={prod.img} alt={prod.name} className="w-9 h-9 object-cover rounded-lg border border-line shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-fg shrink-0">
                                <Zap className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-brand-fg">{prod.sku}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                  isOutOfStock 
                                    ? "bg-danger-soft text-danger-fg" 
                                    : isLowStock 
                                    ? "bg-warning-soft text-warning-fg" 
                                    : "bg-success-soft text-success-fg"
                                }`}>
                                  {isOutOfStock ? "Agotado" : `${prod.stock} disponibles`}
                                </span>
                              </div>
                              <h5 className="text-xs font-semibold text-ink truncate group-hover:text-brand-fg transition-colors">
                                {prod.name}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-xs text-ink">
                              S/ {prod.basePrice.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProduct(prod);
                              }}
                              className="btn-primary py-1 px-2.5 text-micro gap-1 rounded-lg"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{inCart ? `(${inCart.qty}) Añadir` : "Añadir"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Rotation Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <span className="text-[11px] font-bold text-ink-subtle uppercase flex items-center gap-1 shrink-0 mr-1">
              <Zap className="w-3 h-3 text-brand-fg" /> Alta Rotación:
            </span>
            {popularProducts.map((p) => (
              <button
                key={p.sku}
                type="button"
                onClick={() => handleAddProduct(p)}
                className="px-2.5 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink text-micro font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-2xs hover:border-brand/40"
                title={`${p.name} - S/ ${p.basePrice.toFixed(2)}`}
              >
                <Plus className="w-3 h-3 text-brand-fg" />
                <span className="font-mono">{p.sku}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Items (Left) + Client & Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left items-start">
        {/* Left Column (7 cols): Items Table & Terminal Area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-brand/10 dark:bg-brand/20 rounded-lg text-brand-fg">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                    Items del Presupuesto Comercial
                  </h3>
                  <p className="text-[11px] text-ink-subtle font-medium">
                    {budgetItems.length} ítem{budgetItems.length !== 1 ? "s" : ""} registrados · {totalUnits} unidade{totalUnits !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalSavings > 0 && (
                  <span className="text-[11px] font-bold text-success-fg bg-success-soft px-2.5 py-1 rounded-full border border-success/20 flex items-center gap-1 shadow-2xs">
                    <Zap className="w-3 h-3 text-warning fill-warning" />
                    <span>Descuentos activos (-S/ {totalSavings.toFixed(2)})</span>
                  </span>
                )}
                {budgetItems.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearBudget}
                    className="text-xs font-semibold text-ink-subtle hover:text-danger-fg transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-danger-soft"
                  >
                    Vaciar todo
                  </button>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="mt-4 space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {budgetItems.length === 0 ? (
                <div className="py-14 px-4 text-center border-2 border-dashed border-line rounded-2xl bg-surface-2/40">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand-fg flex items-center justify-center mx-auto mb-3">
                    <Store className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-xs text-ink mb-1">El presupuesto está vacío</h4>
                  <p className="text-ink-subtle text-xs max-w-sm mx-auto mb-4">
                    Utilice el buscador superior (F2) o agregue repuestos frecuentes para armar la cotización en segundos.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {popularProducts.map((p) => (
                      <button
                        key={p.sku}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-brand hover:text-brand-contrast text-ink text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir {p.sku}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                lineCalculations.map((item) => {
                  const stockAvailable = item.matchingProd ? item.matchingProd.stock : null;

                  return (
                    <div
                      key={item.sku}
                      className="p-3 bg-surface hover:bg-surface-2/70 border border-line rounded-2xl transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-mono text-brand-fg font-extrabold">{item.sku}</span>
                          {stockAvailable !== null && (
                            <span className="text-[10px] font-mono font-semibold text-ink-subtle bg-surface-2 px-1.5 py-0.5 rounded">
                              Stock: {stockAvailable} und
                            </span>
                          )}
                          {item.hasDiscount && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success-fg bg-success-soft px-2 py-0.5 rounded-full border border-success/20">
                              <Percent className="w-2.5 h-2.5" />
                              <span>
                                {item.discountPercent > 0 ? `-${item.discountPercent.toFixed(0)}%` : `-S/ ${item.discountUnit.toFixed(2)}`}
                              </span>
                              <span className="font-normal opacity-80 text-micro">
                                ({paymentType === "Contado" ? "Contado" : "Crédito"}{item.subsidyRule ? " + Flete" : ""})
                              </span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-ink truncate mt-0.5" title={item.name}>{item.name}</h4>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {item.hasDiscount ? (
                            <>
                              <span className="text-xs font-mono text-ink-subtle line-through">
                                S/ {item.basePrice.toFixed(2)}
                              </span>
                              <span className="text-xs font-mono font-extrabold text-success-fg">
                                S/ {item.priceFinal.toFixed(2)} c/u
                              </span>
                              <span className="text-[10px] text-success-fg bg-success-soft/70 px-1.5 py-0.2 rounded font-medium border border-success/20">
                                Ahorro S/ {item.discountUnit.toFixed(2)}/u
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-mono text-ink-subtle">
                              S/ {item.basePrice.toFixed(2)} c/u
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {/* Qty edit with direct keyboard input support */}
                        <div className="flex items-center bg-surface border border-line rounded-xl px-1">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.sku, Math.max(1, item.qty - 1))}
                            className="px-2 py-1 text-ink-muted hover:text-brand-fg font-bold transition-colors cursor-pointer"
                            title="Disminuir cantidad"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty === 0 ? "" : item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val > 0) {
                                onUpdateQty(item.sku, val);
                              } else if (e.target.value === "") {
                                onUpdateQty(item.sku, 1);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-12 text-center text-xs font-mono font-bold text-ink bg-transparent focus-visible:outline-none focus:bg-surface-2 dark:focus:bg-ink rounded py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.sku, item.qty + 1)}
                            className="px-2 py-1 text-ink-muted hover:text-brand-fg font-bold transition-colors cursor-pointer"
                            title="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal with discount indicator */}
                        <div className="text-right min-w-[85px]">
                          <span className="text-xs font-bold font-mono text-ink block">
                            S/ {item.lineTotal.toFixed(2)}
                          </span>
                          {item.hasDiscount && (
                            <span className="text-[10px] font-mono text-success-fg font-semibold block">
                              -S/ {item.discountTotal.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.sku)}
                          className="text-ink-subtle hover:text-danger-fg transition-colors p-1.5 rounded-lg hover:bg-danger-soft cursor-pointer"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Client, Conditions & Financial Summary */}
        <div className="lg:col-span-5 space-y-4">
          {/* Client Metadata Section */}
          <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <User className="w-4 h-4 text-brand-fg" />
                Información del Cliente
              </h3>
              {detectedDocType && (
                <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand-fg text-[10px] font-bold font-mono uppercase">
                  {detectedDocType} ({cleanDoc.length} dígitos)
                </span>
              )}
            </div>

            <div className="space-y-3.5">
              {/* RUC / DNI Input + Peru API Button */}
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block flex items-center justify-between">
                  <span>RUC o DNI del Cliente</span>
                  <span className="text-micro font-normal text-ink-subtle">Peru API / SUNAT</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                    <input
                      type="text"
                      placeholder="Ej. 20608542193"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          querySUNAT();
                        }
                      }}
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-9 pr-3 py-2 text-xs text-ink focus-visible:outline-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={querySUNAT}
                    disabled={isSearchingSUNAT || !cleanDoc}
                    className="btn-danger-ghost px-3.5 h-9 shrink-0 gap-1.5 text-xs font-bold"
                  >
                    {isSearchingSUNAT ? "Consultando..." : "Consultar SUNAT"}
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {sunatStatus === "success" && (
                <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div>Datos validados con SUNAT. Contribuyente ACTIVO y HABIDO.</div>
                    {apiSource && (
                      <div className="text-[10px] opacity-80 font-normal font-mono">
                        Validado vía {apiSource}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sunatStatus === "error" && (
                <div className="p-3 bg-warning-soft dark:bg-warning/30 border border-warning/30 dark:border-warning/60 text-warning-fg rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>No se encontró RUC. Ingrese los datos de forma manual.</span>
                </div>
              )}

              {/* Client fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Razón Social / Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre o razón comercial"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Dirección de Despacho
                  </label>
                  <input
                    type="text"
                    placeholder="Av. Principal, Ciudad"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block flex items-center justify-between">
                    <span>Teléfono / WhatsApp</span>
                    <span className="text-micro text-emerald-600 dark:text-emerald-400 font-semibold font-mono">Para PDF y WhatsApp</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                    <input
                      type="text"
                      placeholder="Ej. 987654321 o +51 987 654 321"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-9 pr-3.5 py-2 text-xs text-ink focus-visible:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Commercial Conditions */}
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-xs">
            <h4 className="text-xs font-extrabold text-ink uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-brand-fg" />
              Condiciones de la Oferta
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-micro font-bold uppercase text-ink-subtle block">Forma de Pago</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full bg-surface-2 text-xs font-bold text-ink rounded-xl px-2.5 py-1.5 border border-line focus:outline-none cursor-pointer"
                >
                  <option value="Contado">Contado Inmediato</option>
                  <option value="Crédito">Crédito Comercial</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-micro font-bold uppercase text-ink-subtle block">Validez Oferta</label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full bg-surface-2 text-xs font-bold text-ink rounded-xl px-2.5 py-1.5 border border-line focus:outline-none cursor-pointer"
                >
                  <option value={7}>7 Días Calendario</option>
                  <option value={15}>15 Días Calendario</option>
                  <option value={30}>30 Días Calendario</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial Summary & Actions */}
          <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line flex items-center justify-between">
              <span>Resumen Financiero</span>
              <span className="text-micro text-ink-subtle font-mono uppercase">Moneda: Soles (PEN)</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Precio de Lista Bruto:</span>
                <span className="font-mono font-medium text-ink">S/ {grossTotal.toFixed(2)}</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-success-soft/70 border border-success/20 text-success-fg">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-success-fg shrink-0" />
                    <span>Ahorro / Descuento Total:</span>
                  </div>
                  <span className="font-mono font-extrabold text-xs">
                    - S/ {totalSavings.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-ink-muted">
                <span>Subtotal Neto (Sin Impuesto):</span>
                <span className="font-mono font-bold text-ink">S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>IGV ({igvPercent}%):</span>
                <span className="font-mono font-bold text-ink">S/ {igv.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-line flex items-baseline justify-between text-sm">
                <div>
                  <span className="font-extrabold text-ink uppercase block">TOTAL A PAGAR:</span>
                  {totalSavings > 0 && (
                    <span className="text-[11px] text-success-fg font-semibold">
                      ¡Ahorras {globalDiscountPercent.toFixed(1)}% en esta cotización!
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-black font-mono text-brand-fg text-2xl">
                    S/ {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error & Success Feedback */}
            {errorMsg && (
              <div className="p-3 bg-danger-soft border border-danger/30 text-danger-fg rounded-xl text-xs flex items-start gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSave("Pendiente")}
                disabled={isSaving || budgetItems.length === 0}
                className="w-full bg-surface-2 hover:bg-surface-3 text-ink font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 border border-line"
              >
                <span>{isSaving ? "Guardando..." : "Guardar Borrador (Pendiente)"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave("Aceptada")}
                disabled={isSaving || budgetItems.length === 0}
                className="w-full bg-brand hover:bg-brand/90 text-brand-contrast font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand/30 disabled:opacity-50"
              >
                <span>{isSaving ? "Procesando..." : "Aprobar y Emitir (Aceptada)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Compartir Cotización por WhatsApp / Descargar PDF */}
      {isShareModalOpen && savedQuoteForShare && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-brand/10 border-b border-line p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand text-brand-contrast flex items-center justify-center shrink-0 shadow-md shadow-brand/20">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-ink font-display">
                    ¡Cotización Registrada con Éxito!
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-xs text-brand-fg bg-brand/15 px-2 py-0.5 rounded-md">
                      {savedQuoteForShare.id}
                    </span>
                    <span className="text-micro text-ink-subtle">
                      Estado: <span className="font-bold text-ink">{savedQuoteForShare.status}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 text-ink-subtle hover:text-ink rounded-xl hover:bg-surface-2 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Summary Card */}
              <div className="bg-surface-2 border border-line rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Cliente / Razón Social:</span>
                  <span className="font-bold text-ink truncate max-w-[240px]">{savedQuoteForShare.clientName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Documento (RUC/DNI):</span>
                  <span className="font-mono font-semibold text-ink">{savedQuoteForShare.clientDoc || "S/D"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Total Cotizado:</span>
                  <span className="font-mono font-black text-brand-fg text-sm">
                    S/ {Number(savedQuoteForShare.total).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Ítems incluidos:</span>
                  <span className="font-bold text-ink">{savedQuoteForShare.items?.length || 0} repuestos</span>
                </div>
              </div>

              {/* Destination WhatsApp Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Número de WhatsApp del Cliente
                  </span>
                  <span className="text-micro font-normal text-ink-subtle font-mono">Perú (+51)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="text"
                    placeholder="Ej. 987654321 o 51987654321"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-surface-2 hover:bg-surface-3 focus:bg-surface border border-line focus:border-brand rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 transition-all"
                  />
                </div>
                <p className="text-[11px] text-ink-subtle">
                  Puede ingresar o corregir el teléfono para enviar la cotización directamente por WhatsApp.
                </p>
              </div>

              {/* Feedback Alert */}
              {shareFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  shareFeedback.type === "success" 
                    ? "bg-success-soft border-success/30 text-success-fg" 
                    : "bg-surface-2 border-brand/30 text-ink"
                }`}>
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-fg" />
                  <span className="font-medium leading-relaxed">{shareFeedback.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* Primary WhatsApp Action */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={isSharingWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-5 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{isSharingWhatsApp ? "Procesando WhatsApp..." : "Compartir por WhatsApp (PDF)"}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {/* Download PDF Button */}
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="bg-surface-2 hover:bg-surface-3 border border-line text-ink font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-brand-fg" />
                    <span>Descargar PDF</span>
                  </button>

                  {/* Copy WhatsApp Message */}
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="bg-surface-2 hover:bg-surface-3 border border-line text-ink font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    {copiedMessage ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-ink-subtle" />
                        <span>Copiar Mensaje</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Finalize and Start New Quote */}
                <button
                  type="button"
                  onClick={handleCloseAndNewQuote}
                  className="w-full bg-surface hover:bg-surface-2 border border-line text-ink-muted hover:text-ink font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cerrar y Nueva Cotización</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
