import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  FileText,
  MapPin,
  ChevronRight,
  ShieldAlert,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Compass,
  MessageCircle,
  Percent,
  Search,
  Filter
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Quote, Telemetry, Commission, Product, User } from "../types";
import { getCommissionBracketInfo } from "./AccountsReceivable";

interface SellerDashboardProps {
  currentUser: User | null;
  quotes: Quote[];
  telemetryList?: Telemetry[];
  commissions?: Commission[];
  receivables?: any[];
  products?: Product[];
  users?: User[];
}

export function SellerDashboard({
  currentUser,
  quotes = [],
  telemetryList = [],
  commissions = [],
  receivables = [],
  products = [],
  users = []
}: SellerDashboardProps) {
  const navigate = useNavigate();

  // Determine if viewer is admin/manager who can inspect any seller
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdminOrManager =
    userRole.includes("admin") ||
    userRole.includes("geren") ||
    userRole.includes("jefe") ||
    userRole.includes("finan");

  // Selected advisor: default to current user
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>(
    currentUser?.name || ""
  );

  // Timeframe filter
  const [timeframe, setTimeframe] = useState<"current_month" | "last_month" | "all">(
    "current_month"
  );
  const [clientFilter, setClientFilter] = useState<"ALL" | "DANGER" | "WARNING" | "ACTIVE">("ALL");
  const [searchClient, setSearchClient] = useState("");

  // List of all sales advisors available for selection
  const salesAdvisors = useMemo(() => {
    const list = users
      .filter((u) => {
        const r = (u.role || "").toLowerCase();
        return (
          r.includes("asesor") ||
          r.includes("venta") ||
          r.includes("comercial") ||
          r.includes("sales")
        );
      })
      .map((u) => u.name);

    // Also collect advisors from quotes
    quotes.forEach((q) => {
      if (q.advisor && !list.includes(q.advisor)) {
        list.push(q.advisor);
      }
    });

    return Array.from(new Set(list));
  }, [users, quotes]);

  const activeAdvisorName = isAdminOrManager
    ? selectedAdvisor || currentUser?.name || "Asesor Comercial"
    : currentUser?.name || "Asesor Comercial";

  // Date references
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

  // Filter quotes for the active advisor
  const advisorQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (!q.advisor) return false;
      return (
        q.advisor.toLowerCase().trim() === activeAdvisorName.toLowerCase().trim()
      );
    });
  }, [quotes, activeAdvisorName]);

  // Current Month Quotes (Accepted / Invoiced)
  const currentMonthAcceptedQuotes = useMemo(() => {
    return advisorQuotes.filter((q) => {
      if (q.status !== "Aceptada" && (q.status as string) !== "Aprobada") return false;
      if (!q.date) return false;
      const d = new Date(q.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [advisorQuotes, currentYear, currentMonth]);

  // Last Month Quotes (Accepted / Invoiced)
  const lastMonthAcceptedQuotes = useMemo(() => {
    return advisorQuotes.filter((q) => {
      if (q.status !== "Aceptada" && (q.status as string) !== "Aprobada") return false;
      if (!q.date) return false;
      const d = new Date(q.date);
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    });
  }, [advisorQuotes, lastMonthYear, lastMonth]);

  // Sales Totals (PEN)
  const currentMonthSales = currentMonthAcceptedQuotes.reduce(
    (acc, q) => acc + Number(q.total || 0),
    0
  );
  const lastMonthSales = lastMonthAcceptedQuotes.reduce(
    (acc, q) => acc + Number(q.total || 0),
    0
  );

  // Month-over-Month growth
  const momGrowth =
    lastMonthSales > 0
      ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100
      : currentMonthSales > 0
      ? 100
      : 0;

  // Advisor Sales Quota / Target (Default S/ 45,000 for Lima, S/ 55,000 for provinces with goals)
  const advisorUserObj = users.find(
    (u) => u.name.toLowerCase() === activeAdvisorName.toLowerCase()
  );
  const advisorZone = advisorUserObj?.salesZone || currentUser?.salesZone || "Zona - Lima";
  const monthlyQuota = advisorZone.includes("Provincia") ? 55000 : 45000;
  const quotaProgress = Math.min(100, (currentMonthSales / monthlyQuota) * 100);

  // Conversion / Win Rate: Accepted vs Total Quotes this month
  const currentMonthAllQuotes = useMemo(() => {
    return advisorQuotes.filter((q) => {
      if (!q.date) return false;
      const d = new Date(q.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [advisorQuotes, currentYear, currentMonth]);

  const winRate =
    currentMonthAllQuotes.length > 0
      ? (currentMonthAcceptedQuotes.length / currentMonthAllQuotes.length) * 100
      : 0;
  const avgTicket =
    currentMonthAcceptedQuotes.length > 0
      ? currentMonthSales / currentMonthAcceptedQuotes.length
      : 0;

  // Advisor Commissions
  const advisorCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (!c.seller) return false;
      return (
        c.seller.toLowerCase().trim() === activeAdvisorName.toLowerCase().trim()
      );
    });
  }, [commissions, activeAdvisorName]);

  const earnedCommissions = advisorCommissions
    .filter((c) => c.status === "Pagado")
    .reduce((acc, c) => acc + Number(c.commission || 0), 0);

  const pendingCommissions = advisorCommissions
    .filter((c) => c.status === "Pendiente")
    .reduce((acc, c) => acc + Number(c.commission || 0), 0);

  // GPS Check-ins / Telemetry of this advisor
  const advisorVisits = useMemo(() => {
    return telemetryList.filter((t) => {
      if (!t.advisor) return false;
      return (
        t.advisor.toLowerCase().trim() === activeAdvisorName.toLowerCase().trim()
      );
    });
  }, [telemetryList, activeAdvisorName]);

  const currentMonthVisits = advisorVisits.filter((t) => {
    if (!t.time) return false;
    const d = new Date(t.time);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const visitTargetMonthly = 40; // Target: 40 field visits per month
  const visitProgress = Math.min(
    100,
    (currentMonthVisits.length / visitTargetMonthly) * 100
  );

  // --------------------------------------------------------------------------
  // CLIENT ACTIVITY / CHURN RISK DETECTOR (Clientes Enfriados)
  // --------------------------------------------------------------------------
  interface ClientHealth {
    name: string;
    doc: string;
    phone?: string;
    address?: string;
    lastInteractionDate: Date;
    daysSinceLastContact: number;
    lastType: "VISITA_GPS" | "COTIZACION" | "COMPRA";
    totalHistoricalSales: number;
    status: "ACTIVE" | "WARNING" | "DANGER";
  }

  const clientHealthList: ClientHealth[] = useMemo(() => {
    const clientsMap: { [key: string]: ClientHealth } = {};

    // 1. Process all quotes of this advisor
    advisorQuotes.forEach((q) => {
      const clientKey = (q.clientDoc || q.clientName || "").trim().toUpperCase();
      if (!clientKey) return;

      const qDate = q.date ? new Date(q.date) : new Date(0);
      const isAccepted =
        q.status === "Aceptada" || (q.status as string) === "Aprobada";
      const totalAmount = isAccepted ? Number(q.total || 0) : 0;

      if (!clientsMap[clientKey]) {
        clientsMap[clientKey] = {
          name: q.clientName || clientKey,
          doc: q.clientDoc || "-",
          phone: q.clientPhone,
          address: q.clientAddress,
          lastInteractionDate: qDate,
          daysSinceLastContact: 0,
          lastType: isAccepted ? "COMPRA" : "COTIZACION",
          totalHistoricalSales: totalAmount,
          status: "ACTIVE"
        };
      } else {
        clientsMap[clientKey].totalHistoricalSales += totalAmount;
        if (qDate > clientsMap[clientKey].lastInteractionDate) {
          clientsMap[clientKey].lastInteractionDate = qDate;
          clientsMap[clientKey].lastType = isAccepted ? "COMPRA" : "COTIZACION";
          if (q.clientPhone && !clientsMap[clientKey].phone) {
            clientsMap[clientKey].phone = q.clientPhone;
          }
          if (q.clientAddress && !clientsMap[clientKey].address) {
            clientsMap[clientKey].address = q.clientAddress;
          }
        }
      }
    });

    // 2. Process all GPS visits of this advisor
    advisorVisits.forEach((v) => {
      const clientKey = (v.client || "").trim().toUpperCase();
      if (!clientKey) return;
      const vDate = v.time ? new Date(v.time) : new Date(0);

      if (!clientsMap[clientKey]) {
        clientsMap[clientKey] = {
          name: v.client,
          doc: "-",
          address: v.address,
          lastInteractionDate: vDate,
          daysSinceLastContact: 0,
          lastType: "VISITA_GPS",
          totalHistoricalSales: 0,
          status: "ACTIVE"
        };
      } else {
        if (vDate > clientsMap[clientKey].lastInteractionDate) {
          clientsMap[clientKey].lastInteractionDate = vDate;
          clientsMap[clientKey].lastType = "VISITA_GPS";
          if (v.address && !clientsMap[clientKey].address) {
            clientsMap[clientKey].address = v.address;
          }
        }
      }
    });

    // 3. Compute days since last contact and health category
    const list = Object.values(clientsMap).map((c) => {
      const diffMs = Math.max(0, now.getTime() - c.lastInteractionDate.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      c.daysSinceLastContact = days;

      if (days <= 15) {
        c.status = "ACTIVE";
      } else if (days <= 30) {
        c.status = "WARNING";
      } else {
        c.status = "DANGER";
      }
      return c;
    });

    // Sort by days without contact DESC (highest risk on top)
    return list.sort((a, b) => b.daysSinceLastContact - a.daysSinceLastContact);
  }, [advisorQuotes, advisorVisits, now]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clientHealthList.filter((c) => {
      const matchStatus = clientFilter === "ALL" || c.status === clientFilter;
      const q = searchClient.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.doc.includes(q) ||
        (c.address || "").toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [clientHealthList, clientFilter, searchClient]);

  const dangerClientsCount = clientHealthList.filter((c) => c.status === "DANGER").length;
  const warningClientsCount = clientHealthList.filter((c) => c.status === "WARNING").length;
  const activeClientsCount = clientHealthList.filter((c) => c.status === "ACTIVE").length;

  // --------------------------------------------------------------------------
  // RECEIVABLES AT RISK (Créditos por vencer en tramo de comisión 45 días)
  // --------------------------------------------------------------------------
  const advisorReceivables = useMemo(() => {
    return receivables.filter((r) => {
      // Find if this invoice belongs to a quote of this advisor
      const matchingQuote = advisorQuotes.find((q) => q.id === r.quote_id || q.id === r.id);
      return Boolean(matchingQuote);
    });
  }, [receivables, advisorQuotes]);

  // Invoices nearing day 45 limit (between day 35 and 50)
  const urgentCollections = useMemo(() => {
    return advisorReceivables
      .map((r) => {
        const bracket = getCommissionBracketInfo(r.date);
        return {
          ...r,
          bracket
        };
      })
      .filter((r) => (r.creditDueAmount || r.total) > 0)
      .sort((a, b) => b.bracket.days - a.bracket.days);
  }, [advisorReceivables]);

  // --------------------------------------------------------------------------
  // PRODUCT MIX FOR CHOHO CORE REPUESTOS
  // --------------------------------------------------------------------------
  const categoryBreakdown = useMemo(() => {
    const map: { [cat: string]: { units: number; amount: number } } = {
      "Cadenas de Transmisión": { units: 0, amount: 0 },
      "Piñones y Catalinas": { units: 0, amount: 0 },
      "Frenos (Pastillas/Zapatas)": { units: 0, amount: 0 },
      "Otros Repuestos": { units: 0, amount: 0 }
    };

    currentMonthAcceptedQuotes.forEach((q) => {
      q.items?.forEach((it) => {
        const name = (it.name || "").toUpperCase();
        const sku = (it.sku || "").toUpperCase();
        const qty = Number(it.qty || 0);
        const subtotal = qty * Number(it.price || 0);

        if (name.includes("CADENA") || sku.includes("428") || sku.includes("520")) {
          map["Cadenas de Transmisión"].units += qty;
          map["Cadenas de Transmisión"].amount += subtotal;
        } else if (name.includes("PIÑON") || name.includes("CATALINA") || name.includes("ARRASTRE")) {
          map["Piñones y Catalinas"].units += qty;
          map["Piñones y Catalinas"].amount += subtotal;
        } else if (name.includes("PASTILLA") || name.includes("ZAPATA") || name.includes("FRENO")) {
          map["Frenos (Pastillas/Zapatas)"].units += qty;
          map["Frenos (Pastillas/Zapatas)"].amount += subtotal;
        } else {
          map["Otros Repuestos"].units += qty;
          map["Otros Repuestos"].amount += subtotal;
        }
      });
    });

    return map;
  }, [currentMonthAcceptedQuotes]);

  return (
    <div className="space-y-6 text-left">
      {/* HEADER & ADVISOR SELECTOR */}
      <div className="bg-surface border border-line rounded-3xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-brand/10 dark:bg-brand/20 text-brand-fg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-micro font-extrabold text-ink-subtle uppercase tracking-wider">
                Panel Comercial del Vendedor
              </span>
              <h2 className="text-xl font-black text-ink font-display leading-tight">
                Métricas de Rendimiento & Cartera
              </h2>
            </div>
          </div>
          <p className="text-xs text-ink-muted mt-1.5 flex items-center gap-2">
            <span>Asesor: <strong className="text-ink">{activeAdvisorName}</strong></span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full text-micro font-bold bg-brand/10 text-brand-fg border border-brand/20">
              {advisorZone}
            </span>
            <span>•</span>
            <span className="text-ink-subtle">
              {now.toLocaleDateString("es-PE", { month: "long", year: "numeric" }).toUpperCase()}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Asesor para Administradores y Gerencia */}
          {isAdminOrManager && salesAdvisors.length > 0 && (
            <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-xl px-2.5 py-1.5">
              <span className="text-micro font-extrabold text-ink-subtle uppercase">Asesor:</span>
              <select
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="bg-transparent text-xs font-bold text-ink focus-visible:outline-none cursor-pointer"
              >
                {salesAdvisors.map((adv) => (
                  <option key={adv} value={adv}>
                    {adv}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            to="/cart"
            className="btn-primary px-3.5 py-2 text-xs flex items-center gap-2 font-bold shadow-sm shadow-brand/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Crear Presupuesto</span>
          </Link>
        </div>
      </div>

      {/* 4 CORE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Ventas del Mes vs Mes Anterior */}
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-ink-subtle text-micro font-extrabold uppercase tracking-wider mb-1">
              <span>Ventas del Mes</span>
              <DollarSign className="w-4 h-4 text-brand-fg" />
            </div>
            <div className="text-2xl font-black font-mono text-ink mt-0.5">
              S/ {currentMonthSales.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            
            {/* MoM Comparison */}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
              {momGrowth >= 0 ? (
                <span className="inline-flex items-center text-success-fg bg-success-soft px-1.5 py-0.5 rounded-md text-micro font-mono">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{momGrowth.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center text-danger-fg bg-danger-soft px-1.5 py-0.5 rounded-md text-micro font-mono">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {momGrowth.toFixed(1)}%
                </span>
              )}
              <span className="text-micro text-ink-subtle">
                vs mes anterior (S/ {lastMonthSales.toFixed(0)})
              </span>
            </div>
          </div>

          {/* Progress bar towards monthly quota */}
          <div className="mt-3.5 pt-3 border-t border-line">
            <div className="flex justify-between text-micro font-bold mb-1">
              <span className="text-ink-subtle">Meta: S/ {monthlyQuota.toLocaleString()}</span>
              <span className="font-mono text-brand-fg">{quotaProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-500 rounded-full"
                style={{ width: `${quotaProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Estimador de Comisiones ("Mi Bolsillo") */}
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-ink-subtle text-micro font-extrabold uppercase tracking-wider mb-1">
              <span>Mi Bolsillo (Comisiones)</span>
              <Award className="w-4 h-4 text-success-fg" />
            </div>
            <div className="text-2xl font-black font-mono text-success-fg mt-0.5">
              S/ {earnedCommissions.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-micro text-ink-muted">Comisiones liberadas por cobranzas</span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-line flex items-center justify-between text-xs">
            <span className="text-ink-subtle text-micro">Por Cobrar en Cartera:</span>
            <span className="font-mono font-bold text-ink text-xs">
              S/ {pendingCommissions.toFixed(2)}
            </span>
          </div>
        </div>

        {/* KPI 3: Tasa de Conversión & Ticket Promedio */}
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-ink-subtle text-micro font-extrabold uppercase tracking-wider mb-1">
              <span>Efectividad de Cotización</span>
              <Percent className="w-4 h-4 text-brand-fg" />
            </div>
            <div className="text-2xl font-black font-mono text-ink mt-0.5">
              {winRate.toFixed(0)}% <span className="text-xs font-normal text-ink-subtle font-sans">cerradas</span>
            </div>
            <span className="text-micro text-ink-muted">
              {currentMonthAcceptedQuotes.length} de {currentMonthAllQuotes.length} cotizaciones aprobadas
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-line flex items-center justify-between text-xs">
            <span className="text-ink-subtle text-micro">Ticket Promedio:</span>
            <span className="font-mono font-bold text-ink text-xs">
              S/ {avgTicket.toFixed(2)}
            </span>
          </div>
        </div>

        {/* KPI 4: Visitas de Campo GPS (Ruteo) */}
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-ink-subtle text-micro font-extrabold uppercase tracking-wider mb-1">
              <span>Check-ins GPS en Ruta</span>
              <Compass className="w-4 h-4 text-brand-fg" />
            </div>
            <div className="text-2xl font-black font-mono text-ink mt-0.5">
              {currentMonthVisits.length} <span className="text-xs font-normal text-ink-subtle font-sans">visitas</span>
            </div>
            <span className="text-micro text-ink-muted">Registros geolocalizados en el mes</span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-line">
            <div className="flex justify-between text-micro font-bold mb-1">
              <span className="text-ink-subtle">Meta mensual: {visitTargetMonthly} visitas</span>
              <span className="font-mono text-brand-fg">{visitProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-500 rounded-full"
                style={{ width: `${visitProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CORE FEATURE: SEMÁFORO DE CLIENTES ENFRIADOS / EN RIESGO DE ABANDONO */}
      <div className="bg-surface border border-line rounded-3xl shadow-xs overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning-fg" />
              <h3 className="text-base font-extrabold text-ink font-display">
                Semáforo de Clientes: Alerta de Inactividad & Abandono
              </h3>
            </div>
            <p className="text-xs text-ink-subtle mt-0.5">
              Identifica qué clientes y talleres de tu cartera llevan tiempo sin visita ni pedidos para evitar su pérdida.
            </p>
          </div>

          {/* Quick Badges Filter */}
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setClientFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-micro font-extrabold cursor-pointer transition-colors ${
                clientFilter === "ALL"
                  ? "bg-surface text-ink shadow-2xs"
                  : "text-ink-subtle hover:text-ink"
              }`}
            >
              Todos ({clientHealthList.length})
            </button>
            <button
              type="button"
              onClick={() => setClientFilter("DANGER")}
              className={`px-3 py-1 rounded-lg text-micro font-extrabold cursor-pointer transition-colors flex items-center gap-1 ${
                clientFilter === "DANGER"
                  ? "bg-danger-soft text-danger-fg shadow-2xs border border-danger/30"
                  : "text-danger-fg/70 hover:text-danger-fg"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>&gt;30d En Riesgo ({dangerClientsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setClientFilter("WARNING")}
              className={`px-3 py-1 rounded-lg text-micro font-extrabold cursor-pointer transition-colors ${
                clientFilter === "WARNING"
                  ? "bg-warning-soft text-warning-fg shadow-2xs border border-warning/30"
                  : "text-warning-fg/70 hover:text-warning-fg"
              }`}
            >
              16-30d ({warningClientsCount})
            </button>
            <button
              type="button"
              onClick={() => setClientFilter("ACTIVE")}
              className={`px-3 py-1 rounded-lg text-micro font-extrabold cursor-pointer transition-colors ${
                clientFilter === "ACTIVE"
                  ? "bg-success-soft text-success-fg shadow-2xs border border-success/30"
                  : "text-success-fg/70 hover:text-success-fg"
              }`}
            >
              Al Día ({activeClientsCount})
            </button>
          </div>
        </div>

        {/* Search Bar for Clients */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-subtle" />
          <input
            type="text"
            placeholder="Buscar por nombre de cliente, RUC o dirección..."
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-line rounded-xl text-xs font-medium text-ink focus-visible:outline-none"
          />
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-2 text-ink-subtle font-extrabold uppercase font-mono tracking-wider border-b border-line">
              <tr>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Cliente / Negocio</th>
                <th className="py-2.5 px-3">Días Sin Contacto</th>
                <th className="py-2.5 px-3">Última Interacción</th>
                <th className="py-2.5 px-3 text-right">Compras Acumuladas</th>
                <th className="py-2.5 px-3 text-center">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium text-ink">
              {filteredClients.slice(0, 10).map((c, i) => {
                const isDanger = c.status === "DANGER";
                const isWarning = c.status === "WARNING";

                return (
                  <tr key={i} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 px-3">
                      {isDanger ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-extrabold bg-danger-soft text-danger-fg border border-danger/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Crítico (+{c.daysSinceLastContact}d)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-extrabold bg-warning-soft text-warning-fg border border-warning/30">
                          <Clock className="w-3 h-3" />
                          <span>Enfriando ({c.daysSinceLastContact}d)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-extrabold bg-success-soft text-success-fg border border-success/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Al Día ({c.daysSinceLastContact}d)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-[240px]">
                      <div className="font-bold text-ink truncate">{c.name}</div>
                      <div className="text-micro font-mono text-ink-subtle flex items-center gap-2">
                        <span>RUC: {c.doc}</span>
                        {c.address && <span className="truncate max-w-[120px]">• {c.address}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-sm">
                      <span className={isDanger ? "text-danger-fg" : isWarning ? "text-warning-fg" : "text-success-fg"}>
                        {c.daysSinceLastContact} días
                      </span>
                    </td>
                    <td className="py-3 px-3 text-ink-muted whitespace-nowrap">
                      <div className="font-mono text-xs">
                        {c.lastInteractionDate.getFullYear() > 1970
                          ? c.lastInteractionDate.toLocaleDateString("es-PE")
                          : "Sin registros"}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-ink-subtle">
                        {c.lastType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-ink">
                      S/ {c.totalHistoricalSales.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {c.phone && (
                          <a
                            href={`https://wa.me/51${c.phone.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(c.name)},%20te%20saluda%20${encodeURIComponent(activeAdvisorName)}%20de%20CHOHO%20Perú.%20¿Cómo%20vas%20con%20el%20stock%20de%20cadenas%20y%20repuestos?`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-line bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors"
                            title="Contactar por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          to="/cart"
                          className="px-2 py-1 rounded-lg text-micro font-bold border border-brand/20 bg-brand/10 hover:bg-brand hover:text-brand-contrast text-brand-fg transition-all flex items-center gap-1"
                          title="Crear Nueva Cotización"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Cotizar</span>
                        </Link>
                        <Link
                          to="/telemetry"
                          className="px-2 py-1 rounded-lg text-micro font-bold border border-line bg-surface hover:bg-surface-2 text-ink transition-colors flex items-center gap-1"
                          title="Registrar Visita GPS"
                        >
                          <MapPin className="w-3 h-3 text-ink-subtle" />
                          <span>Visitar</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-subtle">
                    No se encontraron clientes para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TWO COLUMNS: PREVENTIVE COLLECTIONS ALERT & CHOHO CORE PRODUCT MIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Alerta Preventiva de Cobranza (Comisiones en riesgo) */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-warning-fg" />
              <div>
                <h4 className="font-bold text-xs text-ink font-display">
                  Alerta Preventiva de Cobranza (Tramo 45 Días)
                </h4>
                <p className="text-micro text-ink-subtle">
                  Cobra antes del día 45 para asegurar tu comisión del 4%
                </p>
              </div>
            </div>
            <Link to="/receivables" className="text-micro font-bold text-brand-fg hover:underline flex items-center gap-1">
              <span>Ver Cuentas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {urgentCollections.slice(0, 5).map((r, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface-2 border border-line rounded-2xl flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-ink">{r.clientName || "Cliente"}</div>
                  <div className="text-micro font-mono text-ink-subtle">
                    Doc: {r.id} • Emisión: {r.date ? new Date(r.date).toLocaleDateString("es-PE") : "-"}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-ink">
                    S/ {Number(r.creditDueAmount || r.total || 0).toFixed(2)}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-micro font-extrabold border ${r.bracket.badgeClass}`}>
                    {r.bracket.days}d ({r.bracket.rate}% com.)
                  </span>
                </div>
              </div>
            ))}

            {urgentCollections.length === 0 && (
              <div className="py-8 text-center text-ink-subtle text-xs">
                <CheckCircle2 className="w-6 h-6 text-success-fg mx-auto mb-1 opacity-70" />
                <span>No tienes facturas pendientes de cobro en tu cartera.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Mix de Productos Estrella CHOHO */}
        <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-fg" />
              <div>
                <h4 className="font-bold text-xs text-ink font-display">
                  Mix de Ventas CHOHO (Foco Estratégico)
                </h4>
                <p className="text-micro text-ink-subtle">
                  Proporción de productos core vendidos en el mes
                </p>
              </div>
            </div>
            <span className="text-micro font-mono text-ink-subtle">
              Total: S/ {currentMonthSales.toFixed(0)}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(categoryBreakdown).map(([category, rawStats]) => {
              const stats = rawStats as { units: number; amount: number };
              const pct = currentMonthSales > 0 ? (stats.amount / currentMonthSales) * 100 : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-ink">{category}</span>
                    <div className="font-mono text-xs">
                      <span className="font-bold text-ink">S/ {stats.amount.toFixed(2)}</span>
                      <span className="text-ink-subtle ml-1.5 font-normal">({stats.units} und • {pct.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
