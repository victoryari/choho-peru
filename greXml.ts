/**
 * Generador de Guia de Remision Electronica - Remitente (UBL 2.1 DespatchAdvice, tipo 09).
 *
 * Modulo puro (sin acceso a BD ni red) para poder probarlo de forma aislada.
 *
 * ALCANCE: construye el XML y su hash. NO firma digitalmente ni envia a SUNAT:
 * eso requiere certificado digital y credenciales SOL/API GRE de la empresa, que
 * no existen en este proyecto. Por eso el estado inicial de una guia es
 * PENDIENTE_ENVIO y no ACEPTADO.
 */
import { createHash } from "crypto";

export type TransportMode = "PUBLICO" | "PRIVADO";

export interface GreLine {
  sku: string;
  name: string;
  qty: number;
  unit?: string; // codigo UN/ECE, por defecto NIU (unidad)
}

export interface GreInput {
  id: string; // T001-00000001
  issueDate: Date;
  transferDate: string; // YYYY-MM-DD
  transferReason: string; // 01 Venta, 04 Traslado entre establecimientos
  transportMode: TransportMode;
  totalWeightKg: number;
  packagesCount: number;

  sender: { ruc: string; name: string };
  receiver: { docType: "RUC" | "DNI" | "DOC"; doc: string; name: string };

  carrier?: { ruc: string; name: string }; // modalidad publica
  driver?: { docType: string; docNumber: string; name: string; license: string }; // privada
  vehiclePlate?: string; // privada

  originUbigeo: string;
  originAddress: string;
  destinationUbigeo: string;
  destinationAddress: string;

  lines: GreLine[];
}

const REASON_LABEL: Record<string, string> = {
  "01": "VENTA",
  "04": "TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA",
};

export const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const docSchemeId = (t: string) => (t === "RUC" ? "6" : t === "DNI" ? "1" : "0");

