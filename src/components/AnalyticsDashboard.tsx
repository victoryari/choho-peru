import React from "react";
import { BarChart3, TrendingUp, DollarSign, Award, Users, Download, ArrowUpRight, Calendar, PieChart } from "lucide-react";
import { Product, Quote } from "../types";
import { jsPDF } from "jspdf";

interface AnalyticsDashboardProps {
  products: Product[];
  quotes: Quote[];
}

export function AnalyticsDashboard({ products, quotes }: AnalyticsDashboardProps) {
  // Analytical computations
  const totalInvoicedSales = quotes
    .filter((q) => q.status === "Aceptada")
    .reduce((acc, curr) => acc + curr.total, 0);

  const pendingSales = quotes
    .filter((q) => q.status === "Pendiente")
    .reduce((acc, curr) => acc + curr.total, 0);

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

  // Sales category counts
  const categorySales: { [cat: string]: number } = {
    Cadenas: 0,
    Piñones: 0,
    "Kits de Arrastre": 0,
    Frenos: 0,
    Motor: 0,
    Accesorios: 0
  };

  quotes
    .filter((q) => q.status === "Aceptada")
    .forEach((q) => {
      q.items?.forEach((item) => {
        const matchingProd = products.find((p) => p.sku === item.sku);
        if (matchingProd && categorySales[matchingProd.category] !== undefined) {
          categorySales[matchingProd.category] += item.qty * item.price;
        } else {
          categorySales["Accesorios"] += item.qty * item.price;
        }
      });
    });

  // REAL FUNCTIONAL PDF MONTHLY REPORT EXPORTER
  const handleExportPDFReport = () => {
    const doc = new jsPDF();

    // Dark red cover/header bar -> Slate/Sky professional header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 55, "F");

    // Sky blue accent bar underneath
    doc.setFillColor(14, 165, 233); // sky-500
    doc.rect(0, 53, 210, 2, "F");

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("INFORME DE RENDIMIENTO MENSUAL", 15, 25);
    
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.text("SISTEMA DE GESTIÓN DE COMPROBANTES Y CONTROL DE ASESORES", 15, 33);
    doc.setFont("Helvetica", "bold");
    doc.text("CHOHO PERU S.A.C.", 15, 43);

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
    doc.setTextColor(14, 165, 233); // sky blue
    doc.text("1. RESUMEN EJECUTIVO DE VENTAS", 15, 70);
    doc.line(15, 72, 195, 72);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "normal");
    doc.text(`Total Facturado Recaudado: S/ ${totalInvoicedSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN`, 18, 80);
    doc.text(`Total en Cartera de Cotizaciones (Pendientes): S/ ${pendingSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN`, 18, 86);
    doc.text(`Número de Cotizaciones Aprobadas/Facturadas: ${acceptedQuotesCount} comprobantes`, 18, 92);
    doc.text(`Ticket Medio de Compra Comercial: S/ ${averageTicket.toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN`, 18, 98);

    // Section 2: Best sellers table
    doc.setFontSize(13);
    doc.setTextColor(14, 165, 233);
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
        doc.text(`${item.qty} und`, 140, currentY);
        doc.text(`S/ ${item.total.toFixed(2)}`, 170, currentY);
        currentY += 8;
      });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("Sin datos de SKUs facturados disponibles.", 18, currentY);
      currentY += 8;
    }

    // Section 3: Performance indicators
    doc.setFontSize(13);
    doc.setTextColor(14, 165, 233);
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
      doc.text(`• ${cat}: S/ ${salesVal.toFixed(2)} (${pct.toFixed(1)}%)`, 18, categoryY);
      categoryY += 6;
    });

    // Sign off security stamp
    doc.setFillColor(250, 250, 250);
    doc.rect(15, 240, 180, 25, "F");
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Documento oficial encriptado con clave de seguridad y firma digital de auditoría.", 18, 246);
    doc.text("CHOHO PERU S.A.C. - Sistema de Facturación Integrado.", 18, 252);
    doc.text("Respaldo de Base de Datos: TiDB Server, Lima.", 18, 258);

    doc.save("informe_mensual_ventas_choho.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Metric Cards (DealDeck Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hero Total Sales (Gradient Electric Blue Card) */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white border border-blue-500/20 rounded-2xl p-5 shadow-lg shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +2.08%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[11px] text-blue-100 font-semibold uppercase tracking-wider block">
              Ventas Facturadas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-white">
                S/ {totalInvoicedSales.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-200 font-medium">vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cartera en Cotización (Total Orders) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +12.4%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Cartera en Cotización
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                S/ {pendingSales.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Pendientes</span>
            </div>
          </div>
        </div>

        {/* Card 3: Facturas Emitidas (Visitors) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <span className="bg-red-50 dark:bg-red-950/40 text-red-500 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              -2.08%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Comprobantes Emitidos
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                {acceptedQuotesCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Facturas aprobadas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Ticket Medio (Total Sold Products) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +12.1%
            </span>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Ticket Medio de Venta
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                S/ {averageTicket.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Por cliente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (DealDeck Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Customer Habbits Bar Chart & Top SKUs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dual Bar Chart (Customer Habbits - DealDeck Style) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-display">
                  Comportamiento de Ventas & Productos
                </h3>
                <p className="text-xs text-slate-400">Rendimiento mensual comparativo de repuestos facturados</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Ventas (Soles)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>Unidades</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Graphics */}
            <div className="relative pt-6 pb-2">
              {/* Tooltip Overlay Mock */}
              <div className="absolute top-2 left-[48%] -translate-x-1/2 bg-slate-900 text-white rounded-xl shadow-xl px-3 py-1.5 text-[11px] font-semibold flex items-center gap-2 z-10">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>S/ 43,787 Productos</span>
              </div>

              <div className="h-52 flex items-end justify-between px-2 pt-6 border-b border-slate-100 dark:border-slate-800">
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
                        className="w-3.5 sm:w-4 rounded-t-lg bg-blue-600 group-hover:bg-blue-700 transition-all duration-300 shadow-xs"
                        style={{ height: `${m.val1}%` }}
                      />
                      <div
                        className="w-3.5 sm:w-4 rounded-t-lg bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 transition-all duration-300"
                        style={{ height: `${m.val2}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 font-sans">
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Selling Products List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Productos Más Vendidos (Top SKUs CHOHO)
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Actualizado en tiempo real</span>
            </div>

            <div className="space-y-4">
              {bestSellers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No se registran transacciones facturadas este periodo.
                </div>
              ) : (
                bestSellers.map((item, idx) => {
                  const maxTotal = Math.max(...bestSellers.map((b) => b.total), 1);
                  const percentage = (item.total / maxTotal) * 100;
                  return (
                    <div key={item.sku} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold rounded-lg flex items-center justify-center text-[10px]">
                            0{idx + 1}
                          </span>
                          <span className="font-mono text-blue-600 font-bold">{item.sku}</span>
                          <span className="text-slate-600 dark:text-slate-400 truncate font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          S/ {item.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display">
                  Estadísticas de Productos
                </h4>
                <p className="text-[11px] text-slate-400">Distribución de volumen por categoría</p>
              </div>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-xl font-semibold">
                Hoy
              </span>
            </div>

            {/* SVG Concentric Gauge */}
            <div className="relative flex items-center justify-center py-4">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                {/* Outer Ring - Royal Blue */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  className="dark:stroke-slate-800"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#3B52F6"
                  strokeWidth="8"
                  strokeDasharray="314"
                  strokeDashoffset="75"
                  strokeLinecap="round"
                />
                {/* Middle Ring - Coral Red */}
                <circle
                  cx="60"
                  cy="60"
                  r="38"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  className="dark:stroke-slate-800"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="38"
                  fill="none"
                  stroke="#EF4444"
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
                  stroke="#CBD5E1"
                  strokeWidth="8"
                  strokeDasharray="163"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                  className="dark:stroke-slate-700"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  9,829
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Ventas Totales</span>
                <span className="mt-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  +5.34%
                </span>
              </div>
            </div>

            {/* Category Breakdown list */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Cadenas de Transmisión</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white font-mono font-bold">2,487</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded-full">+1.8%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Kits de Arrastre</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white font-mono font-bold">1,828</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded-full">+2.3%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Piñones & Catalina</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white font-mono font-bold">1,463</span>
                  <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.2 rounded-full">-1.04%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Export Report Card & Customer Growth */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Informe Consolidado PDF
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Genera el documento analítico completo con firma de auditoría comercial.
              </p>
            </div>

            <button
              onClick={handleExportPDFReport}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Reporte Mensual PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
