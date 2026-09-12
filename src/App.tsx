import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Lock, Mail, ShieldAlert, Sparkles, FolderSync } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useAppStore } from "./store/useAppStore";
import { Layout } from "./components/Layout";
import { ChohoLogo } from "./components/ChohoLogo";
import { ProductDetailModal } from "./components/ProductDetailModal";

// Views
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { Catalog } from "./components/Catalog";
import { InventoryManager } from "./components/InventoryManager";
import { BudgetGenerator } from "./components/BudgetGenerator";
import { QuotesList } from "./components/QuotesList";
import { RealTimeTelemetry } from "./components/RealTimeTelemetry";
import { ExpensesManager } from "./components/ExpensesManager";
import { SyncCenter } from "./components/SyncCenter";
import { AdminPanel } from "./components/AdminPanel";
import { PurchasingManager } from "./components/PurchasingManager";
import { AccountsReceivable } from "./components/AccountsReceivable";
import { Maintenance } from "./components/Maintenance";
import { TravelBudgets } from "./components/TravelBudgets";
import { DiscountManager } from "./components/DiscountManager";
import { Commissions } from "./components/Commissions";

import { User, QuoteItem, Quote, Product, TravelExpense, PurchaseOrder } from "./types";

export default function App() {
  const {
    theme,
    isLoggedIn,
    currentUser,
    isOfflineMode,
    setProducts,
    setQuotes,
    setUsers,
    setTelemetry,
    setRolesList,
    setExpenses,
    setIsLoggedIn,
    setCurrentUser,
    budgetItems,
    setBudgetItems,
    selectedProduct,
    setSelectedProduct,
    products,
    quotes,
    expenses,
    users,
    telemetry,
    rolesList,
    offlinePendingQuotes,
    purchases,
    receivables,
    setPurchases,
    setReceivables,
    setIsOfflineMode,
    setOfflinePendingQuotes,
    maintenanceOrders,
    setMaintenanceOrders,
    travelBudgets,
    setTravelBudgets,
    discountRules,
    setDiscountRules,
    commissions,
    setCommissions
  } = useAppStore();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Apply theme class to root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark", "dark-theme");
      document.body.classList.add("dark", "dark-theme");
    } else {
      root.classList.remove("dark", "dark-theme");
      document.body.classList.remove("dark", "dark-theme");
    }
  }, [theme]);

  // Fetch initial baseline data
  const fetchBaselineData = async () => {
    try {
      const [resProducts, resQuotes, resUsers, resTelemetry, resExpenses, resRoles, resPurchases, resReceivables] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/quotes"),
        fetch("/api/users"),
        fetch("/api/telemetry"),
        fetch("/api/expenses"),
        fetch("/api/roles"),
        fetch("/api/purchases"),
        fetch("/api/receivables")
      ]);

      if (resProducts.ok) setProducts(await resProducts.json());
      if (resQuotes.ok) setQuotes(await resQuotes.json());
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resTelemetry.ok) setTelemetry(await resTelemetry.json());
      if (resRoles.ok) {
        const rolesData = await resRoles.json();
        if (Array.isArray(rolesData) && rolesData.length > 0) setRolesList(rolesData);
      }
      if (resExpenses.ok) setExpenses(await resExpenses.json());
      if (resPurchases.ok) setPurchases(await resPurchases.json());
      if (resReceivables.ok) setReceivables(await resReceivables.json());
    } catch (err) {
      console.error("Error loading baseline fullstack data, entering offline grace mode:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchBaselineData();
    }
  }, [isOfflineMode, isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error de credenciales");
      }

      const data = await res.json();
      localStorage.setItem("choho_token", data.token);
      localStorage.setItem("choho_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsLoggedIn(true);
    } catch (err: any) {
      setLoginError(err.message || "Fallo de conexión");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logic handlers for the views
  const handleAddToBudget = (item: QuoteItem) => {
    const existing = budgetItems.find((i) => i.sku === item.sku);
    if (existing) {
      setBudgetItems(budgetItems.map((i) => (i.sku === item.sku ? { ...i, qty: i.qty + item.qty } : i)));
    } else {
      setBudgetItems([...budgetItems, item]);
    }
  };
  
  const handleUpdateProduct = async (sku: string, updatedPayload: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p && p.sku === sku ? { ...p, ...updatedPayload } : p))
    );

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(sku)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.sku) {
          setProducts(prev => prev.map(p => (p && p.sku === sku ? { ...p, ...updated } : p)));
        }
      }
    } catch (err) {
      console.error("Error al actualizar producto en backend:", err);
    }
  };

  const handleAddProduct = async (product: Product) => {
    setProducts(prev => [...prev.filter(p => p && p.sku !== product.sku), product]);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const created = await res.json();
        if (created && created.sku) {
          setProducts(prev => prev.map(p => (p && p.sku === created.sku ? created : p)));
        }
      }
    } catch (err) {
      console.error("Error al registrar producto en backend:", err);
    }
  };
  
  const handleUpdateCartQty = (sku: string, qty: number) => {
    if (qty <= 0) {
      setBudgetItems(budgetItems.filter(i => i.sku !== sku));
    } else {
      setBudgetItems(budgetItems.map(i => i.sku === sku ? { ...i, qty } : i));
    }
  };
  
  const handleRemoveCartItem = (sku: string) => {
    setBudgetItems(budgetItems.filter(i => i.sku !== sku));
  };
  
  const handleClearBudget = () => setBudgetItems([]);

  const handleAddVisit = async (visit: any) => {
    // In a real app, this would be a POST.
    const newVisit = { ...visit, id: `TEL-${Date.now()}` };
    setTelemetry([newVisit, ...telemetry]);
  };

  const handleAddExpense = async (expense: Omit<TravelExpense, "id">) => {
    const newExpense: TravelExpense = { ...expense, id: `EXP-${Date.now()}` };
    setExpenses([newExpense, ...expenses]);
  };

  const handleUpdateExpenseStatus = async (id: string, status: "Aprobado" | "Rechazado") => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, approvalStatus: status } : e));
  };

  const handleAddUser = async (user: Omit<User, "id">) => {
    const newUser: User = { ...user, id: `USR-${Date.now()}` };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const handleSyncNow = async () => {
    if (offlinePendingQuotes.length === 0) return;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Move all offline quotes to main quotes and clear offline queue
    setQuotes([...offlinePendingQuotes, ...quotes]);
    setOfflinePendingQuotes([]);
  };

  const handleAddMaintenance = (order: import('./types').MaintenanceOrder) => {
    setMaintenanceOrders([order, ...maintenanceOrders]);
  };

  const handleAddTravelBudget = (budget: import('./types').TravelBudget) => {
    setTravelBudgets([budget, ...travelBudgets]);
  };

  const handleAddDiscountRule = (rule: import('./types').DiscountRule) => {
    setDiscountRules([rule, ...discountRules]);
  };

  const handleAddCommission = (comm: import('./types').Commission) => {
    setCommissions([comm, ...commissions]);
  };
  
  const handleSaveQuote = async (quotePayload: Omit<Quote, "id" | "date">) => {
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotePayload)
      });
      if (res.ok) {
        const created = await res.json();
        setQuotes([created, ...quotes]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePurchase = async (po: Omit<PurchaseOrder, "id" | "status">) => {
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...po, status: "Pendiente" })
      });
      if (res.ok) {
        const created = await res.json();
        setPurchases([created, ...purchases]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReceivePurchase = async (id: string, location: string, receiver: string) => {
    try {
      const res = await fetch(`/api/purchases/${id}/receive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedBy: receiver,
          receiveDate: new Date().toISOString().split("T")[0],
          location
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setPurchases(purchases.map(p => p.id === id ? updated : p));
        // Actualizar stock de productos recibidos re-haciendo fetch
        const resProd = await fetch("/api/products");
        if (resProd.ok) setProducts(await resProd.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterPayment = async (invoiceId: string, amount: number, registeredBy: string) => {
    try {
      const res = await fetch(`/api/receivables/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, registeredBy })
      });
      if (res.ok) {
        const updated = await res.json();
        // Si el crédito se canceló, removerlo o actualizarlo
        if (updated.creditStatus === "Cancelado") {
          setReceivables(receivables.filter(r => r.id !== invoiceId));
        } else {
          setReceivables(receivables.map(r => r.id === invoiceId ? updated : r));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Grid & Gradient */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="flex justify-center mb-6">
            <ChohoLogo size="lg" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center text-3xl font-extrabold text-white tracking-tight">
            Enterprise Portal
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-2 text-center text-sm text-slate-400 font-medium max-w-sm mx-auto">
            Acceso seguro B2B para la fuerza de ventas y distribución Choho.
          </motion.p>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-4 shadow-[0_0_40px_-15px_rgba(229,25,32,0.3)] sm:rounded-2xl sm:px-10 border border-slate-800/80 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
            
            <form className="space-y-6 relative" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-300">Correo Electrónico Corporativo</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm bg-slate-950 text-white font-medium transition-all"
                    placeholder="usuario@choho.pe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Contraseña de Acceso</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm bg-slate-950 text-white font-medium transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }} className="rounded-lg bg-red-500/10 p-3 border border-red-500/20">
                    <div className="flex">
                      <ShieldAlert className="h-5 w-5 text-blue-500" />
                      <div className="ml-3">
                        <h3 className="text-sm font-bold text-blue-500">Autenticación Fallida</h3>
                        <div className="mt-1 text-xs text-red-300">{loginError}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-red-600/30 text-sm font-bold text-white bg-[#4D4DFF] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <FolderSync className="w-4 h-4 animate-spin" /> Verificando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Iniciar Sesión Segura
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<AnalyticsDashboard products={products} quotes={quotes} expenses={expenses} />} />
          <Route path="/catalog" element={<Catalog products={products} onSelectProduct={setSelectedProduct} onQuickAdd={(p) => handleAddToBudget({ sku: p.sku, name: p.name, qty: 1, price: p.basePrice })} />} />
          <Route path="/inventory" element={<InventoryManager products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} />} />
          <Route path="/cart" element={<BudgetGenerator budgetItems={budgetItems} onUpdateQty={handleUpdateCartQty} onRemoveItem={handleRemoveCartItem} onClearBudget={handleClearBudget} onSaveQuote={handleSaveQuote} currentUserName={currentUser?.name || "Asesor"} />} />
          <Route path="/quotes" element={<QuotesList quotes={quotes} onUpdateQuoteStatus={handleUpdateQuoteStatus} />} />
          <Route path="/maintenance" element={<Maintenance orders={maintenanceOrders} onAddOrder={handleAddMaintenance} />} />
          <Route path="/travel-budgets" element={<TravelBudgets budgets={travelBudgets} onAddBudget={handleAddTravelBudget} expenses={expenses} />} />
          <Route path="/discounts" element={<DiscountManager rules={discountRules} onAddRule={handleAddDiscountRule} />} />
          <Route path="/commissions" element={<Commissions commissions={commissions} onAddCommission={handleAddCommission} quotes={quotes} />} />
          <Route path="/telemetry" element={<RealTimeTelemetry telemetryList={telemetry} onAddVisit={handleAddVisit} currentUserName={currentUser?.name || "Asesor"} />} />
          <Route path="/expenses" element={<ExpensesManager expensesList={expenses} onAddExpense={handleAddExpense} onUpdateExpenseStatus={handleUpdateExpenseStatus} currentUserName={currentUser?.name || "Asesor"} travelBudgets={travelBudgets} />} />
          <Route path="/purchases" element={<PurchasingManager purchases={purchases} products={products} currentUserName={currentUser?.name || "Admin"} onReceivePurchase={handleReceivePurchase} onCreatePurchase={handleCreatePurchase} />} />
          <Route path="/receivables" element={<AccountsReceivable receivables={receivables} currentUserName={currentUser?.name || "Admin"} onRegisterPayment={handleRegisterPayment} />} />
          <Route path="/sync" element={<SyncCenter isOfflineMode={isOfflineMode} onToggleOffline={() => setIsOfflineMode(!isOfflineMode)} onSyncNow={handleSyncNow} localOfflineCount={offlinePendingQuotes.length} />} />
          <Route path="/admin" element={<AdminPanel currentUser={currentUser} users={users} products={products} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onUpdateProduct={handleUpdateProduct} onRolesUpdated={(roles) => setRolesList(roles)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToBudget={handleAddToBudget}
          />
        )}
      </Layout>
    </BrowserRouter>
  );
}