/** Devuelve la lista de errores de validacion; vacia si la guia es emitible. */
export function validarGre(g: GreInput): string[] {
  const errs: string[] = [];
  if (!/^[A-Z0-9]{4}-\d{1,8}$/.test(g.id)) errs.push("Numero de guia invalido (esperado T001-00000001).");
  if (!/^\d{11}$/.test(g.sender.ruc)) errs.push("RUC del remitente invalido.");
  if (!g.receiver.doc) errs.push("Falta documento del destinatario.");
  if (g.receiver.docType === "RUC" && !/^\d{11}$/.test(g.receiver.doc)) errs.push("RUC del destinatario invalido.");
  if (g.receiver.docType === "DNI" && !/^\d{8}$/.test(g.receiver.doc)) errs.push("DNI del destinatario invalido.");
  if (!/^\d{6}$/.test(g.originUbigeo)) errs.push("Ubigeo de partida invalido (6 digitos).");
  if (!/^\d{6}$/.test(g.destinationUbigeo)) errs.push("Ubigeo de llegada invalido (6 digitos).");
  if (!g.originAddress.trim()) errs.push("Falta direccion de partida.");
  if (!g.destinationAddress.trim()) errs.push("Falta direccion de llegada.");
  if (!(g.totalWeightKg > 0)) errs.push("El peso bruto total debe ser mayor a 0.");
  if (!(g.packagesCount >= 1)) errs.push("Debe indicar al menos 1 bulto.");
  if (g.lines.length === 0) errs.push("La guia no tiene items.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.transferDate)) errs.push("Fecha de traslado invalida.");
  if (g.transportMode === "PUBLICO") {
    if (!g.carrier || !/^\d{11}$/.test(g.carrier.ruc)) errs.push("RUC del transportista invalido.");
    if (!g.carrier?.name?.trim()) errs.push("Falta razon social del transportista.");
  } else {
    if (!g.vehiclePlate?.trim()) errs.push("Falta placa del vehiculo.");
    if (!g.driver?.docNumber?.trim() || !g.driver?.name?.trim() || !g.driver?.license?.trim()) {
      errs.push("Faltan datos del conductor (documento, nombre y licencia).");
    }
  }
  return errs;
}

export function construirXmlGre(g: GreInput): string {
  const fecha = g.issueDate.toISOString().slice(0, 10);
  const hora = g.issueDate.toISOString().slice(11, 19);
  const modeCode = g.transportMode === "PUBLICO" ? "01" : "02";

  const transporte =
    g.transportMode === "PUBLICO"
      ? `<cac:CarrierParty>
          <cac:PartyIdentification><cbc:ID schemeID="6">${esc(g.carrier!.ruc)}</cbc:ID></cac:PartyIdentification>
          <cac:PartyLegalEntity><cbc:RegistrationName>${esc(g.carrier!.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
        </cac:CarrierParty>`
      : `<cac:DriverPerson>
          <cbc:ID schemeID="${esc(g.driver!.docType || "1")}">${esc(g.driver!.docNumber)}</cbc:ID>
          <cbc:FirstName>${esc(g.driver!.name)}</cbc:FirstName>
          <cac:IdentityDocumentReference><cbc:ID>${esc(g.driver!.license)}</cbc:ID></cac:IdentityDocumentReference>
        </cac:DriverPerson>`;

  const vehiculo =
    g.transportMode === "PRIVADO"
      ? `<cac:TransportMeans><cac:RoadTransport><cbc:LicensePlateID>${esc(g.vehiclePlate)}</cbc:LicensePlateID></cac:RoadTransport></cac:TransportMeans>`
      : "";

  const lineas = g.lines
    .map(
      (l, i) => `  <cac:DespatchLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:DeliveredQuantity unitCode="${esc(l.unit || "NIU")}">${l.qty}</cbc:DeliveredQuantity>
    <cac:OrderLineReference><cbc:LineID>${i + 1}</cbc:LineID></cac:OrderLineReference>
    <cac:Item>
      <cbc:Description>${esc(l.name)}</cbc:Description>
      <cac:SellersItemIdentification><cbc:ID>${esc(l.sku)}</cbc:ID></cac:SellersItemIdentification>
    </cac:Item>
  </cac:DespatchLine>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${esc(g.id)}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  <cbc:DespatchAdviceTypeCode>09</cbc:DespatchAdviceTypeCode>
  <cbc:Note>${esc(REASON_LABEL[g.transferReason] || g.transferReason)}</cbc:Note>
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">${esc(g.sender.ruc)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(g.sender.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:DespatchSupplierParty>
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${docSchemeId(g.receiver.docType)}">${esc(g.receiver.doc)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(g.receiver.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:DeliveryCustomerParty>
  <cac:Shipment>
    <cbc:ID>SUNAT_Envio</cbc:ID>
    <cbc:HandlingCode>${esc(g.transferReason)}</cbc:HandlingCode>
    <cbc:GrossWeightMeasure unitCode="KGM">${g.totalWeightKg.toFixed(3)}</cbc:GrossWeightMeasure>
    <cbc:TotalTransportHandlingUnitQuantity>${g.packagesCount}</cbc:TotalTransportHandlingUnitQuantity>
    <cac:ShipmentStage>
      <cbc:TransportModeCode>${modeCode}</cbc:TransportModeCode>
      <cac:TransitPeriod><cbc:StartDate>${esc(g.transferDate)}</cbc:StartDate></cac:TransitPeriod>
      ${transporte}
    </cac:ShipmentStage>
    <cac:Delivery>
      <cac:DeliveryAddress>
        <cbc:ID>${esc(g.destinationUbigeo)}</cbc:ID>
        <cac:AddressLine><cbc:Line>${esc(g.destinationAddress)}</cbc:Line></cac:AddressLine>
      </cac:DeliveryAddress>
      <cac:Despatch>
        <cac:DespatchAddress>
          <cbc:ID>${esc(g.originUbigeo)}</cbc:ID>
          <cac:AddressLine><cbc:Line>${esc(g.originAddress)}</cbc:Line></cac:AddressLine>
        </cac:DespatchAddress>
      </cac:Despatch>
    </cac:Delivery>
    ${vehiculo}
  </cac:Shipment>
${lineas}
</DespatchAdvice>
`;
}

/** Hash SHA-256 (base64) del XML, usado como huella de integridad local. */
export function hashXml(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("base64");
}

/** Siguiente numero correlativo: T001-00000001 -> T001-00000002. */
export function siguienteNumeroGuia(serie: string, ultimoId?: string | null): string {
  const n = ultimoId && ultimoId.startsWith(serie + "-") ? parseInt(ultimoId.split("-")[1], 10) || 0 : 0;
  return `${serie}-${String(n + 1).padStart(8, "0")}`;
}
