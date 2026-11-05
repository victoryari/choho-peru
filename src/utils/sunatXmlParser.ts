/**
 * Parser de Facturas y Comprobantes Electrónicos SUNAT (UBL 2.1)
 * Extrae automáticamente todos los campos del archivo XML para evitar
 * transcripción manual en rendiciones de caja chica y viáticos.
 */

export interface ParsedSunatInvoice {
  docType: 'Factura' | 'Boleta' | 'Nota de Crédito' | 'Nota de Débito' | 'Ticket';
  docTypeCode: string;
  series: string;
  number: string;
  fullId: string;
  issueDate: string;
  currency: string;
  rucIssuer: string;
  companyName: string;
  subtotal: number;
  igv: number;
  totalAmount: number;
  description: string;
  suggestedCategory: 'Alimentación' | 'Movilidad' | 'Combustible' | 'Peaje' | 'Útiles y Oficina' | 'Envíos y Mensajería' | 'Mantenimiento' | 'Otros';
  rawXml: string;
}

/**
 * Busca el contenido de texto del primer nodo que coincida con el nombre local (ignorando prefijos cac/cbc)
 */
function getTagText(parent: Element | Document, localName: string): string {
  // Intentar primero con getElementsByTagNameNS si el navegador lo soporta bien
  try {
    const nsNodes = parent.getElementsByTagNameNS("*", localName);
    if (nsNodes && nsNodes.length > 0 && nsNodes[0].textContent) {
      return nsNodes[0].textContent.trim();
    }
  } catch {
    // fallback
  }

  // Buscar por nombre directo o nombre con prefijo
  const allElements = parent.getElementsByTagName("*");
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    if (el.localName === localName || el.nodeName === localName || el.nodeName.endsWith(":" + localName)) {
      return (el.textContent || "").trim();
    }
  }
  return "";
}

/**
 * Sugiere una categoría de gasto en función de la razón social y la descripción del producto/servicio
 */
function inferCategory(companyName: string, description: string): ParsedSunatInvoice['suggestedCategory'] {
  const combined = (companyName + " " + description).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (/(restauran|comida|alimento|almuerzo|cena|desayuno|cafe|chifa|polleria|supermercado|ceviche|panaderia|snack|kfc|bembos|pizza|menu)/.test(combined)) {
    return "Alimentación";
  }
  if (/(combustible|gasolina|diesel|grifo|repsol|primax|petroperu|gasocentro|gnv|glp|pecsa|valero)/.test(combined)) {
    return "Combustible";
  }
  if (/(peaje|rutas de lima|lima expresa|coviperu|norvial|survial|concesion|autopista|covinca)/.test(combined)) {
    return "Peaje";
  }
  if (/(taxi|pasaje|transporte|terminal|movilidad|aerolinea|latam|vuelo|bus|crucero|civa|movil bus|oltursa|itinerario)/.test(combined)) {
    return "Movilidad";
  }
  if (/(papeleria|libreria|oficina|utiles|impresion|copias|fotocopia|toner|tintas|cuaderno|artesco|tailoy|tai loy)/.test(combined)) {
    return "Útiles y Oficina";
  }
  if (/(courier|envio|olva|shalom|marvisur|encomienda|paqueteria|flete|transporte carga|delivery)/.test(combined)) {
    return "Envíos y Mensajería";
  }
  if (/(mantenimiento|reparacion|taller|repuesto|mecanic|ferreteria|soldadura|cambio de aceite|lubricante|llantas)/.test(combined)) {
    return "Mantenimiento";
  }

  return "Otros";
}

/**
 * Parsea el texto XML de un comprobante electrónico SUNAT UBL 2.1
 */
