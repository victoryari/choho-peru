import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Users,
  Receipt,
  Cloud,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Sparkles,
  RefreshCw,
  Lock,
  Mail,
  ShieldAlert,
  SlidersHorizontal,
  FolderSync
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Product, Quote, QuoteItem, Telemetry } from "./types";
import { NotificationCenter } from "./components/NotificationCenter";
import { Catalog } from "./components/Catalog";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { BudgetGenerator } from "./components/BudgetGenerator";
import { QuotesList } from "./components/QuotesList";
import { BillingInvoice } from "./components/BillingInvoice";
import { RealTimeTelemetry } from "./components/RealTimeTelemetry";
import { SyncCenter } from "./components/SyncCenter";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState("rmendoza@choho.pe");
  const [loginPassword, setLoginPassword] = useState("123");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Core Data Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);

  // Local active shopping budget cart
  const [budgetItems, setBudgetItems] = useState<QuoteItem[]>([]);
  const [offlinePendingQuotes, setOfflinePendingQuotes] = useState<Quote[]>([]);

  // UI Navigation Toggles
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "catalog" | "cart" | "quotes" | "billing" | "telemetry" | "sync" | "admin"
  >("catalog");

  // Selection modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync / Offline states
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Load baseline data from Express full-stack backend
  const fetchBaselineData = async () => {
    if (isOfflineMode) return;
    try {
      const [resProducts, resQuotes, resUsers, resTelemetry] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/quotes"),
        fetch("/api/users"),
        fetch("/api/telemetry")
      ]);

      if (resProducts.ok) setProducts(await resProducts.json());
      if (resQuotes.ok) setQuotes(await resQuotes.json());
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resTelemetry.ok) setTelemetry(await resTelemetry.json());
    } catch (err) {
      console.error("Error loading baseline fullstack data, entering offline grace mode:", err);
    }
  };

  useEffect(() => {
    fetchBaselineData();
  }, [isOfflineMode]);

  // Handle Auth submission
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
      setCurrentUser(data.user);
      setIsLoggedIn(true);

      // Boot application tab based on access role
      if (data.user.role === "Admin General" || data.user.role === "Jefe de Finanzas") {
        setActiveTab("dashboard");
      } else {
        setActiveTab("catalog");
      }
    } catch (err: any) {
      setLoginError(err.message || "Usuario o clave inválida. Revisa los datos de prueba.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("choho_token");
    setCurrentUser(null);
    setIsLoggedIn(false);
    setBudgetItems([]);
  };

  // Budget cart items controls
  const handleAddToBudget = (product: Product, qty: number, customPrice: number) => {
    setBudgetItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.sku === product.sku);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].qty += qty;
        updated[existingIdx].price = customPrice;
        return updated;
      } else {
        return [...prev, { sku: product.sku, name: product.name, qty, price: customPrice }];
      }
    });
  };

  const handleQuickAdd = (product: Product) => {
    handleAddToBudget(product, 1, product.basePrice);
  };

  const handleUpdateCartQty = (sku: string, qty: number) => {
    setBudgetItems((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, qty } : item))
    );
  };

  const handleRemoveCartItem = (sku: string) => {
    setBudgetItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const handleClearBudget = () => {
    setBudgetItems([]);
  };

  // Submit / Save completed quote
  const handleSaveQuote = async (quotePayload: Omit<Quote, "id" | "date">) => {
    const generatedId = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuote: Quote = {
      ...quotePayload,
      id: generatedId,
      date: new Date().toISOString().split("T")[0]
    };

    if (isOfflineMode) {
      // Save locally to synchronization queue
      setOfflinePendingQuotes((prev) => [newQuote, ...prev]);
      setQuotes((prev) => [newQuote, ...prev]);
    } else {
      // Direct full-stack call to express service
      try {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newQuote)
        });
        if (res.ok) {
          const added = await res.json();
          setQuotes((prev) => [added, ...prev]);
        }
      } catch (err) {
        console.error("Backend quote save failed, queuing offline:", err);
        setOfflinePendingQuotes((prev) => [newQuote, ...prev]);
        setQuotes((prev) => [newQuote, ...prev]);
      }
    }
  };

  // Update status of quote
  const handleUpdateQuoteStatus = async (id: string, status: 'Pendiente' | 'Aceptada' | 'Rechazada') => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status } : q))
    );

    if (!isOfflineMode) {
      try {
        await fetch(`/api/quotes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
      } catch (err) {
        console.error("Failed to update status on central server:", err);
      }
    }
  };

  // Create user
  const handleAddUser = async (userPayload: Omit<User, "id">) => {
    const id = `CH-${Math.floor(10000 + Math.random() * 90000)}`;
    const newUser = { ...userPayload, id };

    if (!isOfflineMode) {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser)
        });
        if (res.ok) {
          const added = await res.json();
          setUsers((prev) => [...prev, added]);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
    setUsers((prev) => [...prev, newUser]);
  };

  // Toggle user active status
  const handleUpdateUser = async (id: string, updated: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
    );

    if (!isOfflineMode) {
      try {
        await fetch(`/api/users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Add visit check-in
  const handleAddVisit = async (visitPayload: Omit<Telemetry, "id">) => {
    const id = `T-0${telemetry.length + 1}`;
    const newVisit = { ...visitPayload, id };
    setTelemetry((prev) => [newVisit, ...prev]);
  };

  // Update product price & stocks
  const handleUpdateProductStock = async (sku: string, newStock: number, newPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, stock: newStock, basePrice: newPrice } : p))
    );

    if (!isOfflineMode) {
      try {
        await fetch(`/api/products/${sku}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock: newStock, basePrice: newPrice })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Synchronize memory cache back online
  const handleSyncNow = async (): Promise<number> => {
    if (offlinePendingQuotes.length === 0) return 0;

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localQuotes: offlinePendingQuotes })
      });

      if (res.ok) {
        const data = await res.json();
        setOfflinePendingQuotes([]);
        // Re-align quotes
        if (data.db?.quotes) {
          setQuotes(data.db.quotes);
        }
        return data.syncCount || 0;
      }
    } catch (err) {
      console.error("Automatic cloud synchronization failed:", err);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-200 flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          /* High-Fidelity Login Interface with beautiful Space/Tech accents */
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center p-4 min-h-screen"
            style={{
              backgroundImage:
                "radial-gradient(circle at top left, rgba(14, 165, 233, 0.08) 0%, transparent 40%), radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.03) 0%, transparent 50%)"
            }}
          >
            <div className="w-full max-w-md bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
              {/* Sleek brand banner */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold px-3 py-1 rounded-full text-xs font-display">
                  <Sparkles className="w-3.5 h-3.5" />
                  Módulo de Gestión Comercial
                </div>
                <h1 className="text-2xl font-bold font-display text-white tracking-tight pt-1">
                  CHOHO <span className="text-sky-400 font-extrabold font-sans">PERU</span>
                </h1>
                <p className="text-xs text-gray-500">
                  Ingresa con tus credenciales corporativas autorizadas
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-sky-950/25 border border-sky-900/60 text-sky-400 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">
                    Correo de Red Corporativa
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="rmendoza@choho.pe"
                      className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] text-gray-400 uppercase font-mono block">
                      Clave de Acceso
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Iniciando sesión segura...</span>
                    </>
                  ) : (
                    <span>Iniciar Sesión Segura</span>
                  )}
                </button>
              </form>

              {/* Demo accounts helper cards */}
              <div className="pt-4 border-t border-slate-700/50 space-y-2.5 text-left">
                <div className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">
                  Cuentas de prueba rápida (Clave: 123)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    onClick={() => {
                      setLoginEmail("rmendoza@choho.pe");
                      setLoginPassword("123");
                    }}
                    className="p-1.5 bg-[#0F172A] border border-slate-700/50 hover:border-slate-600 rounded-lg text-gray-400 text-left transition-all truncate cursor-pointer"
                  >
                    <div className="font-semibold text-gray-300">R. Mendoza</div>
                    <div>Asesor Trujillo</div>
                  </button>
                  <button
                    onClick={() => {
                      setLoginEmail("lcastro@choho.pe");
                      setLoginPassword("123");
                    }}
                    className="p-1.5 bg-[#0F172A] border border-slate-700/50 hover:border-slate-600 rounded-lg text-gray-400 text-left transition-all truncate cursor-pointer"
                  >
                    <div className="font-semibold text-gray-300">L. Castro</div>
                    <div>Administrador General</div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Application Workspace with Sidebar + Responsive main container */
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden"
          >
            {/* Sidebar Left Navigation */}
            <aside className="w-full md:w-64 bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col justify-between p-4 shrink-0">
              <div className="space-y-6">
                {/* Brand Logo */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center font-bold font-sans text-white">
                      CH
                    </div>
                    <span className="font-bold text-sm tracking-tight text-white font-display">
                      CHOHO PERU
                    </span>
                  </div>

                  {/* Mobile responsive indicator */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOfflineMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    }`}
                    title={isOfflineMode ? "Memoria Local" : "Base de Datos Conectada"}
                  />
                </div>

                {/* User Card info */}
                <div className="p-3 bg-[#0F172A] border border-slate-700/50 rounded-xl space-y-1 text-left relative group">
                  <div className="text-[9px] text-sky-400 font-bold font-mono uppercase">
                    {currentUser?.role}
                  </div>
                  <div className="text-xs font-bold text-gray-200 truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{currentUser?.email}</div>
                  <div className="text-[9px] text-gray-500 mt-1">Sede: {currentUser?.branch}</div>
                </div>

                {/* Navigation Links list */}
                <nav className="space-y-1.5 text-left">
                  {(currentUser?.role === "Admin General" || currentUser?.role === "Jefe de Finanzas") && (
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === "dashboard"
                          ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Cuadro de Mando</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("catalog")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "catalog"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Catálogo de Repuestos y Accesorios</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("cart")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      activeTab === "cart"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4" />
                      <span>Crear Presupuesto</span>
                    </div>
                    {budgetItems.length > 0 && (
                      <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {budgetItems.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("quotes")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "quotes"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Mis Cotizaciones</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("billing")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "billing"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Facturación SUNAT</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("telemetry")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "telemetry"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Check-ins de Campo</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("sync")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      activeTab === "sync"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Cloud className="w-4 h-4" />
                      <span>Sincronización</span>
                    </div>
                    {offlinePendingQuotes.length > 0 && (
                      <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-bounce">
                        {offlinePendingQuotes.length}
                      </span>
                    )}
                  </button>

                  {currentUser?.role === "Admin General" && (
                    <button
                      onClick={() => setActiveTab("admin")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === "admin"
                          ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Administrar Sistema</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Bottom sidebar actions */}
              <div className="pt-4 border-t border-slate-700/50 space-y-3 text-left">
                {/* Sync notification shortcut */}
                {offlinePendingQuotes.length > 0 && (
                  <button
                    onClick={async () => {
                      await handleSyncNow();
                    }}
                    className="w-full bg-amber-600/15 border border-amber-600/30 text-amber-500 text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold">Subir cambios locales</span>
                    <FolderSync className="w-3.5 h-3.5 animate-spin" />
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-xs font-semibold text-gray-500 hover:text-sky-400 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salir de la Cuenta</span>
                </button>
              </div>
            </aside>

            {/* Main Application content frame */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F172A]">
              {/* Workspace Navigation Header */}
              <header className="h-14 border-b border-slate-700/50 px-6 flex items-center justify-between shrink-0 bg-[#0F172A]/80 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wide font-display">
                    {activeTab === "dashboard" && "Panel Administrativo / Analíticas"}
                    {activeTab === "catalog" && "Catálogo de Repuestos y Accesorios"}
                    {activeTab === "cart" && "Generador de Presupuestos Comerciales"}
                    {activeTab === "quotes" && "Historial de Cotizaciones de Campo"}
                    {activeTab === "billing" && "Facturación Electrónica SUNAT"}
                    {activeTab === "telemetry" && "Localización y Visitas de Campo"}
                    {activeTab === "sync" && "Centro de Sincronización"}
                    {activeTab === "admin" && "Panel de Administración"}
                  </span>

                  {isOfflineMode && (
                    <span className="px-2 py-0.5 rounded bg-amber-600/10 border border-amber-600/30 text-amber-500 text-[10px] font-bold uppercase font-mono">
                      OFFLINE_MODE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Push simulation center */}
                  <NotificationCenter />
                </div>
              </header>

              {/* Tab views with scrollbar wrapper */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {activeTab === "dashboard" && (
                  <AnalyticsDashboard products={products} quotes={quotes} />
                )}

                {activeTab === "catalog" && (
                  <Catalog
                    products={products}
                    onSelectProduct={setSelectedProduct}
                    onQuickAdd={handleQuickAdd}
                  />
                )}

                {activeTab === "cart" && (
                  <BudgetGenerator
                    budgetItems={budgetItems}
                    onUpdateQty={handleUpdateCartQty}
                    onRemoveItem={handleRemoveCartItem}
                    onClearBudget={handleClearBudget}
                    onSaveQuote={handleSaveQuote}
                    currentUserName={currentUser?.name || "Asesor"}
                  />
                )}

                {activeTab === "quotes" && (
                  <QuotesList quotes={quotes} onUpdateQuoteStatus={handleUpdateQuoteStatus} />
                )}

                {activeTab === "billing" && (
                  <BillingInvoice quotes={quotes} onUpdateQuoteStatus={handleUpdateQuoteStatus} />
                )}

                {activeTab === "telemetry" && (
                  <RealTimeTelemetry
                    telemetryList={telemetry}
                    onAddVisit={handleAddVisit}
                    currentUserName={currentUser?.name || "Asesor"}
                  />
                )}

                {activeTab === "sync" && (
                  <SyncCenter
                    isOfflineMode={isOfflineMode}
                    onToggleOffline={() => setIsOfflineMode(!isOfflineMode)}
                    onSyncNow={handleSyncNow}
                    localOfflineCount={offlinePendingQuotes.length}
                  />
                )}

                {activeTab === "admin" && (
                  <AdminPanel
                    users={users}
                    products={products}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onUpdateProductStock={handleUpdateProductStock}
                  />
                )}
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal overlay */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToBudget={handleAddToBudget}
        />
      )}
    </div>
  );
}
