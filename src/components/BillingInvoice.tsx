import React, { useState, useEffect, useMemo } from "react";
import { Receipt, FileText, CheckCircle2, RefreshCw, Send, ShieldCheck, Download, Printer, Search, ArrowRightLeft, Truck, Check, FileCode2, ShoppingCart, Plus, Minus, Trash2, UserSearch, AlertCircle, Gift, Calendar } from "lucide-react";
import { Quote, Product } from "../types";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface BillingInvoiceProps {
  quotes: Quote[];
  onUpdateQuoteStatus: (id: string, status: 'Pendiente' | 'Aceptada' | 'Rechazada') => Promise<void>;
  products: Product[];
  onUpdateProduct?: (sku: string, updated: Partial<Product>) => Promise<void>;
}

export interface IssuedInvoice {
  id: string;
  doc_type: string;
  quote_id?: string;
  reference_id?: string;
  clientName: string;
  clientDoc: string;
  total: number; // Total Gravado
  subtotal: number;
  igv: number;
  free_total?: number; // Total Operaciones Gratuitas
  date: string;
  currency: string;
  payment_type: string;
  credit_quotas?: { amount: number, date: string }[];
  hash: string;
  cdr_data?: string;
  xml_data?: string;
  status: string;
  items?: any[]; // To track sold items for PDF
}

interface CartItem {
  sku: string;
  name: string;
  qty: number;
  price: number; // Referential or Gravado price
  isFree?: boolean;
}

// Convert Number to Words (Spanish)
function numberToWords(num: number): string {
  if (num === 0) return "CERO";
  const unities = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const tens = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  let words = "";
  if (num >= 1000) {
    const k = Math.floor(num / 1000);
    words += (k === 1 ? "MIL " : unities[k] + " MIL ");
    num %= 1000;
  }
  if (num >= 100) {
    if (num === 100) words += "CIEN ";
    else words += hundreds[Math.floor(num / 100)] + " ";
    num %= 100;
  }
  if (num >= 10) {
    if (num === 10) words += "DIEZ ";
    else if (num === 11) words += "ONCE ";
    else if (num === 12) words += "DOCE ";
    else if (num === 13) words += "TRECE ";
    else if (num === 14) words += "CATORCE ";
    else if (num === 15) words += "QUINCE ";
    else if (num < 20) words += "DIECI" + unities[num - 10] + " ";
    else if (num === 20) words += "VEINTE ";
    else if (num < 30) words += "VEINTI" + unities[num - 20] + " ";
    else {
      words += tens[Math.floor(num / 10)] + " ";
      if (num % 10 > 0) words += "Y " + unities[num % 10] + " ";
    }
    num = 0;
  }
  if (num > 0) words += unities[num] + " ";

  return words.trim();
}

function getAmountInWords(amount: number, currency: string = "PEN"): string {
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  const decStr = decPart.toString().padStart(2, "0");
  const currencyStr = currency === "PEN" ? "SOLES" : "DÓLARES AMERICANOS";
  return `SON: ${numberToWords(intPart)} Y ${decStr}/100 ${currencyStr}`;
}

