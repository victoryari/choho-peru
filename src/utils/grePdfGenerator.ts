import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface GuideForPdf {
  id: string;
  issue_date: string;
  transfer_date: string;
  transport_mode: "PUBLICO" | "PRIVADO";
  transfer_reason: string;
  receiver_doc_type?: string;
  receiver_doc?: string;
  receiver_name?: string;
  carrier_ruc?: string | null;
  carrier_name?: string | null;
  driver_name?: string | null;
  driver_license?: string | null;
  vehicle_plate?: string | null;
  origin_ubigeo: string;
  origin_address: string;
  destination_ubigeo: string;
  destination_address: string;
  total_weight_kg: number | string;
  packages_count: number;
  items?: Array<{ sku: string; name: string; qty: number }> | string | null;
  sunat_status?: string;
  hash?: string | null;
}

const REASON: Record<string, string> = { "01": "Venta", "04": "Traslado entre establecimientos de la misma empresa" };

export async function generateGuidePDF(
  guide: GuideForPdf,
  company: { name: string; ruc: string },
  opts: { autoDownload?: boolean } = { autoDownload: true }
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const items = typeof guide.items === "string" ? JSON.parse(guide.items) : guide.items || [];
  const [serie, numero] = guide.id.split("-");
  const fecha = String(guide.issue_date).slice(0, 10);

  // Cabecera
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(company.name, 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC ${company.ruc}`, 14, 24);

  doc.setDrawColor(40);
  doc.rect(130, 10, 66, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`RUC ${company.ruc}`, 163, 17, { align: "center" });
  doc.text("GUÍA DE REMISIÓN ELECTRÓNICA", 163, 23, { align: "center" });
  doc.text("REMITENTE", 163, 28, { align: "center" });
  doc.setFontSize(11);
  doc.text(guide.id, 163, 31.5, { align: "center" });

  // Datos del traslado
  let y = 42;
  doc.setFontSize(9);
  const row = (k: string, v: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, 14, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(v || "-", 140);
    doc.text(lines, 56, y);
    y += 5.2 * lines.length;
  };
  row("Fecha de emisión:", fecha);
  row("Fecha de traslado:", String(guide.transfer_date).slice(0, 10));
  row("Motivo de traslado:", REASON[guide.transfer_reason] || guide.transfer_reason);
  row("Destinatario:", `${guide.receiver_name || ""} (${guide.receiver_doc_type || "DOC"} ${guide.receiver_doc || ""})`);
  row("Punto de partida:", `${guide.origin_address} [Ubigeo ${guide.origin_ubigeo}]`);
  row("Punto de llegada:", `${guide.destination_address} [Ubigeo ${guide.destination_ubigeo}]`);
  row("Modalidad:", guide.transport_mode === "PUBLICO" ? "Transporte público" : "Transporte privado");
  if (guide.transport_mode === "PUBLICO") {
    row("Transportista:", `${guide.carrier_name || ""} (RUC ${guide.carrier_ruc || ""})`);
  } else {
    row("Conductor:", `${guide.driver_name || ""} - Licencia ${guide.driver_license || ""}`);
    row("Placa:", guide.vehicle_plate || "");
  }
  row("Peso bruto total:", `${Number(guide.total_weight_kg).toFixed(2)} KGM`);
  row("N.º de bultos:", String(guide.packages_count));

  // Tabla de items
  y += 3;
  doc.setFillColor(235, 235, 235);
  doc.rect(14, y - 4.5, 182, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.text("N.º", 16, y);
  doc.text("Código", 28, y);
  doc.text("Descripción", 58, y);
  doc.text("Cant.", 190, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 7;
  items.forEach((it: any, i: number) => {
    if (y > 255) { doc.addPage(); y = 20; }
    const desc = doc.splitTextToSize(String(it.name), 118);
    doc.text(String(i + 1), 16, y);
    doc.text(String(it.sku), 28, y);
    doc.text(desc, 58, y);
    doc.text(String(it.qty), 190, y, { align: "right" });
    y += 5 * desc.length + 1;
  });

  // QR + hash + estado
  const qrText = `${company.ruc}|09|${serie}|${numero}|${fecha}|${guide.receiver_doc_type === "RUC" ? "6" : "1"}|${guide.receiver_doc || ""}`;
  const qr = await QRCode.toDataURL(qrText, { margin: 1, width: 180 });
  const qy = Math.max(y + 8, 235);
  doc.addImage(qr, "PNG", 14, qy, 32, 32);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Huella (SHA-256):", 50, qy + 6);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(guide.hash || "-", 140), 50, qy + 11);
  if (guide.sunat_status && guide.sunat_status !== "ACEPTADO") {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 60, 0);
    doc.text(`Estado SUNAT: ${guide.sunat_status} (pendiente de firma y envío a SUNAT)`, 50, qy + 24);
    doc.setTextColor(0);
  }

  if (opts.autoDownload !== false) doc.save(`${guide.id}.pdf`);
  return doc;
}
