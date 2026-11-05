import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Lock, Mail, ShieldAlert, Sparkles, FolderSync } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useAppStore, getUserPermissions, getDefaultRouteForUser } from "./store/useAppStore";
import { Layout } from "./components/Layout";
import { ChohoLogo } from "./components/ChohoLogo";
import { ProductDetailModal } from "./components/ProductDetailModal";

// Views
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SellerDashboard } from "./components/SellerDashboard";
import { Catalog } from "./components/Catalog";
import { InventoryManager } from "./components/InventoryManager";
import { PickingManager } from "./components/PickingManager";
import { ShippingGuideManager } from "./components/ShippingGuideManager";
import { KardexManager } from "./components/KardexManager";
import { BudgetGenerator } from "./components/BudgetGenerator";
import { QuotesList } from "./components/QuotesList";
import { RealTimeTelemetry } from "./components/RealTimeTelemetry";
import { ExpensesManager } from "./components/ExpensesManager";
import { SyncCenter } from "./components/SyncCenter";
import { AdminPanel } from "./components/AdminPanel";
import { AccountsReceivable } from "./components/AccountsReceivable";
import { TravelBudgets } from "./components/TravelBudgets";
import { DiscountManager } from "./components/DiscountManager";
import { Commissions } from "./components/Commissions";
import { BillingInvoice, IssuedInvoice } from "./components/BillingInvoice";

import { User, QuoteItem, Quote, Product, TravelExpense } from "./types";