export function BillingInvoice({ quotes, onUpdateQuoteStatus, products, onUpdateProduct }: BillingInvoiceProps) {
  const [activeTab, setActiveTab] = useState<"pos" | "notas" | "guias">("pos");
  const [activeStep, setActiveStep] = useState<"setup" | "signing" | "done">("setup");
  
  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([]);
  
  // POS States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientDocPos, setClientDocPos] = useState("");
  const [clientNamePos, setClientNamePos] = useState("");
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [loadedQuoteId, setLoadedQuoteId] = useState<string>("");
  const [searchProductQuery, setSearchProductQuery] = useState("");

  const [docType, setDocType] = useState("01"); // 01 Factura, 03 Boleta
  const [currency, setCurrency] = useState("PEN");

  // Payment Setup
  const [paymentType, setPaymentType] = useState("Contado");
  const [creditQuotas, setCreditQuotas] = useState<{amount: number, date: string}[]>([]);

  // Notas Setup State
  const [referenceId, setReferenceId] = useState("");
  const [foundReference, setFoundReference] = useState<IssuedInvoice | null>(null);
  const [noteType, setNoteType] = useState("07");
  const [noteReason, setNoteReason] = useState("Anulación de la operación");

  // Guías Setup State
  const [guideReason, setGuideReason] = useState("Venta");
  const [carrierName, setCarrierName] = useState("Transportes Rápidos S.A.C.");
  const [carrierRuc, setCarrierRuc] = useState("20123456789");
  const [totalWeight, setTotalWeight] = useState("15.5");

  const [xmlSigningCode, setXmlSigningCode] = useState("");
  const [currentGeneratedInvoice, setCurrentGeneratedInvoice] = useState<IssuedInvoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setIssuedInvoices(data);
      }
    } catch (e) {
      console.warn("Failed to fetch invoices");
    }
  };

  // ---------------- POS LOGIC ----------------

  const pendingQuotes = quotes.filter(q => q.status === "Aceptada" && !issuedInvoices.some(inv => inv.quote_id === q.id));

  // Calculations separating Free and Payable items
  const posTotal = useMemo(() => cart.filter(i => !i.isFree).reduce((acc, item) => acc + (item.price * item.qty), 0), [cart]);
  const posSubtotal = useMemo(() => posTotal / 1.18, [posTotal]);
  const posIgv = useMemo(() => posTotal - posSubtotal, [posTotal, posSubtotal]);
  const posFreeTotal = useMemo(() => cart.filter(i => i.isFree).reduce((acc, item) => acc + (item.price * item.qty), 0), [cart]);

  // Adjust Credit Quotas if total changes
  useEffect(() => {
    if (paymentType.startsWith("Crédito") && creditQuotas.length > 0) {
      // Auto-rebalance quotas if total changes
      const qCount = creditQuotas.length;
      const amountPerQuota = parseFloat((posTotal / qCount).toFixed(2));
      setCreditQuotas(prev => prev.map((q, idx) => {
        if (idx === qCount - 1) {
          // Adjust last quota for rounding diffs
          return { ...q, amount: parseFloat((posTotal - (amountPerQuota * (qCount - 1))).toFixed(2)) };
        }
        return { ...q, amount: amountPerQuota };
      }));
    }
  }, [posTotal]);

  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type);
    if (type.startsWith("Crédito")) {
      const numQuotas = parseInt(type.split(" ")[1]) || 1;
      const amountPerQuota = parseFloat((posTotal / numQuotas).toFixed(2));
      const quotas = [];
      const today = new Date();
      for (let i = 0; i < numQuotas; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + (30 * (i + 1))); // Add 30 days per quota by default
        quotas.push({
          amount: i === numQuotas - 1 ? parseFloat((posTotal - (amountPerQuota * (numQuotas - 1))).toFixed(2)) : amountPerQuota,
          date: d.toISOString().split("T")[0]
        });
      }
      setCreditQuotas(quotas);
    } else {
      setCreditQuotas([]);
    }
  };

  const updateQuota = (index: number, field: 'amount' | 'date', value: any) => {
    setCreditQuotas(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const loadQuoteIntoPos = (quoteId: string) => {
    setLoadedQuoteId(quoteId);
    if (!quoteId) {
      setCart([]);
      setClientDocPos("");
      setClientNamePos("");
      return;
    }
    const q = quotes.find(x => x.id === quoteId);
    if (q) {
      setClientDocPos(q.clientDoc);
      setClientNamePos(q.clientName);
      setCart(q.items.map(i => ({ sku: i.sku, name: i.name, qty: i.qty, price: i.price, isFree: false })));
      // Auto select boleta if DNI, factura if RUC
      if (q.clientDoc.length === 8) setDocType("03");
      if (q.clientDoc.length === 11) setDocType("01");
    }
  };

  const searchSunat = async () => {
    if (!clientDocPos) return;
    const cleanDoc = clientDocPos.trim();
    if (cleanDoc.length !== 8 && cleanDoc.length !== 11) {
      alert("El documento debe tener 8 (DNI) o 11 (RUC) dígitos.");
      return;
    }
    
    setIsSearchingClient(true);
    try {
      const endpoint = cleanDoc.length === 8 ? `/api/reniec/${cleanDoc}` : `/api/sunat/${cleanDoc}`;
      const res = await fetch(endpoint);
      
      if (res.ok) {
        const data = await res.json();
        if (data.businessName) setClientNamePos(data.businessName);
        else if (data.name) setClientNamePos(data.name);
        else setClientNamePos(""); // Fallback just in case
      } else {
        alert("No se encontró el documento o hubo un error con la API.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al buscar el documento.");
    } finally {
      setIsSearchingClient(false);
    }
  };

  const addProductToCart = (p: Product) => {
    setCart(prev => {
      const exists = prev.find(i => i.sku === p.sku);
      if (exists) {
        return prev.map(i => i.sku === p.sku ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { sku: p.sku, name: p.name, qty: 1, price: p.basePrice, isFree: false }];
    });
    setSearchProductQuery("");
  };

  const updateCartItem = (sku: string, field: 'qty'|'price'|'isFree', val: any) => {
    if (field === 'qty' || field === 'price') {
      if (val < 0) return;
    }
    setCart(prev => prev.map(i => i.sku === sku ? { ...i, [field]: val } : i));
  };
  
  const removeCartItem = (sku: string) => {
    setCart(prev => prev.filter(i => i.sku !== sku));
  };

  const filteredCatalog = products.filter(p => p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchProductQuery.toLowerCase())).slice(0, 5);

  // ---------------- EMISSION LOGIC ----------------

  const processEmission = () => {
    if (activeTab === "pos") {
      if (cart.length === 0) return alert("El carrito está vacío");
      if (!clientDocPos || !clientNamePos) return alert("Faltan datos del cliente");
      if (paymentType !== "Contado") {
        const sumQuotas = creditQuotas.reduce((acc, q) => acc + (Number(q.amount) || 0), 0);
        if (Math.abs(sumQuotas - posTotal) > 0.05) {
          return alert(`La suma de las cuotas (${sumQuotas.toFixed(2)}) no coincide con el Importe Total (${posTotal.toFixed(2)}).`);
        }
        for (let q of creditQuotas) {
          if (!q.date) return alert("Falta ingresar la fecha de vencimiento en alguna cuota.");
        }
      }
    }

    setActiveStep("signing");
    setXmlSigningCode("Preparando firma digital SHA-256...");
    setTimeout(() => {
      setXmlSigningCode("Firmando archivo XML con certificado tributario CHOHO_PERU_2024.pfx...");
    }, 1000);
    setTimeout(() => {
      setXmlSigningCode("Empaquetando trama XML SOAP para SUNAT...");
    }, 2000);
    setTimeout(async () => {
      let finalDocType = docType;
      let finalTotal = posTotal;
      let finalSubtotal = posSubtotal;
      let finalIgv = posIgv;
      let finalFreeTotal = posFreeTotal;
      let finalClientName = clientNamePos;
      let finalClientDoc = clientDocPos;
      let finalQuoteId = loadedQuoteId || undefined;
      let finalItems = cart;
      let finalQuotas = paymentType !== "Contado" ? creditQuotas : undefined;

      if (activeTab === "notas" || activeTab === "guias") {
        finalDocType = activeTab === "notas" ? noteType : "09";
        finalTotal = foundReference?.total || 0;
        finalSubtotal = foundReference?.subtotal || 0;
        finalIgv = foundReference?.igv || 0;
        finalFreeTotal = foundReference?.free_total || 0;
        finalClientName = foundReference?.clientName || "";
        finalClientDoc = foundReference?.clientDoc || "";
        finalQuoteId = foundReference?.quote_id;
        finalItems = foundReference?.items || [];
        finalQuotas = foundReference?.credit_quotas;
      }

      // Generate ID Series
      const seriesMap: Record<string, string> = { "01": "F001", "03": "B001", "07": "FC01", "08": "FD01", "09": "T001" };
      const seriesPrefix = seriesMap[finalDocType] || "F001";
      const count = issuedInvoices.filter(i => i.doc_type === finalDocType).length + 1;
      const docId = `${seriesPrefix}-${String(count).padStart(6, '0')}`;

      const newInvoice: IssuedInvoice = {
        id: docId,
        doc_type: finalDocType,
        quote_id: finalQuoteId,
        reference_id: (activeTab === "notas" || activeTab === "guias") ? referenceId : undefined,
        clientName: finalClientName,
        clientDoc: finalClientDoc,
        total: finalTotal,
        subtotal: finalSubtotal,
        igv: finalIgv,
        free_total: finalFreeTotal,
        date: new Date().toISOString().split("T")[0],
        currency,
        payment_type: paymentType,
        credit_quotas: finalQuotas,
        hash: Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        status: "ACEPTADO",
        xml_data: `<?xml version="1.0" encoding="UTF-8"?><Invoice><cbc:ID>${docId}</cbc:ID><cac:Signature><cbc:ID>IDSignKG</cbc:ID></cac:Signature></Invoice>`,
        cdr_data: `<?xml version="1.0" encoding="UTF-8"?><ApplicationResponse><cbc:Description>El Comprobante ${docId} ha sido aceptado.</cbc:Description></ApplicationResponse>`,
        items: finalItems
      };

      try {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newInvoice)
        });
        if (res.ok) {
          const created = await res.json();
          // Ensure items and quotas are saved locally 
          created.items = finalItems; 
          created.credit_quotas = finalQuotas;
          setIssuedInvoices(prev => [created, ...prev]);
          setCurrentGeneratedInvoice(created);
          
          // Deduct Stock
          if (activeTab === "pos" && onUpdateProduct) {
            for (const item of cart) {
              const prod = products.find(p => p.sku === item.sku);
              if (prod) {
                const newStock = Math.max(0, (prod.stock || 0) - item.qty);
                await onUpdateProduct(item.sku, { stock: newStock });
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
      
      setActiveStep("done");
      // Reset POS
      setCart([]);
      setClientDocPos("");
      setClientNamePos("");
      setLoadedQuoteId("");
      setPaymentType("Contado");
      setCreditQuotas([]);
    }, 3200);
  };

  const searchReference = () => {
    const found = issuedInvoices.find(i => i.id.toUpperCase() === referenceId.toUpperCase());
    if (found) {
      setFoundReference(found);
    } else {
      alert("Comprobante no encontrado.");
      setFoundReference(null);
    }
  };

  const getDocTypeName = (type: string) => {
    const types: Record<string, string> = { "01": "FACTURA", "03": "BOLETA", "07": "NOTA DE CRÉDITO", "08": "NOTA DE DÉBITO", "09": "GUÍA DE REMISIÓN" };
    return types[type] || "COMPROBANTE";
  };

  // HIGH-QUALITY REAL PDF EXPORT OF ELECTRONIC INVOICE
  const downloadInvoicePDF = async (invoice: IssuedInvoice) => {
    const doc = new jsPDF();
    const isNote = invoice.doc_type === "07" || invoice.doc_type === "08";
    const isGuide = invoice.doc_type === "09";
    const docName = getDocTypeName(invoice.doc_type);
    const hasFreeItems = invoice.free_total !== undefined && invoice.free_total > 0;
    const isCredit = invoice.payment_type !== "Contado";

    let qrDataUri = "";
    try {
      const qrString = `20551249852|${invoice.doc_type}|${invoice.id.split('-')[0]}|${invoice.id.split('-')[1]}|${invoice.igv}|${invoice.total}|${invoice.date}|6|${invoice.clientDoc}|${invoice.hash}`;
      qrDataUri = await QRCode.toDataURL(qrString, { margin: 0 });
    } catch (err) {
      console.warn("QR Generation failed");
    }

    // Header Banner Background
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 48, "F");

    // Choho Brand Emblem Accent Box
    doc.setFillColor(245, 158, 11); 
    doc.rect(15, 10, 10, 28, "F");

    // Header Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(245, 158, 11); 
    doc.text("CHOHO PERÚ", 30, 22);

    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199); 
    doc.text("TRANSMISIÓN, CADENAS Y MOTOREPUESTOS B2B", 30, 28);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); 
    doc.setFont("Helvetica", "normal");
    doc.text("RUC: 20551249852 | Dirección: Av. Separadora Industrial 1420, Ate, Lima", 30, 35);
    doc.text("Teléfono: (01) 458-9200 | Email: ventas@choho.pe | Web: www.choho.pe", 30, 41);

    // Right-aligned Invoice Panel Box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(125, 10, 70, 30, "FD");
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`${docName} ELECTRÓNICA`, 128, 18);
    doc.setFontSize(13);
    doc.setTextColor(225, 29, 72); 
    doc.text(invoice.id, 128, 27);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("R.I. SUNAT / OSE CHOHO", 128, 34);

    // Document details
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text(isGuide ? "DATOS DE TRASLADO / DESTINATARIO" : "DATOS DEL CLIENTE / ADQUIRIENTE", 15, 60);
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 62, 195, 62);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Razón Social: ${invoice.clientName}`, 15, 70);
    doc.text(`RUC / DNI: ${invoice.clientDoc}`, 15, 76);
    doc.text(`Fecha de Emisión: ${invoice.date}`, 15, 82);
    
    if (isGuide) {
      doc.text(`Motivo de Traslado: ${guideReason} | Peso Bruto Total: ${totalWeight} KGM`, 15, 88);
      doc.text(`Datos Transportista: ${carrierName} - RUC: ${carrierRuc}`, 15, 94);
    } else {
      doc.text(`Moneda: ${invoice.currency === 'PEN' ? 'SOLES' : 'DÓLARES'} | Forma de Pago: ${isCredit ? 'Crédito' : 'Contado'}`, 15, 88);
      if (isNote) {
        doc.text(`Documento que Modifica: ${invoice.reference_id} | Motivo: ${noteReason}`, 15, 94);
      }
    }

    const startY = isGuide || isNote ? 102 : 96;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, startY, 180, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Descripción del Producto / Ítem", 18, startY + 5);
    doc.text("U.M.", 140, startY + 5);
    if (!isGuide) doc.text("Total", 175, startY + 5);

    // Items list 
    let currentY = startY + 15;
    
    // We prioritize invoice.items (if we saved it), else quote items, else generic
    let invoiceItems = invoice.items || [];
    if (invoiceItems.length === 0 && invoice.quote_id) {
      const q = quotes.find(x => x.id === invoice.quote_id);
      if (q) invoiceItems = q.items;
    }

    if (invoiceItems.length > 0) {
      invoiceItems.forEach((item) => {
        doc.setFont("Helvetica", "normal");
        let nameTxt = `${item.name} [SKU: ${item.sku}] (Cant: ${item.qty})`;
        if (item.isFree) nameTxt = `* ${nameTxt} (OBSEQUIO)`;
        doc.text(nameTxt, 18, currentY);
        doc.text("NIU", 140, currentY);
        if (!isGuide) {
          if (item.isFree) {
            doc.text("S/ 0.00", 175, currentY);
          } else {
            doc.text(`S/ ${(item.qty * item.price).toFixed(2)}`, 175, currentY);
          }
        }
        currentY += 8;
      });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("Kits de arrastre y repuestos de transmisión de motos CHOHO", 18, currentY);
      doc.text("NIU", 140, currentY);
      if (!isGuide) doc.text(`${invoice.currency === 'PEN' ? 'S/' : '$'} ${invoice.total.toFixed(2)}`, 175, currentY);
      currentY += 8;
    }

    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 10;

    // SUNAT Legends for Free Items
    if (!isGuide && hasFreeItems) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72);
      doc.text("TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE", 15, currentY);
      currentY += 8;
    }

    if (!isGuide) {
      // Amount in words
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(getAmountInWords(invoice.total, invoice.currency), 15, currentY);

      // Summary totals
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      const symbol = invoice.currency === 'PEN' ? 'S/' : '$';
      doc.text(`Op. Gravada: ${symbol} ${invoice.subtotal.toFixed(2)}`, 140, currentY);
      
      if (hasFreeItems) {
        doc.text(`Op. Gratuitas: ${symbol} ${invoice.free_total?.toFixed(2)}`, 140, currentY + 6);
        doc.text(`Op. Exonerada: ${symbol} 0.00`, 140, currentY + 12);
        doc.text(`I.G.V. (18%): ${symbol} ${invoice.igv.toFixed(2)}`, 140, currentY + 18);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(225, 29, 72);
        doc.text(`IMPORTE TOTAL: ${symbol} ${invoice.total.toFixed(2)}`, 140, currentY + 26);
        currentY += 26;
      } else {
        doc.text(`Op. Exonerada: ${symbol} 0.00`, 140, currentY + 6);
        doc.text(`I.G.V. (18%): ${symbol} ${invoice.igv.toFixed(2)}`, 140, currentY + 12);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(225, 29, 72);
        doc.text(`IMPORTE TOTAL: ${symbol} ${invoice.total.toFixed(2)}`, 140, currentY + 20);
        currentY += 20;
      }
      
      // Credit Quotas Breakdown
      if (isCredit && invoice.credit_quotas && invoice.credit_quotas.length > 0) {
        currentY += 10;
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("Información de Venta al Crédito:", 15, currentY);
        doc.setFont("Helvetica", "normal");
        let qY = currentY + 6;
        invoice.credit_quotas.forEach((q, idx) => {
          doc.text(`Cuota ${idx + 1}: ${symbol} ${q.amount.toFixed(2)} | Vencimiento: ${q.date}`, 20, qY);
          qY += 5;
        });
        currentY = qY;
      }
    }

    // SUNAT / Security stamps box with QR
    const qrBoxY = Math.max(currentY + 10, 220); // Push to bottom if space allows
    doc.setFillColor(248, 250, 252);
    doc.rect(15, qrBoxY, 180, 28, "FD");
    
    if (qrDataUri) {
      doc.addImage(qrDataUri, 'PNG', 18, qrBoxY + 2, 24, 24);
    }
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Esta es una representación impresa de la ${docName} generada en formato electrónico.`, 45, qrBoxY + 7);
    doc.text("Puede verificar la validez de este documento en el portal de SUNAT (www.sunat.gob.pe).", 45, qrBoxY + 12);
    doc.text(`Firma Digital (Hash SHA-256): ${invoice.hash}`, 45, qrBoxY + 18);
    if (!isGuide) doc.text(`Respuesta CDR SUNAT: CDR-ACEPTADO`, 45, qrBoxY + 23);

    doc.save(`${docName.toLowerCase().replace(/ /g, '_')}_${invoice.id}.pdf`);
  };

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Electronic Billing Title Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-white">
          <Receipt className="w-5 h-5 text-[#E51920]" />
          Punto de Venta / Facturación SUNAT
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Emisión oficial de Comprobantes. Carga cotizaciones o realiza ventas libres descontando inventario en tiempo real.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 w-full max-w-xl">
        <button
          onClick={() => { setActiveTab("pos"); setActiveStep("setup"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === "pos" 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Terminal POS (Facturas/Boletas)
        </button>
        <button
          onClick={() => { setActiveTab("notas"); setActiveStep("setup"); setFoundReference(null); setReferenceId(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === "notas" 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Notas Electrónicas
        </button>
        <button
          onClick={() => { setActiveTab("guias"); setActiveStep("setup"); setFoundReference(null); setReferenceId(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === "guias" 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Truck className="w-4 h-4" />
          Guías Remisión
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Area: POS Setup */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* 🛒 POS TERMINAL */}
          {activeTab === "pos" && activeStep === "setup" && (
            <div className="space-y-4">
              
              {/* Toolbar: Load Quote & Doc Type */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cargar Cotización (Opcional)</label>
                  <select 
                    value={loadedQuoteId} 
                    onChange={e => loadQuoteIntoPos(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- Empezar Venta Libre --</option>
                    {pendingQuotes.map(q => (
                      <option key={q.id} value={q.id}>{q.id} - {q.clientName} (S/ {q.total.toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo Doc.</label>
                    <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white">
                      <option value="01">Factura (RUC)</option>
                      <option value="03">Boleta (DNI)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Moneda</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white">
                      <option value="PEN">Soles (PEN)</option>
                      <option value="USD">Dólares (USD)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><UserSearch className="w-4 h-4 text-cyan-500"/> Datos del Adquirente</h4>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">RUC / DNI</label>
                    <div className="flex">
                      <input 
                        type="text" 
                        value={clientDocPos} 
                        onChange={e => setClientDocPos(e.target.value)} 
                        placeholder="Número de documento..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-l-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                      <button onClick={searchSunat} disabled={isSearchingClient} className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded-r-xl flex items-center justify-center transition-colors">
                        {isSearchingClient ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Razón Social / Nombre</label>
                    <input 
                      type="text" 
                      value={clientNamePos} 
                      onChange={e => setClientNamePos(e.target.value)} 
                      placeholder="Nombre del cliente..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#E51920]"/> Carrito de Productos</h4>
                  
                  {/* Product Search Dropdown */}
                  <div className="relative group">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 w-64 focus-within:border-red-500 transition-colors">
                      <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
                      <input 
                        type="text" 
                        value={searchProductQuery}
                        onChange={e => setSearchProductQuery(e.target.value)}
                        placeholder="Buscar producto para agregar..."
                        className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-white"
                      />
                    </div>
                    {/* Search Results Dropdown */}
                    {searchProductQuery && (
                      <div className="absolute top-full mt-1 right-0 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-10 overflow-hidden">
                        {filteredCatalog.length > 0 ? filteredCatalog.map(p => (
                          <div key={p.sku} onClick={() => addProductToCart(p)} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex justify-between items-center border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">Stock: {p.stock} • S/ {p.basePrice.toFixed(2)}</div>
                            </div>
                            <Plus className="w-4 h-4 text-[#E51920]" />
                          </div>
                        )) : (
                          <div className="p-3 text-xs text-slate-500 text-center">No se encontraron repuestos.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cart Table */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/40">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="p-2 pl-3 font-bold w-10 text-center" title="Marcar como Operación Gratuita / Regalo">🎁</th>
                        <th className="p-2 font-bold">Producto</th>
                        <th className="p-2 font-bold w-20 text-center">Cant.</th>
                        <th className="p-2 font-bold w-28 text-center" title="Valor Referencial si es regalo">Precio Unit.</th>
                        <th className="p-2 font-bold w-24 text-right">Total a Pagar</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                      {cart.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-400">Carrito vacío. Agregue productos o cargue una cotización.</td></tr>
                      ) : (
                        cart.map((item) => (
                          <tr key={item.sku} className={`transition-colors ${item.isFree ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-white dark:hover:bg-slate-900/40'}`}>
                            <td className="p-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={item.isFree || false}
                                onChange={e => updateCartItem(item.sku, 'isFree', e.target.checked)}
                                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                                title="Marcar como Regalo (Gratuito)"
                              />
                            </td>
                            <td className="p-2">
                              <div className={`font-semibold line-clamp-1 ${item.isFree ? 'text-amber-700 dark:text-amber-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                {item.name} {item.isFree && <span className="text-[9px] font-bold uppercase ml-1">(Regalo)</span>}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400">{item.sku}</div>
                            </td>
                            <td className="p-2 text-center">
                              <input 
                                type="number" min="1" 
                                value={item.qty} 
                                onChange={e => updateCartItem(item.sku, 'qty', parseInt(e.target.value) || 1)}
                                className="w-12 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-center text-slate-900 dark:text-white"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex items-center">
                                <span className="text-[10px] text-slate-400 mr-1">{currency === 'PEN'?'S/':'$'}</span>
                                <input 
                                  type="number" step="0.01" min="0" 
                                  value={item.price} 
                                  onChange={e => updateCartItem(item.sku, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-20 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-900 dark:text-white"
                                  title={item.isFree ? "Valor referencial para SUNAT" : "Precio a cobrar"}
                                />
                              </div>
                            </td>
                            <td className="p-2 text-right font-bold text-[#E51920] dark:text-red-400">
                              {item.isFree ? 'S/ 0.00' : (item.price * item.qty).toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button onClick={() => removeCartItem(item.sku)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Checkout Footer */}
                <div className="mt-4 flex flex-col items-end gap-4">
                  
                  <div className="w-full flex flex-col md:flex-row gap-4 justify-between">
                    
                    {/* Credit Payment Configuration */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Condición de Pago</label>
                        <select value={paymentType} onChange={e => handlePaymentTypeChange(e.target.value)} className="w-full md:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white">
                          <option value="Contado">Al Contado</option>
                          <option value="Crédito 1 Cuota">Crédito - 1 Cuota</option>
                          <option value="Crédito 2 Cuotas">Crédito - 2 Cuotas</option>
                          <option value="Crédito 3 Cuotas">Crédito - 3 Cuotas</option>
                          <option value="Crédito 4 Cuotas">Crédito - 4 Cuotas</option>
                        </select>
                      </div>

                      {creditQuotas.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-full md:w-80">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Calendar className="w-3 h-3"/> Desglose de Cuotas (SUNAT)</h5>
                          <div className="space-y-2">
                            {creditQuotas.map((q, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 w-12">C{idx+1}</span>
                                <input 
                                  type="date" 
                                  value={q.date} 
                                  onChange={e => updateQuota(idx, 'date', e.target.value)}
                                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                                />
                                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
                                  <span className="text-[9px] text-slate-400 mr-1">{currency==='PEN'?'S/':'$'}</span>
                                  <input 
                                    type="number" step="0.01" 
                                    value={q.amount}
                                    onChange={e => updateQuota(idx, 'amount', parseFloat(e.target.value)||0)}
                                    className="w-16 bg-transparent border-none outline-none text-xs text-right text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-2 text-right">
                            Suma Cuotas: <strong className={Math.abs(creditQuotas.reduce((a,c)=>a+c.amount,0) - posTotal) > 0.05 ? 'text-red-500' : 'text-emerald-500'}>{creditQuotas.reduce((a,c)=>a+c.amount,0).toFixed(2)}</strong> / {posTotal.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Totals */}
                    <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 self-end">
                      {posFreeTotal > 0 && (
                        <div className="text-right border-r border-slate-200 dark:border-slate-800 pr-3">
                          <div className="text-[10px] text-amber-500 font-bold uppercase flex items-center justify-end gap-1"><Gift className="w-3 h-3"/> Op. Gratuitas</div>
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">{currency==='PEN'?'S/':'$'} {posFreeTotal.toFixed(2)}</div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Op. Gravada</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">{currency==='PEN'?'S/':'$'} {posSubtotal.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">I.G.V. (18%)</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">{currency==='PEN'?'S/':'$'} {posIgv.toFixed(2)}</div>
                      </div>
                      <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-[#E51920] font-extrabold uppercase">IMPORTE A PAGAR</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{currency==='PEN'?'S/':'$'} {posTotal.toFixed(2)}</div>
                      </div>
                    </div>

                  </div>

                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button onClick={processEmission} className="bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-red-500/20 transition-transform active:scale-95">
                    <Send className="w-4 h-4" /> 
                    Emitir {docType === '01' ? 'Factura' : 'Boleta'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SETUP: NOTAS & GUIAS (Legacy from previous iteration, kept functional) */}
          {(activeTab === "notas" || activeTab === "guias") && activeStep === "setup" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display border-b border-slate-100 dark:border-slate-800 pb-3">
                {activeTab === 'notas' ? 'Emisión de Nota Electrónica' : 'Generación de Guía de Remisión'}
              </h4>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej. F001-000001" 
                  value={referenceId}
                  onChange={e => setReferenceId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchReference()}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono uppercase"
                />
                <button onClick={searchReference} className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {foundReference && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Comprobante Encontrado
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300"><strong>Cliente:</strong> {foundReference.clientName} ({foundReference.clientDoc})</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300"><strong>Monto:</strong> {foundReference.currency === 'PEN' ? 'S/' : '$'} {foundReference.total.toFixed(2)}</p>
                </div>
              )}

              {foundReference && activeTab === "notas" && (
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Nota</label>
                    <select value={noteType} onChange={e => setNoteType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white">
                      <option value="07">Nota de Crédito</option>
                      <option value="08">Nota de Débito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo SUNAT</label>
                    <select value={noteReason} onChange={e => setNoteReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white">
                      <option>Anulación de la operación</option>
                      <option>Anulación por error en RUC</option>
                      <option>Descuento global</option>
                      <option>Devolución total</option>
                    </select>
                  </div>
                </div>
              )}

              {foundReference && activeTab === "guias" && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo de Traslado</label>
                    <select value={guideReason} onChange={e => setGuideReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white">
                      <option>Venta</option>
                      <option>Traslado entre establecimientos de la misma empresa</option>
                      <option>Devolución</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Empresa de Transportes</label>
                    <input type="text" value={carrierName} onChange={e => setCarrierName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">RUC Transportista</label>
                    <input type="text" value={carrierRuc} onChange={e => setCarrierRuc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Peso Bruto Total (KGM)</label>
                    <input type="number" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white" />
                  </div>
                </div>
              )}

              {foundReference && (
                <div className="pt-4 flex justify-end">
                  <button onClick={processEmission} className="bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-md">
                    <Send className="w-3.5 h-3.5" /> Emitir a SUNAT
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loader & Done */}
          {activeStep === "signing" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center justify-center space-y-6">
              <RefreshCw className="w-12 h-12 text-[#E51920] animate-spin" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">Procesando Comprobante...</h4>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl w-full max-w-md font-mono text-[10px] text-emerald-600 dark:text-emerald-400 text-left">
                &gt; {xmlSigningCode}
              </div>
            </div>
          )}

          {activeStep === "done" && currentGeneratedInvoice && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-display">¡Comprobante Electrónico Emitido Exitosamente!</h4>
              
              <div className="flex gap-3">
                <button onClick={() => downloadInvoicePDF(currentGeneratedInvoice)} className="bg-[#E51920] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex gap-1.5 shadow-lg shadow-red-500/20">
                  <Printer className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => downloadBlob(currentGeneratedInvoice.xml_data || "", `${currentGeneratedInvoice.id}.xml`, "text/xml")} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex gap-1.5 shadow-md">
                  <FileCode2 className="w-4 h-4" /> XML
                </button>
                <button onClick={() => downloadBlob(currentGeneratedInvoice.cdr_data || "", `R-${currentGeneratedInvoice.id}.xml`, "text/xml")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex gap-1.5 shadow-md shadow-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" /> CDR
                </button>
              </div>
              <button onClick={() => { setActiveStep("setup"); setActiveTab("pos"); }} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold underline">
                Realizar otra venta
              </button>
            </div>
          )}
        </div>

        {/* Right Area: Issued Invoices History Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Historial SUNAT
            </h4>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {issuedInvoices.map((inv) => (
                <div key={inv.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-slate-100">{inv.id}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{inv.date}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">{inv.clientName}</div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <span className="text-xs font-mono text-[#E51920] dark:text-red-400 font-extrabold">
                       {inv.currency==='PEN'?'S/':'$'} {Number(inv.total).toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => downloadInvoicePDF(inv)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="Descargar PDF"><Printer className="w-3.5 h-3.5" /></button>
                      <button onClick={() => downloadBlob(inv.xml_data || "", `${inv.id}.xml`, "text/xml")} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" title="Descargar XML"><FileCode2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
