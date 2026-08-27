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
  FolderSync,
  Package,
  Menu,
  X
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
    return (localStorage.getItem("choho_theme") as "dark" | "light") || "light";
  });

  useEffect(() => {
    localStorage.setItem("choho_theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark", "dark-theme");
      document.body.classList.add("dark", "dark-theme");
    } else {
      root.classList.remove("dark", "dark-theme");
      document.body.classList.remove("dark", "dark-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  // Authentication states with localStorage persistence
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem("choho_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem("choho_user") && localStorage.getItem("choho_token"));
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      localStorage.setItem("choho_user", JSON.stringify(data.user));
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
    localStorage.removeItem("choho_user");
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
              backgroundColor: "var(--bg-main)",
              backgroundImage:
                "radial-gradient(circle at 10% 20%, rgba(59, 82, 246, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)"
            }}
          >
            {/* Top theme toggle button on login screen */}
            <div className="absolute top-6 right-6">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm flex items-center gap-2 text-xs font-medium"
                title="Cambiar Tema"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
                <span className="capitalize">{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
              </button>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden">
              {/* Brand Header */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <ChohoLogo size="lg" />
                <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 font-bold px-3.5 py-1 rounded-full text-xs font-display shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Plataforma Comercial B2B
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ingresa con tus credenciales corporativas de Choho Perú
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                    Correo Corporativo
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="usuario@choho.pe"
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                    Clave de Acceso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/25 active:scale-[0.99]"
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
            {/* Sidebar Left Navigation (Desktop Only) */}
            <aside className="hidden md:flex flex-col w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 shrink-0 shadow-xs">
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
                {/* Brand Logo */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
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
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 rounded-2xl space-y-0.5 text-left relative group">
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide">
                    {currentUser?.role}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser?.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Sede: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser?.branch}</span></div>
                </div>

                {/* Navigation Category: MENU */}
                <div className="space-y-1.5 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                    Menú Principal
                  </div>
                  <nav className="space-y-1">
                    {(currentUser?.role === "Admin General" || currentUser?.role === "Jefe de Finanzas") && (
                      <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === "dashboard"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Cuadro de Mando</span>
                      </button>
                    )}

                    <button
                      onClick={() => setActiveTab("catalog")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "catalog"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Catálogo de Repuestos</span>
                    </button>
                  </nav>
                </div>

                {/* Navigation Category: COMMERCIAL */}
                <div className="space-y-1.5 text-left pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                    Módulos Comerciales
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveTab("inventory")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "inventory"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <Boxes className="w-4 h-4" />
                      <span>Control de Inventario</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("cart")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        activeTab === "cart"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4" />
                        <span>Crear Presupuesto</span>
                      </div>
                      {budgetItems.length > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeTab === "cart" ? "bg-white text-blue-600" : "bg-amber-500 text-slate-950"
                        }`}>
                          {budgetItems.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab("quotes")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "quotes"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Mis Cotizaciones</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("billing")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "billing"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Facturación SUNAT</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("telemetry")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "telemetry"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      <span>Check-ins de Campo</span>
                    </button>
                  </nav>
                </div>

                {/* Navigation Category: SYSTEM */}
                <div className="space-y-1.5 text-left pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                    Sistema & Ajustes
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveTab("sync")}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        activeTab === "sync"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Cloud className="w-4 h-4" />
                        <span>Sincronización</span>
                      </div>
                      {offlinePendingQuotes.length > 0 && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                          {offlinePendingQuotes.length}
                        </span>
                      )}
                    </button>

                    {currentUser?.role === "Admin General" && (
                      <button
                        onClick={() => setActiveTab("admin")}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                          activeTab === "admin"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>Administrar Sistema</span>
                      </button>
                    )}
                  </nav>
                </div>
              </div>

              {/* Bottom sidebar DealDeck contrast callout card */}
              <div className="shrink-0 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-left">
                <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-2 relative overflow-hidden shadow-lg shadow-slate-900/10">
                  <div className="text-[11px] font-bold flex items-center justify-between">
                    <span>Estado del Sistema</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Choho Perú Enterprise B2B Engine activo.
                  </p>
                  <button
                    onClick={() => setActiveTab("sync")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-xl text-[11px] transition-all cursor-pointer"
                  >
                    Sincronización Pro
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </aside>

            {/* Main Application content frame */}
            <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
              {/* Workspace Navigation Header */}
              <header className="h-16 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  {/* Mobile Brand Logo & Menu Trigger */}
                  <div className="flex items-center gap-2 md:hidden">
                    <button
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer"
                      title="Abrir Menú"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <ChohoLogo size="sm" showTagline={false} />
                  </div>

                  {/* Page Title & Subtitle (Desktop) */}
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                      {activeTab === "dashboard" && "Sales & Performance Report"}
                      {activeTab === "catalog" && "Catálogo de Repuestos & Transmisión"}
                      {activeTab === "inventory" && "Control de Inventario & Almacén"}
                      {activeTab === "cart" && "Generador de Presupuestos Comercial"}
                      {activeTab === "quotes" && "Historial de Cotizaciones de Campo"}
                      {activeTab === "billing" && "Facturación Electrónica SUNAT"}
                      {activeTab === "telemetry" && "Geolocalización & Visitas de Campo"}
                      {activeTab === "sync" && "Centro de Sincronización de Datos"}
                      {activeTab === "admin" && "Administración de Usuarios y Sedes"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Miércoles, 27 de Agosto de 2026
                    </span>
                  </div>

                  {isOfflineMode && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase font-mono">
                      MODO_OFFLINE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  {/* Theme Toggle Button in Header */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
                    title="Cambiar Tema (Oscuro / Claro)"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-blue-600" />
                    )}
                  </button>

                  {/* Push simulation center */}
                  <NotificationCenter />
                </div>
              </header>

              {/* Tab views with scrollbar wrapper & mobile bottom dock padding */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-28 md:pb-6">
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
                    currentUser={currentUser}
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

      {/* Mobile App Bottom Navigation Dock (Native App Style) */}
      {currentUser && (
        <div className="mobile-bottom-dock md:hidden fixed bottom-0 inset-x-0 z-40 px-2 py-1.5 flex items-center justify-around border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === "catalog" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Catálogo</span>
            {activeTab === "catalog" && (
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-0.5 shadow-sm shadow-cyan-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("cart")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === "cart" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5" />
              {budgetItems.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {budgetItems.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 font-sans font-medium">Cotizar</span>
            {activeTab === "cart" && (
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-0.5 shadow-sm shadow-cyan-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === "billing" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Facturas</span>
            {activeTab === "billing" && (
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-0.5 shadow-sm shadow-cyan-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === "inventory" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Inventario</span>
            {activeTab === "inventory" && (
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-0.5 shadow-sm shadow-cyan-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === "telemetry" ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Visitas</span>
            {activeTab === "telemetry" && (
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-0.5 shadow-sm shadow-cyan-400" />
            )}
          </button>
        </div>
      )}

      {/* Mobile Slide-Over Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md md:hidden flex justify-start"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-4/5 max-w-xs h-full bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-5">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <ChohoLogo size="sm" showTagline={false} />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Info Card */}
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1 text-left">
                  <div className="text-[9px] text-cyan-400 font-bold font-mono uppercase">
                    {currentUser?.role}
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
                  <div className="text-[9px] text-slate-400 mt-1">Sede: {currentUser?.branch}</div>
                </div>

                {/* Mobile Drawer Links */}
                <nav className="space-y-1 text-left">
                  {(currentUser?.role === "Admin General" || currentUser?.role === "Jefe de Finanzas") && (
                    <button
                      onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "dashboard" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      <span>Cuadro de Mando</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveTab("catalog"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === "catalog" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <span>Catálogo y Productos</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("inventory"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === "inventory" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>Control de Inventario</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("cart"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      activeTab === "cart" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>Crear Presupuesto</span>
                    </div>
                    {budgetItems.length > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {budgetItems.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { setActiveTab("quotes"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === "quotes" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Mis Cotizaciones</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("billing"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === "billing" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-cyan-400" />
                    <span>Facturación SUNAT</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("telemetry"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === "telemetry" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Visitas de Campo</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("sync"); setIsMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === "sync" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    <span>Sincronización</span>
                  </button>

                  {currentUser?.role === "Admin General" && (
                    <button
                      onClick={() => { setActiveTab("admin"); setIsMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        activeTab === "admin" ? "bg-cyan-500/15 text-cyan-400" : "text-slate-300"
                      }`}
                    >
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>Administrar Sistema</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Logout button */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="w-full px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
