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
  DollarSign,
  Wallet,
  Tags,
  TrendingUp,
  User,
  Truck,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore, getUserPermissions } from "../store/useAppStore";
import { ChohoLogo } from "./ChohoLogo";
import { NotificationCenter } from "./NotificationCenter";
import { UserProfileModal } from "./UserProfileModal";
import { DeviceBadge } from "./DeviceBadge";
import { useDeviceType } from "../hooks/useDeviceType";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const device = useDeviceType();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("choho_sidebar_collapsed");
      if (saved !== null) return saved === "true";
    } catch {}
    return typeof window !== "undefined" && window.innerWidth < 1200;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("choho_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const {
    theme,
    toggleTheme,
    currentUser,
    isOfflineMode,
    rolesList,
    quotes,
    budgetItems,
    offlinePendingQuotes,
    setIsLoggedIn,
    setCurrentUser
  } = useAppStore();

  const userPermissions = getUserPermissions(currentUser, rolesList);
  const pendingBillingQuotesCount = (quotes || []).filter(q => q && (q.status === 'Aceptada' || (q.status as string) === 'Aprobada')).length;

  const handleLogout = () => {
    localStorage.removeItem("choho_user");
    localStorage.removeItem("choho_token");
    setIsLoggedIn(false);
    setCurrentUser(null);
    try {
      window.history.replaceState(null, "", "/");
    } catch {}
    navigate("/", { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/": return "Sales & Performance Report";
      case "/catalog": return "Catálogo de Repuestos & Transmisión";
      case "/inventory": return "Control de Inventario & Almacén";
      case "/picking": return "Picking & Empaque de Pedidos";
      case "/shipping-guides": return "Guías de Remisión Electrónicas (GRE)";
      case "/kardex": return "Kárdex Físico Multisede & Transferencias";
      case "/cart": return "Generador de Presupuestos Comercial";
      case "/quotes": return "Historial de Cotizaciones Campo";
      case "/billing": return "Facturación Electrónica SUNAT";
      case "/telemetry": return "Geolocalización & Visitas de Campo";
      case "/travel-budgets": return "Caja Chica & Viáticos";
      case "/expenses": return "Sustento & Rendición de Viáticos SUNAT";
      case "/receivables": return "Cuentas por Cobrar";
      case "/discounts": return "Reglas de Descuento Comercial";
      case "/commissions": return "Cálculo de Comisiones";
      case "/sync": return "Centro de Sincronización Datos";
      case "/admin": return "Administración de Usuarios y Sedes";
      default: return "";
    }
  };

  if (!currentUser) return <>{children}</>;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar Left Navigation (Desktop Only) */}
      <aside
        className={`hidden md:flex flex-col h-full bg-surface-2/70 dark:bg-surface border-r border-line p-3 shrink-0 shadow-xs transition-all duration-200 select-none ${
          isSidebarCollapsed ? "w-18" : "w-64"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-4">
          <div
            className={`flex items-center pb-3 border-b border-line gap-2 ${
              isSidebarCollapsed ? "flex-col justify-center" : "justify-between"
            }`}
          >
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2 min-w-0">
                <ChohoLogo size="sm" showTagline={true} />
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isOfflineMode ? "bg-warning animate-pulse" : "bg-success"
                  }`}
                  title={isOfflineMode ? "Memoria Local" : "Base de Datos Conectada"}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center relative my-1">
                <ChohoLogo size="sm" showTagline={false} iconOnly={true} />
                <span
                  className={`w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 ${
                    isOfflineMode ? "bg-warning animate-pulse" : "bg-success"
                  }`}
                  title={isOfflineMode ? "Memoria Local" : "Base de Datos Conectada"}
                />
              </div>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
              title={isSidebarCollapsed ? "Expandir menú completo" : "Colapsar menú (modo tablet amplio)"}
              className="p-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors cursor-pointer shrink-0"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Menú Principal */}
          <div className="space-y-1.5 text-left">
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle px-3 pt-1">
                Menú Principal
              </div>
            ) : (
              <div className="border-t border-line/60 my-2 mx-1" />
            )}
            <nav className="space-y-1">
              {userPermissions.dashboard && (
                <Link
                  to="/"
                  title={isSidebarCollapsed ? "Cuadro de Mando" : undefined}
                  className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                    isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                  } ${
                    isActive("/")
                      ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                      : "text-ink-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Cuadro de Mando</span>}
                </Link>
              )}
              {userPermissions.catalog && (
                <Link
                  to="/catalog"
                  title={isSidebarCollapsed ? "Catálogo de Repuestos" : undefined}
                  className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                    isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                  } ${
                    isActive("/catalog")
                      ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                      : "text-ink-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Catálogo de Repuestos</span>}
                </Link>
              )}
            </nav>
          </div>

          {/* Módulos Comerciales */}
          {(userPermissions.inventory ||
            userPermissions.picking ||
            userPermissions.shippingGuides ||
            userPermissions.quotes ||
            (userPermissions as any).billing ||
            userPermissions.telemetry ||
            userPermissions.expenses ||
            userPermissions.purchases ||
            userPermissions.receivables) && (
            <div className="space-y-1.5 text-left pt-1">
              {!isSidebarCollapsed ? (
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle px-3">
                  Módulos Comerciales
                </div>
              ) : (
                <div className="border-t border-line/60 my-2 mx-1" />
              )}
              <nav className="space-y-1">
                {userPermissions.kardex && (
                  <Link
                    to="/kardex"
                    title={isSidebarCollapsed ? "Kárdex Físico & Transferencias" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/kardex")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Boxes className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Kárdex & Sedes</span>}
                  </Link>
                )}
                {userPermissions.inventory && (
                  <Link
                    to="/inventory"
                    title={isSidebarCollapsed ? "Control de Inventario" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/inventory")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Package className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Control de Inventario</span>}
                  </Link>
                )}
                {userPermissions.picking && (
                  <Link
                    to="/picking"
                    title={isSidebarCollapsed ? "Picking & Empaque" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/picking")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Boxes className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Picking & Empaque</span>}
                  </Link>
                )}
                {userPermissions.shippingGuides && (
                  <Link
                    to="/shipping-guides"
                    title={isSidebarCollapsed ? "Guías de Remisión Electrónicas (GRE)" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/shipping-guides")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Guías de Remisión</span>}
                  </Link>
                )}
                {userPermissions.quotes && (
                  <>
                    <Link
                      to="/cart"
                      title={isSidebarCollapsed ? "Crear Presupuesto" : undefined}
                      className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                        isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3 justify-between"
                      } ${
                        isActive("/cart")
                          ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                          : "text-ink-muted hover:bg-surface hover:text-ink"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate">Crear Presupuesto</span>}
                      </div>
                      {budgetItems.length > 0 && (
                        <span
                          className={`font-bold rounded-full ${
                            isSidebarCollapsed
                              ? "absolute -top-1 -right-1 text-[9px] px-1.5 py-0.2"
                              : "text-micro px-2 py-0.5"
                          } ${isActive("/cart") ? "bg-white/20 text-white" : "bg-warning text-ink"}`}
                        >
                          {budgetItems.length}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/quotes"
                      title={isSidebarCollapsed ? "Mis Cotizaciones" : undefined}
                      className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                        isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                      } ${
                        isActive("/quotes")
                          ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                          : "text-ink-muted hover:bg-surface hover:text-ink"
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate">Mis Cotizaciones</span>}
                    </Link>
                  </>
                )}
                {userPermissions.billing && (
                  <Link
                    to="/billing"
                    title={isSidebarCollapsed ? "Facturación SUNAT" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3 justify-between"
                    } ${
                      isActive("/billing")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt className="w-4 h-4 shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate">Facturación SUNAT</span>}
                    </div>
                    {pendingBillingQuotesCount > 0 && (
                      <span
                        className={`font-bold rounded-full ${
                          isSidebarCollapsed
                            ? "absolute -top-1 -right-1 text-[9px] px-1.5 py-0.2"
                            : "text-micro px-1.5 py-0.5"
                        } ${isActive("/billing") ? "bg-white/20 text-white" : "bg-emerald-500 text-white"}`}
                        title={`${pendingBillingQuotesCount} cotizaciones pendientes`}
                      >
                        {pendingBillingQuotesCount}
                      </span>
                    )}
                  </Link>
                )}
                {userPermissions.telemetry && (
                  <Link
                    to="/telemetry"
                    title={isSidebarCollapsed ? "Check-ins de Campo" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/telemetry")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Check-ins de Campo</span>}
                  </Link>
                )}
                {userPermissions.travelBudgets && (
                  <Link
                    to="/travel-budgets"
                    title={isSidebarCollapsed ? "Caja Chica & Viáticos" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/travel-budgets")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Wallet className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Caja Chica & Viáticos</span>}
                  </Link>
                )}
                {userPermissions.expenses && (
                  <Link
                    to="/expenses"
                    title={isSidebarCollapsed ? "Sustento de Viáticos" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/expenses")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Receipt className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Sustento de Viáticos</span>}
                  </Link>
                )}
                {userPermissions.receivables && (
                  <Link
                    to="/receivables"
                    title={isSidebarCollapsed ? "Cuentas por Cobrar" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/receivables")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Cuentas por Cobrar</span>}
                  </Link>
                )}
                {userPermissions.discounts && (
                  <Link
                    to="/discounts"
                    title={isSidebarCollapsed ? "Reglas de Descuento" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/discounts")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Tags className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Reglas de Descuento</span>}
                  </Link>
                )}
                {userPermissions.commissions && (
                  <Link
                    to="/commissions"
                    title={isSidebarCollapsed ? "Cálculo de Comisiones" : undefined}
                    className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                    } ${
                      isActive("/commissions")
                        ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Cálculo Comisiones</span>}
                  </Link>
                )}
              </nav>
            </div>
          )}

          {/* Sistema & Ajustes */}
          <div className="space-y-1.5 text-left pt-1">
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle px-3">
                Sistema & Ajustes
              </div>
            ) : (
              <div className="border-t border-line/60 my-2 mx-1" />
            )}
            <nav className="space-y-1">
              {userPermissions.sync && (
                <Link
                  to="/sync"
                  title={isSidebarCollapsed ? "Centro de Sincronización" : undefined}
                  className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                    isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3 justify-between"
                  } ${
                    isActive("/sync")
                      ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                      : "text-ink-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Cloud className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">Sincronización</span>}
                  </div>
                  {offlinePendingQuotes.length > 0 && (
                    <span
                      className={`font-bold rounded-full ${
                        isSidebarCollapsed
                          ? "absolute -top-1 -right-1 text-[9px] px-1.5 py-0.2"
                          : "text-micro px-2 py-0.5"
                      } bg-warning text-ink animate-bounce`}
                    >
                      {offlinePendingQuotes.length}
                    </span>
                  )}
                </Link>
              )}
              {userPermissions.admin && (
                <Link
                  to="/admin"
                  title={isSidebarCollapsed ? "Administración de Usuarios y Sedes" : undefined}
                  className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-all cursor-pointer ${
                    isSidebarCollapsed ? "justify-center p-2.5 h-10" : "px-3 py-2 gap-3"
                  } ${
                    isActive("/admin")
                      ? "bg-brand text-brand-contrast shadow-sm shadow-brand/20 font-bold"
                      : "text-ink-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Administrar Sistema</span>}
                </Link>
              )}
            </nav>
          </div>
        </div>

        <div className="shrink-0 pt-3 border-t border-line text-left">
          <button
            type="button"
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Cerrar Sesión" : undefined}
            className={`w-full rounded-xl text-xs font-semibold text-ink-muted hover:text-danger-fg dark:hover:text-brand-fg flex items-center transition-all cursor-pointer ${
              isSidebarCollapsed ? "justify-center p-2.5 h-10 hover:bg-surface" : "px-3 py-2 gap-2.5"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-canvas">
        <header className="h-16 bg-surface/90 dark:bg-surface/85 border-b border-line px-4 md:px-6 flex items-center justify-between shrink-0 backdrop-blur-md z-40 relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Abrir menú de navegación"
                className="p-2 rounded-xl border border-line bg-surface-2 text-ink hover:text-brand-fg cursor-pointer"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
              <ChohoLogo size="sm" showTagline={false} />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-base font-extrabold text-ink font-display">
                {getPageTitle()}
              </span>
              <span className="text-xs text-ink-subtle font-medium">Miércoles, 27 de Agosto de 2026</span>
            </div>
            {isOfflineMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-warning-soft dark:bg-warning/40 border border-warning/30 dark:border-warning/60 text-warning-fg text-xs font-bold uppercase font-mono">
                MODO_OFFLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <DeviceBadge />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              className="btn-secondary p-2"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-warning-fg" aria-hidden="true" /> : <Moon className="w-4 h-4 text-brand-fg" aria-hidden="true" />}
            </button>
            <NotificationCenter />

            {/* Botón de Perfil de Usuario con Avatar */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              aria-label="Perfil de Usuario - Mi Perfil"
              title={`${currentUser.name} (${currentUser.branch || 'Sede Lima'}) - Mi Perfil`}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-brand/10 dark:bg-brand/20 border border-brand/20 flex items-center justify-center text-brand-fg font-extrabold text-micro font-display">
                {currentUser.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0].toUpperCase())
                  .join("") || "CH"}
              </div>
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-ink truncate max-w-[120px]">
                  {currentUser.name.split(" ")[0]}
                </span>
                <span className="text-micro text-ink-subtle truncate max-w-[120px]">
                  {currentUser.branch || "Sede Lima"}
                </span>
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 space-y-5 pb-28 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Nav Dock */}
      <div className="mobile-bottom-dock md:hidden fixed bottom-0 inset-x-0 z-40 px-2 py-1.5 flex items-center justify-around border-t border-line-strong/80 bg-canvas">
        {userPermissions.catalog && (
          <Link to="/catalog" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/catalog") ? "text-brand-fg font-bold scale-105" : "text-ink-subtle hover:text-ink"}`}>
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-sans font-medium">Catálogo</span>
          </Link>
        )}
        {userPermissions.quotes && (
          <Link to="/cart" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/cart") ? "text-brand-fg font-bold scale-105" : "text-ink-subtle hover:text-ink"}`}>
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-sans font-medium">Cotizar</span>
          </Link>
        )}
        {(userPermissions as any).billing && (
          <Link to="/billing" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/billing") ? "text-brand-fg font-bold scale-105" : "text-ink-subtle hover:text-ink"}`}>
            <Receipt className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-sans font-medium">Facturas</span>
          </Link>
        )}
        {userPermissions.inventory && (
          <Link to="/inventory" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/inventory") ? "text-brand-fg font-bold scale-105" : "text-ink-subtle hover:text-ink"}`}>
            <Package className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-sans font-medium">Inventario</span>
          </Link>
        )}
        {userPermissions.telemetry && (
          <Link to="/telemetry" className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all relative cursor-pointer ${isActive("/telemetry") ? "text-brand-fg font-bold scale-105" : "text-ink-subtle hover:text-ink"}`}>
            <MapPin className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-sans font-medium">Visitas</span>
          </Link>
        )}
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs md:hidden flex justify-start" onClick={() => setIsMobileMenuOpen(false)}>
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-4/5 max-w-xs h-full bg-canvas border-r border-line p-5 flex flex-col justify-between overflow-y-auto" onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center justify-between pb-3 border-b border-line">
                  <ChohoLogo size="sm" showTagline={false} />
                  <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg text-ink-subtle hover:text-ink"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-3 bg-surface border border-line rounded-xl space-y-0.5 text-left mt-3 shadow-2xs">
                  <div className="text-xs font-bold text-ink truncate">{currentUser.name}</div>
                  <div className="text-xs text-ink-muted truncate">{currentUser.email}</div>
               </div>

               {/* Mobile Menu Links */}
               <nav className="flex-1 overflow-y-auto mt-4 space-y-1.5 pb-4">
                  {userPermissions.dashboard && (
                    <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <LayoutDashboard className="w-5 h-5" /> <span className="text-sm font-semibold">Dashboard</span>
                    </Link>
                  )}
                  {userPermissions.catalog && (
                    <Link to="/catalog" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <ShoppingBag className="w-5 h-5" /> <span className="text-sm font-semibold">Catálogo</span>
                    </Link>
                  )}
                  {userPermissions.quotes && (
                    <Link to="/quotes" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <FileText className="w-5 h-5" /> <span className="text-sm font-semibold">Cotizaciones</span>
                    </Link>
                  )}
                  {userPermissions.billing && (
                    <Link to="/billing" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <div className="flex items-center gap-3"><Receipt className="w-5 h-5" /> <span className="text-sm font-semibold">Facturación SUNAT</span></div>
                      {pendingBillingQuotesCount > 0 && (
                        <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                          {pendingBillingQuotesCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {userPermissions.inventory && (
                    <Link to="/inventory" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Boxes className="w-5 h-5" /> <span className="text-sm font-semibold">Inventario</span>
                    </Link>
                  )}
                  {userPermissions.telemetry && (
                    <Link to="/telemetry" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Compass className="w-5 h-5" /> <span className="text-sm font-semibold">Check-ins GPS</span>
                    </Link>
                  )}
                  {userPermissions.travelBudgets && (
                    <Link to="/travel-budgets" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Wallet className="w-5 h-5" /> <span className="text-sm font-semibold">Caja Chica & Viáticos</span>
                    </Link>
                  )}
                  {userPermissions.expenses && (
                    <Link to="/expenses" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Receipt className="w-5 h-5" /> <span className="text-sm font-semibold">Sustento de Viáticos</span>
                    </Link>
                  )}
                  {userPermissions.receivables && (
                    <Link to="/receivables" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <DollarSign className="w-5 h-5" /> <span className="text-sm font-semibold">Cuentas por Cobrar</span>
                    </Link>
                  )}
                  {userPermissions.discounts && (
                    <Link to="/discounts" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Tags className="w-5 h-5" /> <span className="text-sm font-semibold">Reglas de Descuento</span>
                    </Link>
                  )}
                  {userPermissions.commissions && (
                    <Link to="/commissions" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <TrendingUp className="w-5 h-5" /> <span className="text-sm font-semibold">Cálculo Comisiones</span>
                    </Link>
                  )}
                  {userPermissions.sync && (
                    <Link to="/sync" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Cloud className="w-5 h-5" /> <span className="text-sm font-semibold">Sincronización</span>
                    </Link>
                  )}
                  {userPermissions.admin && (
                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors">
                      <Users className="w-5 h-5" /> <span className="text-sm font-semibold">Administración</span>
                    </Link>
                  )}
               </nav>

               <div className="mt-auto pt-4 border-t border-line shrink-0 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-2 rounded-xl flex items-center gap-3 transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{currentUser.name}</div>
                    <div className="text-micro text-ink-subtle truncate">Sede: {currentUser.branch || "Lima"}</div>
                  </div>
                </button>
                <button type="button" onClick={handleLogout} className="w-full px-3 py-2 text-xs font-semibold text-danger-fg hover:bg-danger-soft rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
                </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Perfil de Usuario y Cambio de Contraseña */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
      />

    </div>
  );
}
