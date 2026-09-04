import React, { useState } from "react";
import { Package, Truck, Plus, Check, Search, MapPin, Archive, RefreshCw, Box } from "lucide-react";
import { PurchaseOrder, PurchaseItem, Product } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface PurchasingManagerProps {
  purchases: PurchaseOrder[];
  products: Product[];
  currentUserName: string;
  onReceivePurchase: (id: string, location: string, receiver: string) => Promise<void>;
  onCreatePurchase: (po: Omit<PurchaseOrder, "id" | "status">) => Promise<void>;
}

export function PurchasingManager({
  purchases,
  products,
  currentUserName,
  onReceivePurchase,
  onCreatePurchase
}: PurchasingManagerProps) {
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  
  // New PO State
  const [supplierRuc, setSupplierRuc] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receiving PO State
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  const filteredProducts = searchProductQuery.length > 2
    ? products.filter(p => p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchProductQuery.toLowerCase()))
    : [];

  const handleAddProduct = (p: Product) => {
    setCart(prev => {
      const exists = prev.find(i => i.sku === p.sku);
      if (exists) {
        return prev.map(i => i.sku === p.sku ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { sku: p.sku, name: p.name, qty: 1, unitCost: p.basePrice * 0.7 }]; // 30% discount default for cost
    });
    setSearchProductQuery("");
  };

  const handleUpdateItem = (sku: string, field: "qty" | "unitCost", value: number) => {
    setCart(prev => prev.map(i => i.sku === sku ? { ...i, [field]: value } : i));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.qty * item.unitCost), 0);

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !supplierRuc || !supplierName) return;
    
    setIsSubmitting(true);
    await onCreatePurchase({
      supplierRuc,
      supplierName,
      date: new Date().toISOString().split("T")[0],
      total: cartTotal,
      items: cart
    });
    setIsSubmitting(false);
    
    // Reset
    setCart([]);
    setSupplierRuc("");
    setSupplierName("");
    setActiveTab("list");
  };

  const handleReceiveConfirm = async () => {
    if (!receivingPo || !locationInput) return;
    setIsReceiving(true);
    await onReceivePurchase(receivingPo.id, locationInput, currentUserName);
    setIsReceiving(false);
    setReceivingPo(null);
    setLocationInput("");
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-white">
            <Truck className="w-5 h-5 text-[#E51920]" />
            Módulo de Compras e Ingresos a Almacén
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de abastecimiento, órdenes de compra y ubicación de mercadería.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "list" 
                ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md" 
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Órdenes
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "new" 
                ? "bg-[#E51920] text-white shadow-md shadow-red-600/30" 
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Orden
          </button>
        </div>
      </div>

      {activeTab === "list" && (
        <div className="grid grid-cols-1 gap-4">
          {purchases.map(po => (
            <div key={po.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#E51920] dark:text-red-400">{po.id}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      po.status === 'Recibido' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{po.supplierName}</h4>
                  <p className="text-[11px] text-slate-500">RUC: {po.supplierRuc} | Fecha OC: {po.date}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Total Compra</div>
                  <div className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
                    S/ {po.total.toFixed(2)}
                  </div>
                  {po.status === "Pendiente" && (
                    <button
                      onClick={() => setReceivingPo(po)}
                      className="mt-2 w-full md:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Ingresar a Almacén
                    </button>
                  )}
                </div>
              </div>
              
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Detalle de Productos</h5>
                  <div className="space-y-1">
                    {po.items.map(item => (
                      <div key={item.sku} className="flex justify-between text-xs p-1.5 bg-slate-50 dark:bg-slate-950/50 rounded-lg">
                        <span className="text-slate-600 dark:text-slate-400 truncate pr-4">{item.qty}x {item.name}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">S/ {(item.qty * item.unitCost).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {po.status === "Recibido" && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col justify-center">
                    <h5 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Recepción Confirmada
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Responsable:</span> {po.receivedBy}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Ubicación Física:</span> {po.location}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Fecha Ingreso:</span> {po.receiveDate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {purchases.length === 0 && (
            <div className="text-center py-12 text-slate-400">No hay órdenes de compra registradas.</div>
          )}
        </div>
      )}

      {activeTab === "new" && (
        <form onSubmit={handleSubmitPO} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                Datos del Proveedor
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">RUC Proveedor</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={supplierRuc}
                    onChange={e => setSupplierRuc(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                    placeholder="2010..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Razón Social</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                    placeholder="Empresa Proveedora S.A.C."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-between">
                <span>Productos a Comprar</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                  {cart.length} ítems
                </span>
              </h4>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar código o nombre del producto..."
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                
                {searchProductQuery.length > 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <div 
                        key={p.sku} 
                        onClick={() => handleAddProduct(p)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="font-mono text-[10px] text-[#E51920] dark:text-red-400">{p.sku}</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-3 text-xs text-center text-slate-500">No se encontraron productos.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.sku} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-[#E51920] dark:text-red-400">{item.sku}</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <label className="text-[9px] text-slate-500 uppercase block">Costo Un.</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={e => handleUpdateItem(item.sku, "unitCost", Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div className="w-20">
                        <label className="text-[9px] text-slate-500 uppercase block">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleUpdateItem(item.sku, "qty", Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div className="w-24 text-right pt-3">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          S/ {(item.qty * item.unitCost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Package className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-semibold">Busque y agregue productos a la orden.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit sticky top-6">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              Resumen de Compra
            </h4>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal Neto</span>
                <span>S/ {(cartTotal / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>IGV (18%)</span>
                <span>S/ {(cartTotal - (cartTotal / 1.18)).toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">Costo Total</span>
                <span className="text-xl font-mono font-extrabold text-[#E51920] dark:text-red-400">
                  S/ {cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={cart.length === 0 || !supplierRuc || !supplierName || isSubmitting}
              className="w-full bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Emitir Orden de Compra
            </button>
          </div>
        </form>
      )}

      {/* RECEIVE MODAL */}
      <AnimatePresence>
        {receivingPo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setReceivingPo(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-md z-10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-display">Recepción en Almacén</h3>
                  <p className="text-xs text-slate-500">Orden {receivingPo.id}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Proveedor: {receivingPo.supplierName}</p>
                  <p className="text-xs text-slate-500 mt-1">{receivingPo.items.length} productos a ingresar.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Ubicación Física en Almacén
                  </label>
                  <input
                    type="text"
                    required
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    placeholder="Ej. Pasillo A, Estante 3"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isReceiving || !locationInput}
                  onClick={handleReceiveConfirm}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isReceiving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  Confirmar Ingreso
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