export default function App() {
  const {
    theme,
    isLoggedIn,
    currentUser,
    isOfflineMode,
    setProducts,
    setCategorias,
    categorias,
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
    receivables,
    setReceivables,
    setIsOfflineMode,
    setOfflinePendingQuotes,
    travelBudgets,
    setTravelBudgets,
    discountRules,
    setDiscountRules,
    commissions,
    setCommissions,
    companySettings,
    setCompanySettings
  } = useAppStore();

  const userPermissions = getUserPermissions(currentUser, rolesList);
  const defaultRoute = getDefaultRouteForUser(currentUser, rolesList);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // La region de venta determina si aplica el subsidio de flete. Se deriva de la
  // zona asignada al asesor para que el cliente no pueda declararla a su medida.
  const regionActual: "LIMA" | "PROVINCIA" =
    (currentUser?.salesZone || "").toLowerCase().includes("provincia") ? "PROVINCIA" : "LIMA";

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
      const [resProducts, resQuotes, resUsers, resTelemetry, resExpenses, resRoles, resReceivables, resCommissions, resDiscounts, resCategorias, resSettings] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/quotes"),
        fetch("/api/users"),
        fetch("/api/telemetry"),
        fetch("/api/expenses"),
        fetch("/api/roles"),
        fetch("/api/receivables"),
        fetch("/api/commissions"),
        fetch("/api/discounts"),
        fetch("/api/categorias"),
        fetch("/api/company-settings")
      ]);

      if (resProducts.ok) {
        const prodData = await resProducts.json();
        if (Array.isArray(prodData)) setProducts(prodData);
      }
      if (resCategorias.ok) {
        const catData = await resCategorias.json();
        if (Array.isArray(catData)) setCategorias(catData);
      }
      if (resQuotes.ok) {
        const quotesData = await resQuotes.json();
        if (Array.isArray(quotesData)) setQuotes(quotesData);
      }
      if (resUsers.ok) {
        const usersData = await resUsers.json();
        if (Array.isArray(usersData)) setUsers(usersData);
      }
      if (resTelemetry.ok) {
        const telemetryData = await resTelemetry.json();
        if (Array.isArray(telemetryData)) setTelemetry(telemetryData);
      }
      if (resRoles.ok) {
        const rolesData = await resRoles.json();
        if (Array.isArray(rolesData) && rolesData.length > 0) setRolesList(rolesData);
      }
      if (resExpenses.ok) {
        const expensesData = await resExpenses.json();
        if (Array.isArray(expensesData)) setExpenses(expensesData);
      }
      if (resReceivables.ok) {
        const receivablesData = await resReceivables.json();
        if (Array.isArray(receivablesData)) setReceivables(receivablesData);
      }
      if (resCommissions.ok) {
        const commissionsData = await resCommissions.json();
        if (Array.isArray(commissionsData)) setCommissions(commissionsData);
      }
      if (resDiscounts.ok) {
        const discountsData = await resDiscounts.json();
        if (Array.isArray(discountsData)) setDiscountRules(discountsData);
      }
      if (resSettings.ok) {
        const settingsData = await resSettings.json();
        if (settingsData) setCompanySettings(settingsData);
      }
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

      let currentRoles = rolesList;
      try {
        const resRoles = await fetch("/api/roles");
        if (resRoles.ok) {
          const rolesData = await resRoles.json();
          if (Array.isArray(rolesData) && rolesData.length > 0) {
            currentRoles = rolesData;
            setRolesList(rolesData);
          }
        }
      } catch {}

      const landingRoute = getDefaultRouteForUser(data.user, currentRoles);
      try {
        window.history.replaceState(null, "", landingRoute);
      } catch {}

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
    setProducts(products.map(p => (p && p.sku === sku ? { ...p, ...updatedPayload } : p)));

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(sku)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.sku) {
          setProducts(products.map(p => (p && p.sku === sku ? { ...p, ...updated } : p)));
        }
      }
    } catch (err) {
      console.error("Error al actualizar producto en backend:", err);
    }
  };

  const handleUpdateQuoteStatus = async (id: string, status: 'Pendiente' | 'Aceptada' | 'Rechazada' | string) => {
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: status as any } : q));
    try {
      await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error("Error al actualizar estado de cotización:", err);
    }
  };

  const handleAddProduct = async (product: Product) => {
    setProducts([...products.filter(p => p && p.sku !== product.sku), product]);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const created = await res.json();
        if (created && created.sku) {
          setProducts(products.map(p => (p && p.sku === created.sku ? created : p)));
        }
      }
    } catch (err) {
      console.error("Error al registrar producto en backend:", err);
    }
  };

  const handleRefreshProducts = async (updatedProducts?: Product[]) => {
    if (Array.isArray(updatedProducts) && updatedProducts.length > 0) {
      setProducts(updatedProducts);
    }
    await fetchBaselineData();
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

  const handleUpdateExpenseStatus = async (id: string, approvalStatus: "Pendiente" | "Aprobado" | "Observado") => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, approvalStatus } : e));
  };

  const handleAddUser = async (user: Omit<User, "id">) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        const created = await res.json();
        setUsers([...users, created]);
        return;
      }
    } catch (e) {
      console.warn("Error calling /api/users, fallback to local:", e);
    }
    const newUser: User = { ...user, id: `USR-${Date.now()}` };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
    try {
      await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.warn("Error updating user via /api/users:", e);
    }
  };

  const handleSyncNow = async () => {
    if (offlinePendingQuotes.length === 0) return 0;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const count = offlinePendingQuotes.length;
    // Move all offline quotes to main quotes and clear offline queue
    setQuotes([...offlinePendingQuotes, ...quotes]);
    setOfflinePendingQuotes([]);
    return count;
  };

  const handleAddTravelBudget = (budget: import('./types').TravelBudget) => {
    setTravelBudgets([budget, ...travelBudgets]);
  };

  const handleAddDiscountRule = async (rule: import('./types').DiscountRule) => {
    setDiscountRules([rule, ...discountRules]);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule)
      });
      if (res.ok) {
        const created = await res.json();
        setDiscountRules([created, ...discountRules.filter(r => r.id !== rule.id)]);
      }
    } catch (err) {
      console.error("Error guardando regla de descuento:", err);
    }
  };

  const handleUpdateDiscountRule = async (id: string, updates: Partial<import('./types').DiscountRule>) => {
    setDiscountRules(discountRules.map(r => r.id === id ? { ...r, ...updates } : r));
    try {
      await fetch(`/api/discounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error("Error actualizando regla de descuento:", err);
    }
  };

  const handleDeleteDiscountRule = async (id: string) => {
    setDiscountRules(discountRules.filter(r => r.id !== id));
    try {
      await fetch(`/api/discounts/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Error eliminando regla de descuento:", err);
    }
  };

  const handleAddCommission = async (comm: import('./types').Commission) => {
    setCommissions([comm, ...commissions]);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comm)
      });
      if (res.ok) {
        const created = await res.json();
        setCommissions([created, ...commissions]);
      }
    } catch (err) {
      console.error("Error guardando comisión en API:", err);
    }
  };

  const handleUpdateCommissionStatus = async (id: string, status: 'Pagado' | 'Pendiente') => {
    const updatedList = commissions.map(c => c.id === id ? { ...c, status } : c);
    setCommissions(updatedList);
    try {
      await fetch(`/api/commissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error("Error actualizando estado de comisión:", err);
    }
  };

  const handleDeleteCommission = async (id: string) => {
    const updatedList = commissions.filter(c => c.id !== id);
    setCommissions(updatedList);
    try {
      await fetch(`/api/commissions/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Error eliminando comisión:", err);
    }
  };
  
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const handleSaveQuote = async (quotePayload: Omit<Quote, "id" | "date"> & { paymentType?: "Contado" | "Crédito"; validityDays?: number }): Promise<Quote | null> => {
    setQuoteError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...quotePayload, advisorRole: currentUser?.role, region: regionActual })
      });
      if (res.ok) {
        const created: Quote = await res.json();
        setQuotes([created, ...quotes]);
        return created;
      }

      // El servidor recalcula cada linea y rechaza precios fuera de politica.
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && Array.isArray(data.desviaciones)) {
        const detalle = data.desviaciones
          .map((d: any) => `${d.sku}: S/${Number(d.enviado).toFixed(2)}recibido, S/${Number(d.autorizado).toFixed(2)}autorizado`)
          .join("|");
        setQuoteError(`Precio fuera de la politica descuentos.${detalle}`);
      } else {
        setQuoteError(data.error || "No se pudo guardar la cotizacion.");
      }
      return null;
    } catch (e) {
      console.error(e);
      setQuoteError("No se pudo guardar la cotizacion.");
      return null;
    }
  };

  const handleRegisterPayment = async (invoiceId: string, amount: number, registeredBy: string, paymentDate?: string) => {
    try {
      const res = await fetch(`/api/receivables/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, registeredBy, paymentDate })
      });
      if (res.ok) {
        const updated = await res.json();
        // Si el crédito se canceló, removerlo o actualizarlo
        if (updated.creditStatus === "Cancelado") {
          setReceivables(receivables.filter(r => r.id !== invoiceId));
        } else {
          setReceivables(receivables.map(r => r.id === invoiceId ? updated : r));
        }

        // Si se canceló el crédito, el backend libera la comisión del vendedor: refrescamos comisiones
        try {
          const resComm = await fetch("/api/commissions");
          if (resComm.ok) {
            const commData = await resComm.json();
            setCommissions(commData);
          }
        } catch (commErr) {
          console.warn("Error refrescando comisiones tras pago de crédito:", commErr);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvoiceIssued = async (inv: IssuedInvoice) => {
    // 1. Refrescar cotizaciones para que la cotización aparezca como Facturada
    try {
      const resQuotes = await fetch("/api/quotes");
      if (resQuotes.ok) {
        const quotesData = await resQuotes.json();
        setQuotes(quotesData);
      }
    } catch (qErr) {
      console.warn("Error refrescando cotizaciones:", qErr);
    }

    // 2. Refrescar comisiones para que aparezca la comisión generada
    try {
      const resComm = await fetch("/api/commissions");
      if (resComm.ok) {
        const commData = await resComm.json();
        setCommissions(commData);
      }
    } catch (cErr) {
      console.warn("Error refrescando comisiones:", cErr);
    }

    // 3. Si fue al crédito, refrescar cuentas por cobrar
    if (inv.payment_type && inv.payment_type.startsWith("Crédito")) {
      try {
        const resRec = await fetch("/api/receivables");
        if (resRec.ok) {
          const recData = await resRec.json();
          setReceivables(recData);
        }
      } catch (rErr) {
        console.warn("Error refrescando cuentas por cobrar:", rErr);
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-soft/40 rounded-full blur-[140px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <motion.div initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="flex justify-center mb-5">
            <ChohoLogo size="lg" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-center text-2xl font-bold text-ink tracking-tight font-display">
            Portal Comercial B2B
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-1.5 text-center text-xs text-ink-muted font-medium max-w-sm mx-auto">
            Acceso seguro a cotizaciones, telemetría y catálogo Choho.
          </motion.p>
        </div>

        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }} className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-surface border border-line shadow-card py-7 px-5 sm:rounded-2xl sm:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand to-brand/60" />
            
            <form className="space-y-5 relative" onSubmit={handleLogin}>
              <div>
                <label htmlFor="login-email" className="label">Correo Electrónico Corporativo</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-ink-subtle" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="field appearance-none block pl-10 h-10 text-xs"
                    placeholder="usuario@choho.pe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="label">Contraseña de Acceso</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-ink-subtle" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="field appearance-none block pl-10 h-10 text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} className="rounded-xl bg-danger-soft p-3 border border-danger/20">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-danger-fg shrink-0" />
                      <div className="text-xs font-semibold text-danger-fg">{loginError}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn-primary w-full h-10 text-xs font-semibold"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <FolderSync className="w-4 h-4 animate-spin" /> Verificando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Iniciar Sesión
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
          <Route 
            path="/" 
            element={
              userPermissions.dashboard ? (
                <AnalyticsDashboard
                  products={products}
                  quotes={quotes}
                  expenses={expenses}
                  currentUser={currentUser}
                  telemetryList={telemetry}
                  commissions={commissions}
                  receivables={receivables}
                  users={users}
                />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/seller-dashboard" 
            element={
              <SellerDashboard
                currentUser={currentUser}
                quotes={quotes}
                telemetryList={telemetry}
                commissions={commissions}
                receivables={receivables}
                products={products}
                users={users}
              />
            } 
          />
          <Route 
            path="/catalog" 
            element={
              userPermissions.catalog ? (
                <Catalog products={products} categorias={categorias} onSelectProduct={setSelectedProduct} onQuickAdd={(p) => handleAddToBudget({ sku: p.sku, name: p.name, qty: 1, price: p.basePrice })} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/inventory" 
            element={
              (userPermissions.inventory || userPermissions.purchases) ? (
                <InventoryManager products={products} categorias={categorias} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onRefreshProducts={handleRefreshProducts} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/picking" 
            element={
              userPermissions.picking ? (
                <PickingManager />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/shipping-guides" 
            element={
              userPermissions.shippingGuides ? (
                <ShippingGuideManager />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/cart" 
            element={
              userPermissions.quotes ? (
                <BudgetGenerator budgetItems={budgetItems} onUpdateQty={handleUpdateCartQty} onRemoveItem={handleRemoveCartItem} onClearBudget={handleClearBudget} onSaveQuote={handleSaveQuote} currentUserName={currentUser?.name || "Asesor"} region={regionActual} advisorRole={currentUser?.role} errorMsg={quoteError} onClearError={() => setQuoteError(null)} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/quotes" 
            element={
              userPermissions.quotes ? (
                <QuotesList quotes={quotes} onUpdateQuoteStatus={handleUpdateQuoteStatus} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/billing" 
            element={
              userPermissions.billing ? (
                <BillingInvoice
                  quotes={quotes}
                  onUpdateQuoteStatus={handleUpdateQuoteStatus}
                  products={products}
                  onUpdateProduct={handleUpdateProduct}
                  users={users}
                  onInvoiceIssued={handleInvoiceIssued}
                />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/travel-budgets" 
            element={
              userPermissions.travelBudgets ? (
                <TravelBudgets budgets={travelBudgets} onAddBudget={handleAddTravelBudget} expenses={expenses} currentUserName={currentUser?.name || "Administración"} currentUserRole={currentUser?.role} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/discounts" 
            element={
              userPermissions.discounts ? (
                <DiscountManager 
                  rules={discountRules} 
                  products={products}
                  onAddRule={handleAddDiscountRule} 
                  onUpdateRule={handleUpdateDiscountRule}
                  onDeleteRule={handleDeleteDiscountRule}
                />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/commissions" 
            element={
              userPermissions.commissions ? (
                <Commissions commissions={commissions} onAddCommission={handleAddCommission} onUpdateCommissionStatus={handleUpdateCommissionStatus} onDeleteCommission={handleDeleteCommission} quotes={quotes} users={users} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/telemetry" 
            element={
              userPermissions.telemetry ? (
                <RealTimeTelemetry telemetryList={telemetry} onAddVisit={handleAddVisit} currentUserName={currentUser?.name || "Asesor"} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/expenses" 
            element={
              userPermissions.expenses ? (
                <ExpensesManager expensesList={expenses} onAddExpense={handleAddExpense} onUpdateExpenseStatus={handleUpdateExpenseStatus} currentUserName={currentUser?.name || "Asesor"} travelBudgets={travelBudgets} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/receivables" 
            element={
              userPermissions.receivables ? (
                <AccountsReceivable receivables={receivables} currentUserName={currentUser?.name || "Admin"} onRegisterPayment={handleRegisterPayment} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/sync" 
            element={
              userPermissions.sync ? (
                <SyncCenter isOfflineMode={isOfflineMode} onToggleOffline={() => setIsOfflineMode(!isOfflineMode)} onSyncNow={handleSyncNow} localOfflineCount={offlinePendingQuotes.length} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              userPermissions.admin ? (
                <AdminPanel currentUser={currentUser} users={users} products={products} categorias={categorias} onCategoriasChanged={setCategorias} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onUpdateProduct={handleUpdateProduct} onRolesUpdated={(roles) => setRolesList(roles)} />
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            } 
          />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>

        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            advisorRole={currentUser?.role}
            region={regionActual}
            onClose={() => setSelectedProduct(null)}
            onAddToBudget={handleAddToBudget}
          />
        )}
      </Layout>
    </BrowserRouter>
  );
}
