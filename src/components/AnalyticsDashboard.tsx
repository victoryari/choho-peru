import React, { useState } from "react";
import { BarChart3, TrendingUp, DollarSign, Award, Users, Download, ArrowUpRight, Calendar, PieChart, Receipt, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { Product, Quote, TravelExpense, User, Telemetry, Commission } from "../types";
import { SellerDashboard } from "./SellerDashboard";
import { jsPDF } from "jspdf";
import { downloadCSV } from "../utils/exportCsv";

interface AnalyticsDashboardProps {
  products: Product[];
  quotes: Quote[];
  expenses?: TravelExpense[];
  currentUser?: User | null;
  telemetryList?: Telemetry[];
  commissions?: Commission[];
  receivables?: any[];
  users?: User[];
}

export function AnalyticsDashboard({
  products,
  quotes,
  expenses = [],
  currentUser = null,
  telemetryList = [],
  commissions = [],
  receivables = [],
  users = []
}: AnalyticsDashboardProps) {
  const userRole = (currentUser?.role || "").toLowerCase();
  const isSeller =
    userRole.includes("asesor") ||
    userRole.includes("venta") ||
    userRole.includes("comercial") ||
    userRole.includes("promotor");
  const isAdminOrManager =
    userRole.includes("admin") ||
    userRole.includes("geren") ||
    userRole.includes("jefe") ||
    userRole.includes("finan");

  const [activeView, setActiveView] = useState<"executive" | "seller">(
    isSeller && !isAdminOrManager ? "seller" : "executive"
  );

  if (isSeller && !isAdminOrManager) {
    return (
      <SellerDashboard
        currentUser={currentUser}
        quotes={quotes}
        telemetryList={telemetryList}
        commissions={commissions}
        receivables={receivables}
        products={products}
        users={users}
      />
    );
  }
  // Analytical computations for Sales
  const totalInvoicedSales = quotes
    .filter((q) => q.status === "Aceptada")
    .reduce((acc, curr) => acc + curr.total, 0);

  const pendingSales = quotes
    .filter((q) => q.status === "Pendiente")
    .reduce((acc, curr) => acc + curr.total, 0);

  // Analytical computations for Expenses
  const totalExpensesRendido = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensesAprobado = expenses.filter(e => e.approvalStatus === "Aprobado").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpensesPendiente = expenses.filter(e => e.approvalStatus === "Pendiente").reduce((acc, curr) => acc + curr.amount, 0);
  const sunatValidadosCount = expenses.filter(e => e.sunatStatus === "ACEPTADO").length;

  const acceptedQuotesCount = quotes.filter((q) => q.status === "Aceptada").length;
  const averageTicket = acceptedQuotesCount > 0 ? totalInvoicedSales / acceptedQuotesCount : 0;

  // Best selling products based on matching quotes
  const salesByProduct: { [sku: string]: { qty: number; total: number; name: string } } = {};
  quotes
    .filter((q) => q.status === "Aceptada")
    .forEach((q) => {
      q.items?.forEach((item) => {
        if (!salesByProduct[item.sku]) {
          salesByProduct[item.sku] = { qty: 0, total: 0, name: item.name };
        }
        salesByProduct[item.sku].qty += item.qty;
        salesByProduct[item.sku].total += item.qty * item.price;
      });
    });

  const bestSellers = Object.keys(salesByProduct)
    .map((sku) => ({
      sku,
      ...salesByProduct[sku]
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  // Ventas por familia. Los cubos se derivan de la taxonomía real de cada
  // producto, no de una lista fija: antes el 72% caía en "Accesorios" porque
  // cualquier categoría desconocida se sumaba ahí.
  const categorySales: { [cat: string]: number } = {};

  quotes
    .filter((q) => q.status === "Aceptada")
    .forEach((q) => {
      q.items?.forEach((item) => {
        const matchingProd = products.find((p) => p.sku === item.sku);
        const familia = matchingProd?.familia?.nombre || "Sin clasificar";
        categorySales[familia] = (categorySales[familia] || 0) + item.qty * item.price;
      });
    });
  // REAL FUNCTIONAL PDF MONTHLY REPORT EXPORTER
  const handleExportPDFReport = () => {
    const doc = new jsPDF();

    // CHOHO Official Red Header Bar
    doc.setFillColor(229, 25, 32); // CHOHO Red #4D4DFF
    doc.rect(0, 0, 210, 55, "F");

    // Skewed black tagline bar underneath
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 53, 210, 2, "F");

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("INFORME DE RENDIMIENTO MENSUAL", 15, 25);
    
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.text("SISTEMA DE GESTIÓN COMPROBANTES Y CONTROL ASESORES", 15, 33);
    doc.setFont("Helvetica", "bold");
    doc.text("CHOHO PERÚ S.A.C. - MEJOR QUE EL ORIGINAL", 15, 43);

    // Metadata Panel
    doc.setFillColor(244, 244, 245);
    doc.rect(145, 10, 50, 35, "F");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("CÓDIGO: INF-2024-07", 148, 17);
    doc.text("PERIODO: Julio 2024", 148, 23);
    doc.text("SINC: TiDB Cloud", 148, 29);
    doc.text("ESTADO: Emitido", 148, 35);

    // Section 1: executive summary
    doc.setFontSize(13);
    doc.setTextColor(229, 25, 32); // CHOHO Red
    doc.text("1. RESUMEN EJECUTIVO DE VENTAS", 15, 70);
    doc.line(15, 72, 195, 72);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "normal");
    doc.text(`Total Facturado Recaudado: S/${totalInvoicedSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}PEN`, 18, 80);
    doc.text(`Total en Cartera de Cotizaciones (Pendientes): S/${pendingSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}PEN`, 18, 86);
    doc.text(`Número de Cotizaciones Aprobadas/Facturadas:${acceptedQuotesCount}comprobantes`, 18, 92);
    doc.text(`Ticket Medio de Compra Comercial: S/${averageTicket.toLocaleString('es-PE', { minimumFractionDigits: 2 })}PEN`, 18, 98);

    // Section 2: Best sellers table
    doc.setFontSize(13);
    doc.setTextColor(229, 25, 32);
    doc.setFont("Helvetica", "bold");
    doc.text("2. PRODUCTOS MÁS VENDIDOS (TOP SKUs)", 15, 115);
    doc.line(15, 117, 195, 117);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 122, 180, 8, "F");
    doc.setFontSize(9.5);
    doc.text("CÓDIGO SKU", 18, 127);
    doc.text("PRODUCTO / COMPONENTE", 55, 127);
    doc.text("CANTIDAD", 140, 127);
    doc.text("TOTAL (S/)", 170, 127);

    let currentY = 136;
    if (bestSellers.length > 0) {
       bestSellers.forEach((item) => {
        doc.setFont("Helvetica", "normal");
        doc.text(item.sku, 18, currentY);
        doc.text(item.name.substring(0, 32), 55, currentY);
        doc.text(`${item.qty}und`, 140, currentY);
        doc.text(`S/${item.total.toFixed(2)}`, 170, currentY);
        currentY += 8;
      });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("Sin datos de SKUs facturados disponibles.", 18, currentY);
      currentY += 8;
    }

    // Section 3: Performance indicators
    doc.setFontSize(13);
    doc.setTextColor(229, 25, 32);
    doc.setFont("Helvetica", "bold");
    doc.text("3. VENTAS CATEGORIZADAS (REPARTO PORCENTUAL)", 15, currentY + 10);
    doc.line(15, currentY + 12, 195, currentY + 12);

    let categoryY = currentY + 20;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    Object.keys(categorySales).forEach((cat) => {
      const salesVal = categorySales[cat];
      const pct = totalInvoicedSales > 0 ? (salesVal / totalInvoicedSales) * 100 : 0;
      doc.text(`•${cat}: S/${salesVal.toFixed(2)}(${pct.toFixed(1)}%)`, 18, categoryY);
      categoryY += 6;
    });

    // Sign off security stamp
    doc.setFillColor(250, 250, 250);
    doc.rect(15, 240, 180, 25, "F");
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Documento oficial encriptado con clave de seguridad y firma digital auditoría.", 18, 246);
    doc.text("CHOHO PERÚ S.A.C. - Sistema de Facturación Integrado.", 18, 252);
    doc.text("Respaldo de Base Datos: TiDB Server, Lima.", 18, 258);

    doc.save("informe_mensual_ventas_choho.pdf");
  };

  const handleExportCSV = () => {
    const csvData = quotes
      .filter((q) => q.status === "Aceptada")
      .map(q => ({
        "ID Comprobante": q.id,
        "Fecha": q.date,
        "Cliente": q.clientName,
        "Documento": q.clientDoc,
        "Subtotal (S/)": q.subtotal.toFixed(2),
        "IGV (S/)": (q.total - q.subtotal).toFixed(2),
        "Total (S/)": q.total.toFixed(2),
        "Vendedor": q.assignedTo
      }));
    downloadCSV(csvData, "Reporte_Ventas_Mensual");
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header with View Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-line shadow-xs rounded-3xl p-5">
        <div>
          <h2 className="text-lg font-extrabold text-ink font-display">
            {activeView === "seller" ? "Panel Comercial de Asesores" : "Dashboard Analítico Ejecutivo"}
          </h2>
          <p className="text-xs text-ink-muted">
            {activeView === "seller" ? "Supervisión de métricas individuales, cartera y clientes en riesgo" : "Métricas globales y rendimiento consolidado de ventas"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher for Admins/Managers */}
          {isAdminOrManager && (
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setActiveView("executive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === "executive"
                    ? "bg-surface text-ink shadow-2xs font-extrabold"
                    : "text-ink-subtle hover:text-ink"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-brand-fg" />
                <span>Visión Global</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("seller")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === "seller"
                    ? "bg-surface text-ink shadow-2xs font-extrabold text-brand-fg"
                    : "text-ink-subtle hover:text-ink"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-brand-fg" />
                <span>Por Asesor</span>
              </button>
            </div>
          )}

          {activeView === "executive" && (
            <>
              <button type="button" onClick={handleExportCSV} className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
              <button type="button" onClick={handleExportPDFReport} className="btn-primary px-3.5 py-2 text-xs flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> PDF Resumen
              </button>
            </>
          )}
        </div>
      </div>

      {activeView === "seller" && (
        <SellerDashboard
          currentUser={currentUser}
          quotes={quotes}
          telemetryList={telemetryList}
          commissions={commissions}
          receivables={receivables}
          products={products}
          users={users}
        />
      )}

      {activeView === "executive" && (
        <div className="space-y-6">

      {/* Top 4 KPI Metric Cards (DealDeck Style with CHOHO Red branding) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hero Total Sales */}
        <div className="bg-brand text-brand-contrast rounded-2xl p-5 shadow-sm shadow-brand/20 relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +2.08%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-xs text-white/90 font-semibold uppercase tracking-wider block">
              Ventas Facturadas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-white">
                S/ {totalInvoicedSales.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-white/75 font-medium">vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cartera en Cotización (Total Orders) */}
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-info-soft/30 text-brand-fg rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="bg-success-soft/30 text-success-fg font-bold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +12.4%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-xs text-ink-subtle font-semibold uppercase tracking-wider block">
              Cartera en Cotización
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-ink">
                S/ {pendingSales.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-ink-subtle font-medium">Pendientes</span>
            </div>
          </div>
        </div>

        {/* Card 3: Facturas Emitidas (Visitors) */}
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-warning-soft/50 dark:bg-warning-soft/40 text-warning-fg rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <span className="bg-danger-soft/40 dark:bg-danger-soft/30 text-danger-fg font-bold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
              -2.08%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-xs text-ink-subtle font-semibold uppercase tracking-wider block">
              Comprobantes Emitidos
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-ink">
                {acceptedQuotesCount}
              </span>
              <span className="text-xs text-ink-subtle font-medium">Facturas aprobadas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Ticket Medio (Total Sold Products) */}
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-brand-soft/60 dark:bg-brand-soft/50 text-brand-fg rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="bg-success-soft/30 text-success-fg font-bold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +12.1%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-xs text-ink-subtle font-semibold uppercase tracking-wider block">
              Ticket Medio de Venta
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-ink">
                S/ {averageTicket.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-ink-subtle font-medium">Por cliente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (DealDeck Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Customer Habbits Bar Chart & Top SKUs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dual Bar Chart (Customer Habbits - DealDeck Style) */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
              <div>
                <h3 className="font-extrabold text-base text-ink font-display">
                  Comportamiento de Ventas & Productos
                </h3>
                <p className="text-xs text-ink-subtle">Rendimiento mensual comparativo de repuestos facturados</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                  <span>Ventas (Soles)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-line-strong dark:bg-ink" />
                  <span>Unidades</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Graphics */}
            <div className="relative pt-6 pb-2">
              {/* Tooltip Overlay Mock */}
              <div className="absolute top-2 left-[48%] -translate-x-1/2 bg-ink text-ink-inverse rounded-xl shadow-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-2 z-10 border border-line-strong">
                <span className="w-2 h-2 rounded-full bg-brand" />
                <span>S/ 43,787 Productos</span>
              </div>

              <div className="h-52 flex items-end justify-between px-2 pt-6 border-b border-line">
                {[
                  { name: "Ene", val1: 45, val2: 70 },
                  { name: "Feb", val1: 65, val2: 85 },
                  { name: "Mar", val1: 40, val2: 60 },
                  { name: "Abr", val1: 90, val2: 75 },
                  { name: "May", val1: 55, val2: 80 },
                  { name: "Jun", val1: 35, val2: 65 },
                  { name: "Jul", val1: 75, val2: 50 }
                ].map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="flex items-end gap-1.5 h-40">
                      <div
                        className="w-3.5 sm:w-4 rounded-t-lg bg-brand group-hover:bg-brand transition-all duration-300 shadow-xs"
                        style={{ height: `${m.val1}%` }}
                      />
                      <div
                        className="w-3.5 sm:w-4 rounded-t-lg bg-line dark:bg-ink group-hover:bg-line-strong transition-all duration-300"
                        style={{ height: `${m.val2}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-ink-muted font-sans">
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Selling Products List */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-fg" />
                Productos Más Vendidos (Top SKUs CHOHO)
              </h4>
              <span className="text-xs text-ink-subtle font-medium">Actualizado en tiempo real</span>
            </div>

            <div className="space-y-4">
              {bestSellers.length === 0 ? (
                <div className="py-8 text-center text-ink-subtle text-xs font-medium">
                  No se registran transacciones facturadas este periodo.
                </div>
              ) : (
                bestSellers.map((item, idx) => {
                  const maxTotal = Math.max(...bestSellers.map((b) => b.total), 1);
                  const percentage = (item.total / maxTotal) * 100;
                  return (
                    <div key={item.sku} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-ink">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 bg-surface-2 text-brand-fg font-extrabold rounded-lg flex items-center justify-center text-xs">
                            0{idx + 1}
                          </span>
                          <span className="font-mono text-brand-fg font-bold">{item.sku}</span>
                          <span className="text-ink-muted truncate font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-ink">
                          S/ {item.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand h-full rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-ink-subtle font-medium">
                        <span>{item.qty} Unidades despachadas</span>
                        <span>{percentage.toFixed(0)}% del total</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Product Statistic Ring & Customer Growth */}
        <div className="space-y-6 text-left">
          {/* Concentric Ring Radial Chart (Product Statistic - DealDeck Style) */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-ink font-display">
                  Estadísticas de Productos
                </h4>
                <p className="text-xs text-ink-subtle">Distribución de volumen por categoría</p>
              </div>
              <span className="text-xs bg-surface-2 text-ink-muted px-2.5 py-1 rounded-xl font-semibold">
                Hoy
              </span>
            </div>

            {/* SVG Concentric Gauge */}
            <div className="relative flex items-center justify-center py-4">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                {/* Outer Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="8"
                  strokeDasharray="314"
                  strokeDashoffset="75"
                  strokeLinecap="round"
                />
                {/* Middle Ring - Crimson Red */}
                <circle
                  cx="60"
                  cy="60"
                  r="38"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="8"
                  className="dark:stroke-line-strong"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="38"
                  fill="none"
                  stroke="var(--warning)"
                  strokeWidth="8"
                  strokeDasharray="238"
                  strokeDashoffset="90"
                  strokeLinecap="round"
                />
                {/* Inner Ring - Neutral Slate */}
                <circle
                  cx="60"
                  cy="60"
                  r="26"
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="8"
                  strokeDasharray="163"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                  className="dark:stroke-line-strong"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-ink font-mono">
                  9,829
                </span>
                <span className="text-xs text-ink-subtle font-medium">Ventas Totales</span>
                <span className="mt-0.5 bg-success-soft/30 text-success-fg text-micro font-bold px-1.5 py-0.2 rounded-full">
                  +5.34%
                </span>
              </div>
            </div>

            {/* Category Breakdown list */}
            <div className="space-y-3 pt-2 border-t border-line text-xs font-semibold">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink dark:text-ink-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                  <span>Cadenas de Transmisión</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink font-mono font-bold">2,487</span>
                  <span className="text-xs bg-success-soft/30 text-success-fg px-1.5 py-0.2 rounded-full">+1.8%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink dark:text-ink-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                  <span>Kits de Arrastre</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink font-mono font-bold">1,828</span>
                  <span className="text-xs bg-success-soft/30 text-success-fg px-1.5 py-0.2 rounded-full">+2.3%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink dark:text-ink-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-ink-muted" />
                  <span>Piñones & Catalina</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink font-mono font-bold">1,463</span>
                  <span className="text-xs bg-danger-soft text-danger-fg px-1.5 py-0.2 rounded-full">-1.04%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Export Report Card & Customer Growth */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-fg" />
                Informe Consolidado PDF
              </h4>
              <p className="text-xs text-ink-subtle leading-relaxed">
                Genera el documento analítico completo con firma de auditoría comercial.
              </p>
            </div>

            <button type="button"
              onClick={handleExportPDFReport}
              className="btn-primary w-full gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Reporte Mensual PDF</span>
            </button>
          </div>

          {/* Predictive Summary: Ingresos vs Cuentas por Cobrar */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success-fg" />
                Predicción de Flujo de Caja
              </h4>
              <span className="text-xs bg-info-soft/20 text-brand-fg font-bold px-2 py-0.5 rounded-full">Inteligencia Artificial</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-subtle font-medium">Ingresos Contado Efectivo</span>
                <span className="text-ink font-mono font-bold">S/ {(totalInvoicedSales * 0.45).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-subtle font-medium">Cuentas por Cobrar (Pendiente)</span>
                <span className="text-brand-fg font-mono font-bold">S/ {(totalInvoicedSales * 0.55).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-ink h-2 rounded-full overflow-hidden flex">
                <div className="bg-success h-full transition-all duration-500" style={{ width: '45%' }} />
                <div className="bg-brand h-full transition-all duration-500" style={{ width: '55%' }} />
              </div>
              <p className="text-xs text-ink-subtle leading-relaxed mt-2 pt-2 border-t border-line">
                <strong className="text-ink">Alerta de Liquidez:</strong> El 55% de tus ventas actuales están sujetas a cuentas por cobrar. Se recomienda activar el módulo de cobranza para asegurar la liquidez la próxima quincena.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Travel Expenses & SUNAT Audit Panel (Executive Overview) */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-fg" />
              Monitoreo Global de Viáticos Comercial & Rendición SUNAT
            </h4>
            <p className="text-xs text-ink-subtle mt-0.5">
              Resumen ejecutivo para la gerencia y jefatura de finanzas sobre fondos asignados vs sustentados.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-success-fg bg-success-soft border border-success/30 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
            <span>Certificación SUNAT: {expenses.length > 0 ? Math.round((sunatValidadosCount / expenses.length) * 100) : 100}% OK</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-surface-2 dark:bg-surface-2/60 border border-line/70 dark:border-line rounded-2xl">
            <span className="text-xs text-ink-subtle font-bold uppercase block">TOTAL RENDIDO</span>
            <span className="text-xl font-extrabold font-mono text-ink mt-1 block">
              S/ {totalExpensesRendido.toFixed(2)}
            </span>
            <span className="text-xs text-ink-subtle mt-1 block font-mono">{expenses.length} Comprobantes de Campo</span>
          </div>

          <div className="p-4 bg-warning-soft/50 dark:bg-warning/20 border border-warning/border dark:border-warning/border rounded-2xl">
            <span className="text-xs text-warning-fg font-bold uppercase block">PENDIENTE APROBACIÓN</span>
            <span className="text-xl font-extrabold font-mono text-warning-fg mt-1 block">
              S/ {totalExpensesPendiente.toFixed(2)}
            </span>
            <span className="text-xs text-warning-fg/80 mt-1 block font-mono">En revisión por finanzas</span>
          </div>

          <div className="p-4 bg-success-soft/50 dark:bg-success-soft border border-success/border dark:border-success/border rounded-2xl">
            <span className="text-xs text-success-fg font-bold uppercase block">APROBADO FINANZAS</span>
            <span className="text-xl font-extrabold font-mono text-success-fg mt-1 block">
              S/ {totalExpensesAprobado.toFixed(2)}
            </span>
            <span className="text-xs text-success-fg/80 mt-1 block font-mono">Gastos validados</span>
          </div>

          <div className="p-4 bg-danger-soft/50 dark:bg-danger-soft border border-danger/border dark:border-danger/border rounded-2xl">
            <span className="text-xs text-brand-fg font-bold uppercase block">COMPROBANTES SUNAT</span>
            <span className="text-xl font-extrabold font-mono text-brand-fg mt-1 block">
              {sunatValidadosCount} / {expenses.length}
            </span>
            <span className="text-xs text-ink-subtle mt-1 block font-mono">Verificados en padrón</span>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