export function parseSunatInvoiceXml(xmlString: string): ParsedSunatInvoice {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Verificar si hubo error de parseo XML
  const parserError = xmlDoc.getElementsByTagName("parsererror");
  if (parserError.length > 0) {
    throw new Error("El archivo no es un XML válido o está dañado.");
  }

  // 1. Tipo de Comprobante
  const typeCode = getTagText(xmlDoc, "InvoiceTypeCode") || "01";
  let docType: ParsedSunatInvoice['docType'] = "Factura";
  if (typeCode === "01") docType = "Factura";
  else if (typeCode === "03") docType = "Boleta";
  else if (typeCode === "07") docType = "Nota de Crédito";
  else if (typeCode === "08") docType = "Nota de Débito";
  else if (xmlDoc.documentElement.localName.includes("CreditNote")) docType = "Nota de Crédito";
  else if (xmlDoc.documentElement.localName.includes("DebitNote")) docType = "Nota de Débito";

  // 2. Serie y Correlativo (cbc:ID)
  const fullId = getTagText(xmlDoc, "ID") || "";
  let series = "F001";
  let number = "00000001";
  if (fullId.includes("-")) {
    const parts = fullId.split("-");
    series = parts[0].trim();
    number = parts[1].trim();
  } else if (fullId.length > 4) {
    series = fullId.substring(0, 4);
    number = fullId.substring(4);
  }

  // 3. Fecha de Emisión (cbc:IssueDate)
  const rawDate = getTagText(xmlDoc, "IssueDate") || new Date().toISOString().slice(0, 10);
  const issueDate = rawDate.slice(0, 10);

  // 4. Moneda (cbc:DocumentCurrencyCode)
  const currency = getTagText(xmlDoc, "DocumentCurrencyCode") || "PEN";

  // 5. RUC y Razón Social del Emisor (cac:AccountingSupplierParty)
  let rucIssuer = "";
  let companyName = "";

  const supplierNodes = xmlDoc.getElementsByTagName("*");
  for (let i = 0; i < supplierNodes.length; i++) {
    const el = supplierNodes[i];
    if (el.localName === "AccountingSupplierParty" || el.nodeName.endsWith(":AccountingSupplierParty")) {
      rucIssuer = getTagText(el, "CustomerAssignedAccountID") || getTagText(el, "ID");
      companyName = getTagText(el, "RegistrationName") || getTagText(el, "Name");
      break;
    }
  }

  // Fallbacks si no los halló dentro de AccountingSupplierParty
  if (!rucIssuer) {
    const allIds = xmlDoc.getElementsByTagName("*");
    for (let i = 0; i < allIds.length; i++) {
      const el = allIds[i];
      if ((el.localName === "ID" || el.nodeName.endsWith(":ID")) && /^\d{11}$/.test((el.textContent || "").trim())) {
        rucIssuer = (el.textContent || "").trim();
        break;
      }
    }
  }

  if (!companyName) {
    companyName = getTagText(xmlDoc, "RegistrationName") || getTagText(xmlDoc, "Name") || "Proveedor Electrónico";
  }

  // 6. Montos: Total, IGV y Subtotal
  let totalAmount = 0;
  let igv = 0;
  let subtotal = 0;

  const payableRaw = getTagText(xmlDoc, "PayableAmount") || getTagText(xmlDoc, "TaxInclusiveAmount");
  if (payableRaw) {
    totalAmount = parseFloat(payableRaw) || 0;
  }

  const taxAmountRaw = getTagText(xmlDoc, "TaxAmount");
  if (taxAmountRaw) {
    igv = parseFloat(taxAmountRaw) || 0;
  }

  const taxableRaw = getTagText(xmlDoc, "TaxableAmount") || getTagText(xmlDoc, "LineExtensionAmount");
  if (taxableRaw) {
    subtotal = parseFloat(taxableRaw) || 0;
  } else if (totalAmount > 0) {
    subtotal = Number((totalAmount - igv).toFixed(2));
  }

  // 7. Descripción del primer ítem
  let description = "";
  for (let i = 0; i < supplierNodes.length; i++) {
    const el = supplierNodes[i];
    if (el.localName === "InvoiceLine" || el.nodeName.endsWith(":InvoiceLine") || el.localName === "Item" || el.nodeName.endsWith(":Item")) {
      description = getTagText(el, "Description");
      if (description) break;
    }
  }

  if (!description) {
    description = `Consumo / Compra según comprobante ${series}-${number}`;
  }

  // 8. Inferencia inteligente de categoría
  const suggestedCategory = inferCategory(companyName, description);

  return {
    docType,
    docTypeCode: typeCode,
    series,
    number,
    fullId: fullId || `${series}-${number}`,
    issueDate,
    currency: currency === "USD" ? "USD" : "PEN",
    rucIssuer,
    companyName,
    subtotal: Math.max(0, subtotal),
    igv: Math.max(0, igv),
    totalAmount: Math.max(0, totalAmount),
    description,
    suggestedCategory,
    rawXml: xmlString
  };
}
