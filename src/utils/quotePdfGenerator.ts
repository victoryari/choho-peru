import { jsPDF } from "jspdf";
import { Quote, CompanySettings } from "../types";
import { useAppStore } from "../store/useAppStore";

/**
 * Normaliza número de teléfono celular peruano para el enlace de WhatsApp.
 * Si tiene 9 dígitos (ej. 987654321), antepone el prefijo internacional '51'.
 */
export function normalizePeruvianPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) {
    return `51${digits}`;
  }
  if (digits.startsWith("51") && digits.length === 11) {
    return digits;
  }
  return digits;
}

/**
 * Genera el mensaje formateado para enviar por WhatsApp.
 */
export function buildQuoteWhatsAppMessage(quote: Quote, customSettings?: CompanySettings | null): string {
  const settings = customSettings || (typeof window !== "undefined" ? useAppStore.getState().companySettings : null);
  const tradeName = settings?.tradeName || "CHOHO®";
  const slogan = settings?.slogan || "Calidad y resistencia superior al original";
  const phone = settings?.phone || "(01) 719-2000";
  const email = settings?.email || "ventas@choho.pe";

  const cleanDate = quote.date
    ? new Date(quote.date).toLocaleDateString("es-PE")
    : new Date().toLocaleDateString("es-PE");

  const itemsCount = quote.items?.length || 0;
  const itemsSummary = quote.items && quote.items.length > 0
    ? quote.items
        .slice(0, 5)
        .map((it) => `• ${it.qty}x ${it.name} - S/ ${(it.qty * it.price).toFixed(2)}`)
        .join("\n")
    : "• Repuestos de transmisión";

  const moreNotice = itemsCount > 5 ? `\n...y ${itemsCount - 5} ítem(s) más en el PDF adjunto.` : "";

  return (
    `*${tradeName.toUpperCase()} - COTIZACIÓN COMERCIAL* 🏍️⚙️\n` +
    `_${slogan}_\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📄 *Cotización:* ${quote.id}\n` +
    `👤 *Cliente:* ${quote.clientName}\n` +
    (quote.clientDoc ? `🆔 *RUC / DNI:* ${quote.clientDoc}\n` : "") +
    `📅 *Fecha:* ${cleanDate}\n` +
    `💳 *Condición de Pago:* ${quote.paymentType || "Contado Inmediato"}\n` +
    `⏳ *Validez de Oferta:* ${quote.validityDays || 15} días calendario\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *Ítems Cotizados:* (${itemsCount} productos)\n` +
    `${itemsSummary}${moreNotice}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *TOTAL NETO: S/ ${Number(quote.total).toFixed(2)}* (Incluye I.G.V.)\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👨‍💼 *Asesor:* ${quote.advisor || "Asesor Comercial"}\n` +
    `📞 *Central:* ${phone} | ${email}\n\n` +
    `📎 *Adjunto le comparto el documento PDF oficial con el desglose técnico, precios unitarios y cuentas bancarias.*`
  );
}

/**
 * Genera el documento PDF formal de la cotización usando jsPDF.
 * Retorna el documento jsPDF, el Blob y el nombre de archivo sugerido.
 */
