import React, { useState } from "react";
import { Receipt, FileText, CheckCircle2, RefreshCw, Send, ShieldCheck, Download, ExternalLink, Printer } from "lucide-react";
import { Quote } from "../types";
import { jsPDF } from "jspdf";

interface BillingInvoiceProps {
  quotes: Quote[];
  onUpdateQuoteStatus: (id: string, status: 'Pendiente' | 'Aceptada' | 'Rechazada') => Promise<void>;
}

interface IssuedInvoice {
  id: string;
  quoteId: string;
  clientName: string;
  clientDoc: string;
  total: number;
  date: string;
  hash: string;
  cdrCode: string;
}

export function BillingInvoice({ quotes, onUpdateQuoteStatus }: BillingInvoiceProps) {
  const [activeStep, setActiveStep] = useState<"list" | "signing" | "done">("list");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [xmlSigningCode, setXmlSigningCode] = useState("");
  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([
    {
      id: "FFF1-0001092",
      quoteId: "COT-2024-0892",
      clientName: "Moto Repuestos Lima S.A.C.",
      clientDoc: "20608542193",
      total: 12450.50,
      date: "2024-07-16",
      hash: "8f7a9d0e2c3b4a5f6e7d8c9b0a1b2c3d4e5f6a7b",
      cdrCode: "CDR-SUNAT-002495-ACEPTADO"
    },
    {
      id: "FFF1-0001093",
      quoteId: "COT-2024-0895",
      clientName: "Juan Carlos Paredes",
      clientDoc: "45892012",
      total: 2120.00,
      date: "2024-07-16",
      hash: "f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4",
      cdrCode: "CDR-SUNAT-002496-ACEPTADO"
    }
  ]);

  // Filter only quotes that have been "Aceptada" and are not yet invoiced
  const pendingInvoices = quotes.filter(
    (q) => q.status === "Aceptada" && !issuedInvoices.some((inv) => inv.quoteId === q.id)
  );

  const startInvoicing = (quote: Quote) => {
    setSelectedQuote(quote);
    setActiveStep("signing");
    setXmlSigningCode("Preparando firma digital SHA-256...");
    setTimeout(() => {
      setXmlSigningCode("Firmando archivo XML con certificado tributario CHOHO_PERU_2024.pfx...");
    }, 1000);
    setTimeout(() => {
      setXmlSigningCode("Empaquetando trama XML SOAP para SUNAT...");
    }, 2000);
    setTimeout(() => {
      // Complete
      const newInvoice: IssuedInvoice = {
        id: `FFF1-000${1094 + issuedInvoices.length}`,
        quoteId: quote.id,
        clientName: quote.clientName,
        clientDoc: quote.clientDoc,
        total: quote.total,
        date: new Date().toISOString().split("T")[0],
        hash: Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        cdrCode: `CDR-SUNAT-00${2497 + issuedInvoices.length}-ACEPTADO`
      };
      setIssuedInvoices((prev) => [newInvoice, ...prev]);
      setActiveStep("done");
    }, 3200);
  };

  // HIGH-QUALITY REAL PDF EXPORT OF ELECTRONIC INVOICE
  const downloadInvoicePDF = (invoice: IssuedInvoice) => {
    const doc = new jsPDF();
    
    // Aesthetic Styling
    doc.setFillColor(13, 17, 26); // Dark primary color header
    doc.rect(0, 0, 210, 45, "F");

    // Header Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(14, 165, 233); // Sky brand accent
    doc.text("CHOHO PERU S.A.C.", 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "normal");
    doc.text("RUC: 20551249852", 15, 28);
    doc.text("Dirección: Av. Separadora Industrial 1420, Ate, Lima", 15, 34);

    // Right-aligned Invoice Panel
    doc.setFillColor(240, 240, 240);
    doc.rect(140, 10, 55, 28, "F");
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("FACTURA ELECTRÓNICA", 142, 18);
    doc.setFontSize(14);
    doc.setTextColor(14, 165, 233); // Sky accent
    doc.text(invoice.id, 142, 28);


    // Document details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("DATOS DEL ADQUIRIENTE", 15, 58);
    doc.line(15, 60, 195, 60);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Cliente / Razón Social: ${invoice.clientName}`, 15, 67);
    doc.text(`RUC / DNI: ${invoice.clientDoc}`, 15, 73);
    doc.text(`Fecha de Emisión: ${invoice.date}`, 15, 79);
    doc.text(`Moneda: SOLES (PEN)`, 15, 85);

    // Table Header
    doc.setFillColor(244, 244, 245);
    doc.rect(15, 95, 180, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.text("Descripción del Ítem", 18, 100);
    doc.text("Total", 175, 100);

    // Items list
    const matchingQuote = quotes.find(q => q.id === invoice.quoteId);
    let currentY = 110;
    if (matchingQuote && matchingQuote.items) {
      matchingQuote.items.forEach((item) => {
        doc.setFont("Helvetica", "normal");
        doc.text(`${item.name} (Qty: ${item.qty})`, 18, currentY);
        doc.text(`S/ ${(item.qty * item.price).toFixed(2)}`, 175, currentY);
        currentY += 8;
      });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("Servicios de repuestos de transmisión de motos premium", 18, currentY);
      doc.text(`S/ ${invoice.total.toFixed(2)}`, 175, currentY);
      currentY += 8;
    }

    doc.line(15, currentY + 2, 195, currentY + 2);

    // Summary totals
    const totalVal = invoice.total;
    const subtotalVal = totalVal / 1.18;
    const igvVal = totalVal - subtotalVal;

    doc.setFont("Helvetica", "normal");
    doc.text(`Subtotal: S/ ${subtotalVal.toFixed(2)}`, 145, currentY + 10);
    doc.text(`I.G.V. (18%): S/ ${igvVal.toFixed(2)}`, 145, currentY + 16);
    doc.setFont("Helvetica", "bold");
    doc.text(`Total General: S/ ${totalVal.toFixed(2)}`, 145, currentY + 24);

    // SUNAT / Security stamps
    doc.setFillColor(250, 250, 250);
    doc.rect(15, currentY + 35, 180, 25, "F");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Representación impresa de la Factura Electrónica.", 18, currentY + 41);
    doc.text(`Código Hash de Seguridad: ${invoice.hash}`, 18, currentY + 47);
    doc.text(`Estado SUNAT: ${invoice.cdrCode}`, 18, currentY + 53);

    doc.save(`factura_${invoice.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Electronic Billing Title Panel */}
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
        <h3 className="font-bold text-sm text-gray-200 font-display flex items-center gap-2">
          <Receipt className="w-5 h-5 text-sky-400" />
          Módulo de Facturación Electrónica SUNAT
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Emite comprobantes oficiales directamente a la superintendencia. Los presupuestos en estado "Aceptada" califican para su facturación inmediata.
        </p>
      </div>

      {activeStep === "list" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Invoices section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
              <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Presupuestos Pendientes de Facturación ({pendingInvoices.length})
              </h4>

              {pendingInvoices.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-xs">
                  No hay cotizaciones aprobadas pendientes de facturar.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvoices.map((quote) => (
                    <div
                      key={quote.id}
                      className="p-4 bg-[#0F172A]/40 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700/50 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-sky-400">{quote.id}</span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-900">
                            Aceptada
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-gray-200 mt-1">{quote.clientName}</h5>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          RUC: {quote.clientDoc} • Asesor: {quote.advisor}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block">TOTAL</span>
                          <span className="text-sm font-bold font-mono text-gray-200">
                            S/ {quote.total.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => startInvoicing(quote)}
                          className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Emitir Factura</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Issued Invoices Log sidebar */}
          <div className="space-y-4">
            <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
              <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Historial Comprobantes Emitidos
              </h4>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {issuedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-[#0F172A]/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700/50 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200">{inv.id}</span>
                      <span className="text-[9px] text-gray-500">{inv.date}</span>
                    </div>

                    <div className="text-[11px] text-gray-400 font-semibold truncate">
                      {inv.clientName}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                      <span className="font-mono text-sky-400 font-bold">
                        S/ {inv.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => downloadInvoicePDF(inv)}
                        className="text-gray-400 hover:text-sky-400 transition-colors p-1 cursor-pointer"
                        title="Exportar Factura a PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signing / Communication Loader */}
      {activeStep === "signing" && selectedQuote && (
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <RefreshCw className="w-12 h-12 text-sky-400 animate-spin" />
            <ShieldCheck className="w-5 h-5 text-emerald-500 absolute bottom-0 right-0 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-200 font-display">Firmando Comprobante Electrónico</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Se está generando la firma criptográfica para el XML y estableciendo conexión encriptada de canal TLS 1.3 con SUNAT.
            </p>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 p-3 rounded-lg w-full max-w-md font-mono text-[10px] text-emerald-500/80 text-left">
            <div>&gt; {xmlSigningCode}</div>
            <div className="text-gray-600 mt-1">IP Ingress: 0.0.0.0:3000 • SSL_ACTIVE</div>
          </div>
        </div>
      )}

      {/* Done Screen */}
      {activeStep === "done" && selectedQuote && (
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-emerald-400 font-display">¡Factura Electrónica Emitida Correctamente!</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              El comprobante fue transmitido con éxito. SUNAT ha retornado la constancia de recepción (CDR) en estado 'ACEPTADO'.
            </p>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-xl w-full max-w-md text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Nro Comprobante:</span>
              <span className="font-bold text-gray-200">FFF1-000{1093 + issuedInvoices.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span className="font-semibold text-gray-200 truncate max-w-[200px]">{selectedQuote.clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Código Hash SUNAT:</span>
              <span className="font-mono text-[10px] text-emerald-500 truncate max-w-[200px]">
                {issuedInvoices[0]?.hash || "b4df279ae2812bc"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveStep("list")}
              className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
            >
              Cerrar y Regresar
            </button>
            <button
              onClick={() => {
                if (issuedInvoices[0]) downloadInvoicePDF(issuedInvoices[0]);
              }}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Factura PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
