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
import { InventoryManager } from "./components/InventoryManager";
import { ChohoLogo } from "./components/ChohoLogo";
import { Sun, Moon, Boxes } from "lucide-react";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("choho_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("choho_theme", theme);
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

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
    "dashboard" | "catalog" | "inventory" | "cart" | "quotes" | "billing" | "telemetry" | "sync" | "admin"
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

  // Add new product
  const handleAddProduct = async (productPayload: Product) => {
    if (!isOfflineMode) {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar el producto");
      }
      const added = await res.json();
      setProducts((prev) => [added, ...prev]);
    } else {
      setProducts((prev) => [productPayload, ...prev]);
    }
  };

  // Update full product data (stock, price, description, images, name, category)
  const handleUpdateProduct = async (sku: string, updatedPayload: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, ...updatedPayload } : p))
    );

    if (!isOfflineMode) {
      try {
        const res = await fetch(`/api/products/${sku}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPayload)
        });
        if (res.ok) {
          const updatedRow = await res.json();
          setProducts((prev) =>
            prev.map((p) => (p.sku === sku ? { ...p, ...updatedRow } : p))
          );
        }
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
    <div className="min-h-screen transition-colors duration-300 flex flex-col font-sans" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          /* High-Fidelity Login Interface */
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center p-4 min-h-screen relative"
            style={{
              backgroundImage:
                "radial-gradient(circle at top left, rgba(6, 182, 212, 0.12) 0%, transparent 40%), radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.08) 0%, transparent 50%)"
            }}
          >
            {/* Top theme toggle button on login screen */}
            <div className="absolute top-6 right-6">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-amber-400 transition-all cursor-pointer shadow-lg flex items-center gap-2 text-xs font-semibold"
                title="Cambiar Tema"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span className="text-slate-300 capitalize">{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
              </button>
            </div>

            <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
              {/* Brand Header */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <ChohoLogo size="lg" />
                <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold px-3 py-1 rounded-full text-xs font-display">
                  <Sparkles className="w-3.5 h-3.5" />
                  Plataforma Comercial B2B
                </div>
                <p className="text-xs text-slate-400">
                  Ingresa con tus credenciales corporativas de Choho Perú
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-950/30 border border-red-800/60 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] text-slate-400 uppercase font-mono block">
                    Correo Corporativo
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="rmendoza@choho.pe"
                      className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] text-slate-400 uppercase font-mono block">
                    Clave de Acceso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando credenciales...</span>
                    </>
                  ) : (
                    <span>Iniciar Sesión Comercial</span>
                  )}
                </button>
              </form>

              {/* Demo accounts helper cards */}
              <div className="pt-4 border-t border-slate-700/50 space-y-2.5 text-left">
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  Cuentas de prueba rápida (Clave: 123)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    onClick={() => {
                      setLoginEmail("rmendoza@choho.pe");
                      setLoginPassword("123");
                    }}
                    className="p-2 bg-slate-950/60 border border-slate-700/60 hover:border-amber-500/60 rounded-xl text-slate-400 text-left transition-all truncate cursor-pointer"
                  >
                    <div className="font-semibold text-slate-200">R. Mendoza</div>
                    <div className="text-[9px] text-amber-400">Asesor Comercial Trujillo</div>
                  </button>
                  <button
                    onClick={() => {
                      setLoginEmail("lcastro@choho.pe");
                      setLoginPassword("123");
                    }}
                    className="p-2 bg-slate-950/60 border border-slate-700/60 hover:border-cyan-500/60 rounded-xl text-slate-400 text-left transition-all truncate cursor-pointer"
                  >
                    <div className="font-semibold text-slate-200">L. Castro</div>
                    <div className="text-[9px] text-cyan-400">Admin General Lima</div>
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
            <aside className="w-full md:w-64 glass-panel border-b md:border-b-0 md:border-r border-slate-700/50 flex flex-col justify-between p-4 shrink-0">
              <div className="space-y-6">
                {/* Brand Logo */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <ChohoLogo size="sm" showTagline={false} />

                  {/* Mobile responsive indicator */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOfflineMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    }`}
                    title={isOfflineMode ? "Memoria Local" : "Base de Datos Conectada"}
                  />
                </div>

                {/* User Card info */}
                <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-1 text-left relative group">
                  <div className="text-[9px] text-cyan-400 font-bold font-mono uppercase">
                    {currentUser?.role}
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
                  <div className="text-[9px] text-slate-400 mt-1">Sede: {currentUser?.branch}</div>
                </div>

                {/* Navigation Links list */}
                <nav className="space-y-1.5 text-left">
                  {(currentUser?.role === "Admin General" || currentUser?.role === "Jefe de Finanzas") && (
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === "dashboard"
                          ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                          : "text-slate-400 hover:text-slate-100"
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
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Catálogo y Productos</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("inventory")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "inventory"
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span>Control de Inventario</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("cart")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      activeTab === "cart"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4" />
                      <span>Crear Presupuesto</span>
                    </div>
                    {budgetItems.length > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {budgetItems.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("quotes")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "quotes"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Mis Cotizaciones</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("billing")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "billing"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Facturación SUNAT</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("telemetry")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "telemetry"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Check-ins de Campo</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("sync")}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      activeTab === "sync"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "text-slate-400 hover:text-slate-100"
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
                          ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                          : "text-slate-400 hover:text-slate-100"
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
                    className="w-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold">Subir cambios locales</span>
                    <FolderSync className="w-3.5 h-3.5 animate-spin" />
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>

            {/* Main Application content frame */}
            <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
              {/* Workspace Navigation Header */}
              <header className="h-14 border-b border-slate-700/50 px-6 flex items-center justify-between shrink-0 glass-panel">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider font-display" style={{ color: 'var(--text-main)' }}>
                    {activeTab === "dashboard" && "Panel Administrativo / Analíticas"}
                    {activeTab === "catalog" && "Catálogo de Repuestos y Transmisión"}
                    {activeTab === "inventory" && "Control de Inventario y Registro de Productos"}
                    {activeTab === "cart" && "Generador de Presupuestos Comerciales"}
                    {activeTab === "quotes" && "Historial de Cotizaciones de Campo"}
                    {activeTab === "billing" && "Facturación Electrónica SUNAT"}
                    {activeTab === "telemetry" && "Geolocalización y Visitas de Campo"}
                    {activeTab === "sync" && "Centro de Sincronización de Datos"}
                    {activeTab === "admin" && "Panel de Administración"}
                  </span>

                  {isOfflineMode && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase font-mono">
                      MODO_OFFLINE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Theme Toggle Button in Header */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl border border-slate-700/60 bg-slate-900/40 hover:bg-slate-800 text-amber-400 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                    title="Cambiar Tema (Oscuro / Claro)"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                  </button>

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

                {activeTab === "inventory" && (
                  <InventoryManager
                    products={products}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
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
                    onUpdateProduct={handleUpdateProduct}
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
