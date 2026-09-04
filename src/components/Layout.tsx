import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Package,
  Menu,
  X,
  Sun,
  Moon,
  Boxes,
  Truck,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore, getUserPermissions } from "../store/useAppStore";
import { ChohoLogo } from "./ChohoLogo";
import { NotificationCenter } from "./NotificationCenter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    theme,
    toggleTheme,
    currentUser,
    isOfflineMode,
    rolesList,
    budgetItems,
    offlinePendingQuotes,
    setIsLoggedIn,
    setCurrentUser
  } = useAppStore();

  const userPermissions = getUserPermissions(currentUser, rolesList);

  const handleLogout = () => {
    localStorage.removeItem("choho_user");
    localStorage.removeItem("choho_token");
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const isActive = (path: string) => location.pathname === path;
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/": return "Sales & Performance Report";
      case "/catalog": return "Catálogo de Repuestos & Transmisión";
      case "/inventory": return "Control de Inventario & Almacén";
      case "/cart": return "Generador de Presupuestos Comercial";
      case "/quotes": return "Historial de Cotizaciones de Campo";
      case "/billing": return "Facturación Electrónica SUNAT";
      case "/telemetry": return "Geolocalización & Visitas de Campo";
      case "/expenses": return "Sustento & Rendición de Viáticos SUNAT";
      case "/sync": return "Centro de Sincronización de Datos";
      case "/admin": return "Administración de Usuarios y Sedes";
      default: return "";
    }
  };

  if (!currentUser) return <>{children}</>;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar Left Navigation (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 shrink-0 shadow-xs">
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <ChohoLogo size="sm" showTagline={true} />
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOfflineMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
              title={isOfflineMode ? "Memoria Local" : "Base de Datos Conectada"}
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 rounded-2xl space-y-0.5 text-left relative group">
            <div className="text-[10px] text-[#E51920] dark:text-red-400 font-extrabold uppercase tracking-wide">
              {currentUser.role}
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.name}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sede: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser.branch}</span></div>
          </div>

          {/* Menú Principal */}
          <div className="space-y-1.5 text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">Menú Principal</div>
            <nav className="space-y-1">
              {userPermissions.dashboard && (
                <Link to="/" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Cuadro de Mando</span>
                </Link>
              )}
              {userPermissions.catalog && (
                <Link to="/catalog" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/catalog") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Catálogo de Repuestos</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Módulos Comerciales */}
          {(userPermissions.inventory || userPermissions.quotes || userPermissions.billing || userPermissions.telemetry || userPermissions.expenses || userPermissions.purchases || userPermissions.receivables) && (
            <div className="space-y-1.5 text-left pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">Módulos Comerciales</div>
              <nav className="space-y-1">
                {userPermissions.inventory && (
                  <Link to="/inventory" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/inventory") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <Boxes className="w-4 h-4" />
                    <span>Control de Inventario</span>
                  </Link>
                )}
                {userPermissions.quotes && (
                  <>
                    <Link to="/cart" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${isActive("/cart") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                      <div className="flex items-center gap-3"><FileText className="w-4 h-4" /><span>Crear Presupuesto</span></div>
                      {budgetItems.length > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive("/cart") ? "bg-white text-[#E51920]" : "bg-amber-500 text-slate-950"}`}>{budgetItems.length}</span>
                      )}
                    </Link>
                    <Link to="/quotes" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/quotes") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                      <FileText className="w-4 h-4" /><span>Mis Cotizaciones</span>
                    </Link>
                  </>
                )}
                {userPermissions.billing && (
                  <Link to="/billing" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/billing") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <Receipt className="w-4 h-4" /><span>Facturación SUNAT</span>
                  </Link>
                )}
                {userPermissions.telemetry && (
                  <Link to="/telemetry" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/telemetry") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <Compass className="w-4 h-4" /><span>Check-ins de Campo</span>
                  </Link>
                )}
                {userPermissions.expenses && (
                  <Link to="/expenses" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/expenses") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <Receipt className="w-4 h-4" /><span>Sustento de Viáticos</span>
                  </Link>
                )}
                {userPermissions.purchases && (
                  <Link to="/purchases" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/purchases") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <Truck className="w-4 h-4" /><span>Compras y Recepción</span>
                  </Link>
                )}
                {userPermissions.receivables && (
                  <Link to="/receivables" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/receivables") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                    <DollarSign className="w-4 h-4" /><span>Cuentas por Cobrar</span>
                  </Link>
                )}
              </nav>
            </div>
          )}

          {/* Sistema & Ajustes */}
          <div className="space-y-1.5 text-left pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">Sistema & Ajustes</div>
            <nav className="space-y-1">
              {userPermissions.sync && (
                <Link to="/sync" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${isActive("/sync") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                  <div className="flex items-center gap-3"><Cloud className="w-4 h-4" /><span>Sincronización</span></div>
                  {offlinePendingQuotes.length > 0 && <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">{offlinePendingQuotes.length}</span>}
                </Link>
              )}
              {userPermissions.admin && (
                <Link to="/admin" className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${isActive("/admin") ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"}`}>
                  <Users className="w-4 h-4" /><span>Administrar Sistema</span>
                </Link>
              )}
            </nav>
          </div>
        </div>

        <div className="shrink-0 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-left">
          <button onClick={handleLogout} className="w-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-2.5 transition-all cursor-pointer">
            <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
        <header className="h-16 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer">
                <Menu className="w-5 h-5" />
              </button>
              <ChohoLogo size="sm" showTagline={false} />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                {getPageTitle()}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Miércoles, 27 de Agosto de 2026</span>
            </div>
            {isOfflineMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase font-mono">
                MODO_OFFLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs">
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
            <NotificationCenter />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-28 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Nav Dock */}
      <div className="mobile-bottom-dock md:hidden fixed bottom-0 inset-x-0 z-40 px-2 py-1.5 flex items-center justify-around border-t border-slate-800/80 bg-slate-950">
        {userPermissions.catalog && (
          <Link to="/catalog" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/catalog") ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"}`}>
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Catálogo</span>
          </Link>
        )}
        {userPermissions.quotes && (
          <Link to="/cart" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/cart") ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"}`}>
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Cotizar</span>
          </Link>
        )}
        {userPermissions.billing && (
          <Link to="/billing" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/billing") ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"}`}>
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Facturas</span>
          </Link>
        )}
        {userPermissions.inventory && (
          <Link to="/inventory" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/inventory") ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"}`}>
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Inventario</span>
          </Link>
        )}
        {userPermissions.telemetry && (
          <Link to="/telemetry" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/telemetry") ? "text-cyan-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"}`}>
            <MapPin className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-sans font-medium">Visitas</span>
          </Link>
        )}
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md md:hidden flex justify-start" onClick={() => setIsMobileMenuOpen(false)}>
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="w-4/5 max-w-xs h-full bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between overflow-y-auto" onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <ChohoLogo size="sm" showTagline={false} />
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-3 bg-slate-900/80 mt-4 border border-slate-800 rounded-xl space-y-1 text-left">
                  <div className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
               </div>

               {/* Mobile Menu Links */}
               <nav className="flex-1 overflow-y-auto mt-4 space-y-2 pb-4">
                  {userPermissions.dashboard && (
                    <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <LayoutDashboard className="w-5 h-5" /> <span className="text-sm font-semibold">Dashboard</span>
                    </Link>
                  )}
                  {userPermissions.expenses && (
                    <Link to="/expenses" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <Receipt className="w-5 h-5" /> <span className="text-sm font-semibold">Viáticos</span>
                    </Link>
                  )}
                  {userPermissions.purchases && (
                    <Link to="/purchases" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <Truck className="w-5 h-5" /> <span className="text-sm font-semibold">Compras</span>
                    </Link>
                  )}
                  {userPermissions.receivables && (
                    <Link to="/receivables" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <DollarSign className="w-5 h-5" /> <span className="text-sm font-semibold">Cuentas por Cobrar</span>
                    </Link>
                  )}
                  {userPermissions.sync && (
                    <Link to="/sync" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <Cloud className="w-5 h-5" /> <span className="text-sm font-semibold">Sincronización</span>
                    </Link>
                  )}
                  {userPermissions.admin && (
                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <Users className="w-5 h-5" /> <span className="text-sm font-semibold">Admin Panel</span>
                    </Link>
                  )}
               </nav>

               <div className="mt-auto pt-4 border-t border-slate-800 shrink-0">
                <button onClick={handleLogout} className="w-full px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-3">
                  <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
                </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