export function generateQuotePDF(
  quote: Quote,
  options?: { autoDownload?: boolean; companySettings?: CompanySettings }
): { doc: jsPDF; blob: Blob; filename: string } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 14;
  const marginRight = 196;
  const contentWidth = marginRight - marginLeft; // 182mm

  // Configuración de la empresa (o valores predeterminados)
  const settings = options?.companySettings || (typeof window !== "undefined" ? useAppStore.getState().companySettings : null);
  const companyName = settings?.companyName || "CHOHO PERÚ S.A.C.";
  const tradeName = settings?.tradeName || "CHOHO®";
  const ruc = settings?.ruc || "20608542193";
  const address = settings?.address || "Av. República de Panamá 3505, San Isidro, Lima";
  const phone = settings?.phone || "(01) 719-2000";
  const email = settings?.email || "ventas@choho.pe";
  const website = settings?.website || "www.choho.pe";
  const slogan = settings?.slogan || "MEJOR QUE EL ORIGINAL";
  const customLogo = settings?.logoUrl;

  // Colores corporativos CHOHO / Sage
  const primaryR = 16;
  const primaryG = 64;
  const primaryB = 51; // #104033 - Verde Sage Oscuro CHOHO

  const textDarkR = 31;
  const textDarkG = 41;
  const textDarkB = 55; // #1F2937

  const textMutedR = 100;
  const textMutedG = 116;
  const textMutedB = 139; // #64748B

  const borderR = 226;
  const borderG = 232;
  const borderB = 240; // #E2E8F0

  const fillLightR = 248;
  const fillLightG = 250;
  const fillLightB = 252; // #F8FAFC

  // 1. Barra superior decorativa
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.rect(0, 0, pageWidth, 5, "F");

  // 2. Encabezado principal: Logo y Razón Social
  let currentY = 16;

  // Dibujar Logotipo (si el usuario subió imagen personalizada o texto de marca)
  if (customLogo && (customLogo.startsWith("data:image/") || customLogo.startsWith("blob:"))) {
    try {
      const isJpg = customLogo.includes("image/jpeg") || customLogo.includes("image/jpg");
      doc.addImage(customLogo, isJpg ? "JPEG" : "PNG", marginLeft, currentY - 6, 26, 14, undefined, "FAST");
      // Marca junto al logo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryR, primaryG, primaryB);
      doc.text(tradeName, marginLeft + 30, currentY);

      // Badge Slogan
      if (slogan) {
        doc.setFillColor(primaryR, primaryG, primaryB);
        doc.roundedRect(marginLeft + 30 + (tradeName.length * 4) + 6, currentY - 4.5, 38, 5.5, 1.2, 1.2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(slogan.substring(0, 24), marginLeft + 32 + (tradeName.length * 4) + 6, currentY - 1);
      }
    } catch (e) {
      // Fallback a texto
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(primaryR, primaryG, primaryB);
      doc.text(tradeName, marginLeft, currentY);
    }
  } else {
    // Logotipo por defecto
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(tradeName, marginLeft, currentY);

    if (slogan) {
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.roundedRect(marginLeft + 44, currentY - 5, 42, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(slogan.substring(0, 26), marginLeft + 46, currentY - 1);
    }
  }

  // Datos de la empresa emisora
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  doc.text(`${companyName} • RUC: ${ruc}`, marginLeft, currentY + 5.5);
  doc.text(address.substring(0, 56), marginLeft, currentY + 9.5);
  doc.text(`${email} • ${website} • Central: ${phone}`, marginLeft, currentY + 13.5);

  // 3. Tarjeta de Cotización (Lado derecho superior)
  const quoteBoxX = 130;
  const quoteBoxY = 11;
  const quoteBoxW = 66;
  const quoteBoxH = 27;

  // Fondo y borde de la tarjeta
  doc.setFillColor(fillLightR, fillLightG, fillLightB);
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(0.6);
  doc.roundedRect(quoteBoxX, quoteBoxY, quoteBoxW, quoteBoxH, 2.5, 2.5, "FD");

  // Cabecera de la tarjeta
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.roundedRect(quoteBoxX, quoteBoxY, quoteBoxW, 7.5, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("COTIZACIÓN COMERCIAL", quoteBoxX + quoteBoxW / 2, quoteBoxY + 5.2, { align: "center" });

  // Número de cotización
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text(quote.id || "COT-2026-0000", quoteBoxX + quoteBoxW / 2, quoteBoxY + 14.5, { align: "center" });

  // Fecha y Moneda
  const formattedDate = quote.date
    ? new Date(quote.date).toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" })
    : new Date().toLocaleDateString("es-PE");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(textDarkR, textDarkG, textDarkB);
  doc.text(`Fecha: ${formattedDate}`, quoteBoxX + quoteBoxW / 2, quoteBoxY + 20, { align: "center" });
  doc.text(`Moneda: Soles (PEN)`, quoteBoxX + quoteBoxW / 2, quoteBoxY + 24.5, { align: "center" });

  // 4. Bloques de Información: Cliente (izq) y Condiciones Comerciales (der)
  currentY = 43;
  const cardHeight = 31;
  const clientCardW = 112;
  const termsCardW = contentWidth - clientCardW - 4; // 66mm
  const termsCardX = marginLeft + clientCardW + 4;

  // Tarjeta Cliente
  doc.setFillColor(fillLightR, fillLightG, fillLightB);
  doc.setDrawColor(borderR, borderG, borderB);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, clientCardW, cardHeight, 2, 2, "FD");

  // Título Tarjeta Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text("INFORMACIÓN DEL CLIENTE", marginLeft + 4, currentY + 5.5);

  // Línea divisoria suave
  doc.setDrawColor(borderR, borderG, borderB);
  doc.line(marginLeft + 4, currentY + 7, marginLeft + clientCardW - 4, currentY + 7);

  // Datos del Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  doc.text("Razón Social:", marginLeft + 4, currentY + 12);
  doc.text("RUC / DNI:", marginLeft + 4, currentY + 17);
  doc.text("Dirección:", marginLeft + 4, currentY + 22);
  doc.text("Tel./WhatsApp:", marginLeft + 4, currentY + 27);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDarkR, textDarkG, textDarkB);
  const safeClientName = (quote.clientName || "Cliente General").substring(0, 42);
  doc.text(safeClientName, marginLeft + 24, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.text(quote.clientDoc || "S/D", marginLeft + 24, currentY + 17);
  const safeAddress = (quote.clientAddress || "Dirección de despacho registrada en SUNAT").substring(0, 46);
  doc.text(safeAddress, marginLeft + 24, currentY + 22);
  doc.text(quote.clientPhone || "No especificado", marginLeft + 24, currentY + 27);

  // Tarjeta Condiciones Comerciales
  doc.setFillColor(fillLightR, fillLightG, fillLightB);
  doc.setDrawColor(borderR, borderG, borderB);
  doc.roundedRect(termsCardX, currentY, termsCardW, cardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text("CONDICIONES COMERCIALES", termsCardX + 4, currentY + 5.5);

  doc.setDrawColor(borderR, borderG, borderB);
  doc.line(termsCardX + 4, currentY + 7, termsCardX + termsCardW - 4, currentY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  doc.text("Asesor:", termsCardX + 4, currentY + 12);
  doc.text("Forma Pago:", termsCardX + 4, currentY + 17);
  doc.text("Validez:", termsCardX + 4, currentY + 22);
  doc.text("Estado:", termsCardX + 4, currentY + 27);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDarkR, textDarkG, textDarkB);
  doc.text(quote.advisor || "Asesor Comercial", termsCardX + 22, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.text(quote.paymentType || "Contado Inmediato", termsCardX + 22, currentY + 17);
  doc.text(`${quote.validityDays || 15} Días Calendario`, termsCardX + 22, currentY + 22);

  // Status badge
  const isApproved = quote.status === "Aceptada" || quote.status === "Facturada";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isApproved ? 16 : 180, isApproved ? 120 : 83, isApproved ? 60 : 9);
  doc.text(quote.status || "Pendiente", termsCardX + 22, currentY + 27);

  // 5. Tabla de Ítems
  currentY = 79;
  const colX = {
    num: marginLeft + 2,      // 16
    sku: marginLeft + 10,     // 24
    desc: marginLeft + 36,    // 50
    qty: marginLeft + 138,    // 152 (align: "right")
    price: marginLeft + 162,  // 176 (align: "right")
    total: marginRight - 2    // 194 (align: "right")
  };
  const descMaxW = 86; // 86mm ancho máximo para descripción (termina en 136mm, con 16mm de holgura antes de CANT.)

  // Cabecera de la tabla
  const headerHeight = 7.5;
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.roundedRect(marginLeft, currentY, contentWidth, headerHeight, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", colX.num, currentY + 5);
  doc.text("SKU / CÓDIGO", colX.sku, currentY + 5);
  doc.text("DESCRIPCIÓN DEL REPUESTO", colX.desc, currentY + 5);
  doc.text("CANT.", colX.qty, currentY + 5, { align: "right" });
  doc.text("P. UNIT (S/)", colX.price, currentY + 5, { align: "right" });
  doc.text("TOTAL (S/)", colX.total, currentY + 5, { align: "right" });

  currentY += headerHeight;

  // Filas de productos con auto-ajuste de altura y salto de línea para nombres largos
  const items = quote.items || [];

  items.forEach((item, index) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    // Dividir texto largo de la descripción para que nunca se desborde sobre CANT.
    const descLines: string[] = doc.splitTextToSize(item.name || "Repuesto", descMaxW);
    const rowHeight = Math.max(7, descLines.length * 3.8 + 3.2);

    // Si la fila no cabe en la página, crear nueva página
    if (currentY + rowHeight > 240) {
      doc.addPage();
      currentY = 16;
      // Re-dibujar barra de cabecera en página nueva
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.rect(0, 0, pageWidth, 4, "F");

      doc.roundedRect(marginLeft, currentY, contentWidth, headerHeight, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("#", colX.num, currentY + 5);
      doc.text("SKU / CÓDIGO", colX.sku, currentY + 5);
      doc.text("DESCRIPCIÓN DEL REPUESTO", colX.desc, currentY + 5);
      doc.text("CANT.", colX.qty, currentY + 5, { align: "right" });
      doc.text("P. UNIT (S/)", colX.price, currentY + 5, { align: "right" });
      doc.text("TOTAL (S/)", colX.total, currentY + 5, { align: "right" });
      currentY += headerHeight;
    }

    // Fondo alternado (Zebra)
    if (index % 2 === 1) {
      doc.setFillColor(fillLightR, fillLightG, fillLightB);
      doc.rect(marginLeft, currentY, contentWidth, rowHeight, "F");
    }

    // Línea inferior de la fila
    doc.setDrawColor(borderR, borderG, borderB);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, currentY + rowHeight, marginRight, currentY + rowHeight);

    // Texto de la fila
    doc.setTextColor(textDarkR, textDarkG, textDarkB);

    // # y SKU
    doc.setFont("helvetica", "normal");
    doc.text(String(index + 1), colX.num, currentY + 4.8);

    doc.setFont("helvetica", "bold");
    doc.text(item.sku, colX.sku, currentY + 4.8);

    // Descripción multilínea (segura sin sobreponerse)
    doc.setFont("helvetica", "normal");
    descLines.forEach((lineText, lineIdx) => {
      doc.text(lineText, colX.desc, currentY + 4.8 + (lineIdx * 3.6));
    });

    // Cantidad, Precio Unitario y Subtotal
    doc.setFont("helvetica", "bold");
    doc.text(String(item.qty), colX.qty, currentY + 4.8, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text(Number(item.price).toFixed(2), colX.price, currentY + 4.8, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text((item.qty * item.price).toFixed(2), colX.total, currentY + 4.8, { align: "right" });

    currentY += rowHeight;
  });

  // 6. Bloque inferior: Cuentas Bancarias (izq) y Resumen Financiero (der)
  currentY = Math.max(currentY + 5, 215);

  const bankBoxW = 105;
  const totalBoxW = contentWidth - bankBoxW - 4; // 73mm
  const totalBoxX = marginLeft + bankBoxW + 4;
  const bottomBoxH = 36;

  // Caja de Cuentas Bancarias
  doc.setFillColor(fillLightR, fillLightG, fillLightB);
  doc.setDrawColor(borderR, borderG, borderB);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, bankBoxW, bottomBoxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text("DATOS PARA TRANSFERENCIA / DEPÓSITO", marginLeft + 4, currentY + 5.5);

  doc.setDrawColor(borderR, borderG, borderB);
  doc.line(marginLeft + 4, currentY + 7.5, marginLeft + bankBoxW - 4, currentY + 7.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(textDarkR, textDarkG, textDarkB);
  doc.text(`Titular: ${companyName}  (RUC: ${ruc})`, marginLeft + 4, currentY + 12.5);

  const bankAccounts = settings?.bankAccounts && settings.bankAccounts.length > 0
    ? settings.bankAccounts.slice(0, 2)
    : [
        { bankName: "Banco de Crédito del Perú (BCP)", currency: "PEN", accountNumber: "191-2849102-0-45", cci: "002-191-002849102045-52" },
        { bankName: "BBVA Perú", currency: "PEN", accountNumber: "0011-0320-0100084920", cci: "011-320-000100084920-81" }
      ];

  let bY = currentY + 17.5;
  bankAccounts.forEach((acc) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textMutedR, textMutedG, textMutedB);
    doc.text(`• ${acc.bankName} (${acc.currency === "USD" ? "Dólares" : "Soles"}):`, marginLeft + 4, bY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textDarkR, textDarkG, textDarkB);
    doc.text(`  Cta: ${acc.accountNumber}  |  CCI: ${acc.cci}`, marginLeft + 4, bY + 4);
    bY += 9;
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  const billingMail = settings?.billingEmail || email || "pagos@choho.pe";
  doc.text(`Enviar comprobante a ${billingMail} o al WhatsApp del asesor.`, marginLeft + 4, currentY + 34.5);

  // Caja de Totales Financieros
  doc.setFillColor(fillLightR, fillLightG, fillLightB);
  doc.setDrawColor(borderR, borderG, borderB);
  doc.roundedRect(totalBoxX, currentY, totalBoxW, bottomBoxH, 2, 2, "FD");

  const subtotalVal = Number(quote.subtotal || quote.total / 1.18).toFixed(2);
  const igvVal = Number(quote.igv || quote.total - Number(subtotalVal)).toFixed(2);
  const totalVal = Number(quote.total).toFixed(2);
  const igvPercent = settings?.igvPercent || 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  doc.text("Subtotal (Sin Impuesto):", totalBoxX + 4, currentY + 7);
  doc.text(`IGV (${igvPercent}%):`, totalBoxX + 4, currentY + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDarkR, textDarkG, textDarkB);
  doc.text(`S/ ${subtotalVal}`, marginRight - 4, currentY + 7, { align: "right" });
  doc.text(`S/ ${igvVal}`, marginRight - 4, currentY + 13.5, { align: "right" });

  // Banner Total Destacado
  const totalBannerY = currentY + 18.5;
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.roundedRect(totalBoxX + 2, totalBannerY, totalBoxW - 4, 15, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalBoxX + 5, totalBannerY + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`S/ ${totalVal}`, marginRight - 5, totalBannerY + 10.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(230, 240, 235);
  doc.text("Moneda: Soles (PEN) • Impuestos Incluidos", totalBoxX + 5, totalBannerY + 11.5);

  // 7. Términos y Garantía CHOHO
  currentY += bottomBoxH + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text("TÉRMINOS Y CONDICIONES:", marginLeft, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  doc.text(
    "1. Los precios están expresados en Soles (PEN) e incluyen el Impuesto General a las Ventas (I.G.V. 18%).",
    marginLeft,
    currentY + 3.5
  );
  doc.text(
    `2. Oferta comercial válida por ${quote.validityDays || 15} días calendario a partir de su emisión o hasta agotar stock disponible.`,
    marginLeft,
    currentY + 7
  );
  doc.text(
    "3. Garantía oficial de fábrica CHOHO® contra defectos de fabricación. Producto 100% original con sello de autenticidad.",
    marginLeft,
    currentY + 10.5
  );

  // 8. Pie de Página
  doc.setDrawColor(borderR, borderG, borderB);
  doc.line(marginLeft, pageHeight - 12, marginRight, pageHeight - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(textMutedR, textMutedG, textMutedB);
  doc.text(
    "CHOHO PERÚ • Cadena y Transmisión de Alta Resistencia • Generado electrónicamente",
    marginLeft,
    pageHeight - 8
  );
  doc.text("Página 1 de 1", marginRight, pageHeight - 8, { align: "right" });

  const filename = `Cotizacion_${quote.id || "CHOHO"}.pdf`;

  if (options?.autoDownload) {
    doc.save(filename);
  }

  const blob = doc.output("blob");
  return { doc, blob, filename };
}

/**
 * Comparte la cotización por WhatsApp con el cliente:
 * - En móviles / navegadores con soporte de Web Share API con archivos:
 *   Abre la hoja nativa con el PDF adjunto directamente hacia WhatsApp.
 * - En PC / navegadores de escritorio:
 *   Descarga automáticamente el PDF al computador y abre la ventana de WhatsApp Web
 *   con el mensaje estructurado pre-cargado para que el asesor solo adjunte el archivo.
 */
export async function shareQuoteViaWhatsApp(
  quote: Quote,
  clientPhone?: string
): Promise<{ success: boolean; method: "native-share" | "whatsapp-web" | "cancelled" }> {
  const targetPhone = normalizePeruvianPhone(clientPhone || quote.clientPhone);
  const message = buildQuoteWhatsAppMessage(quote);
  const { blob, filename, doc } = generateQuotePDF(quote);

  // 1. Intentar Web Share API con archivo adjunto (Móviles Android / iOS Safari / etc.)
  if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
    try {
      const pdfFile = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Cotización ${quote.id} - CHOHO Perú`,
          text: message,
          files: [pdfFile]
        });
        return { success: true, method: "native-share" };
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false, method: "cancelled" };
      }
      console.warn("[PDF SHARE] Web Share falló, procediendo con descarga y WhatsApp Web:", err);
    }
  }

  // 2. Fallback de Escritorio / WhatsApp Web:
  // Descargar el PDF localmente en la máquina del vendedor
  doc.save(filename);

  // Abrir WhatsApp Web con el texto estructurado
  const waUrl = targetPhone
    ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(waUrl, "_blank", "noopener,noreferrer");

  return { success: true, method: "whatsapp-web" };
}
