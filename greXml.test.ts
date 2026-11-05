import { construirXmlGre, validarGre, hashXml, siguienteNumeroGuia, GreInput } from "./greXml.js";

const resultados: boolean[] = [];
const caso = (nombre: string, ok: boolean, detalle?: any) => {
  resultados.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${nombre}`);
  if (!ok && detalle !== undefined) console.log("      ", detalle);
};

const base = (): GreInput => ({
  id: "T001-00000001",
  issueDate: new Date("2026-11-03T12:00:00Z"),
  transferDate: "2026-11-03",
  transferReason: "01",
  transportMode: "PUBLICO",
  totalWeightKg: 12.5,
  packagesCount: 2,
  sender: { ruc: "20608542193", name: "CHOHO PERÚ S.A.C." },
  receiver: { docType: "RUC", doc: "20509878332", name: "ALOHUL E.I.R.L. & CIA" },
  carrier: { ruc: "20100028698", name: "SHALOM EMPRESARIAL S.A.C." },
  originUbigeo: "150131",
  originAddress: "Av. República de Panamá 3505, San Isidro",
  destinationUbigeo: "040101",
  destinationAddress: "Jr. Cusco 859 Int. 201, Arequipa",
  lines: [{ sku: "BT-0604", name: "BATERIA <12V> 8.4AH", qty: 11 }],
});

caso("Guia publica valida no tiene errores", validarGre(base()).length === 0, validarGre(base()));

caso("Rechaza peso 0", validarGre({ ...base(), totalWeightKg: 0 }).some(e => e.includes("peso")));
caso("Rechaza ubigeo de 5 digitos", validarGre({ ...base(), destinationUbigeo: "04010" }).some(e => e.includes("llegada")));
caso("Rechaza RUC destinatario corto", validarGre({ ...base(), receiver: { docType: "RUC", doc: "123", name: "X" } }).length > 0);
caso("Rechaza guia sin items", validarGre({ ...base(), lines: [] }).some(e => e.includes("items")));
caso("Modalidad publica exige RUC de transportista", validarGre({ ...base(), carrier: undefined }).length > 0);
caso(
  "Modalidad privada exige placa y conductor",
  validarGre({ ...base(), transportMode: "PRIVADO", carrier: undefined }).length >= 2
);
caso(
  "Guia privada completa es valida",
  validarGre({
    ...base(), transportMode: "PRIVADO", carrier: undefined, vehiclePlate: "ABC-123",
    driver: { docType: "1", docNumber: "45678912", name: "JUAN PEREZ", license: "Q45678912" },
  }).length === 0
);

const xml = construirXmlGre(base());
caso("XML declara DespatchAdvice 09 y UBL 2.1", xml.includes("<cbc:DespatchAdviceTypeCode>09</cbc:DespatchAdviceTypeCode>") && xml.includes("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>"));
caso("XML publico usa TransportModeCode 01 y CarrierParty", xml.includes("<cbc:TransportModeCode>01</cbc:TransportModeCode>") && xml.includes("<cac:CarrierParty>"));
caso("XML escapa caracteres especiales", xml.includes("&lt;12V&gt;") && xml.includes("&amp; CIA") && !xml.includes("<12V>"));
caso("XML incluye peso con 3 decimales y bultos", xml.includes('unitCode="KGM">12.500<') && xml.includes(">2</cbc:TotalTransportHandlingUnitQuantity>"));
caso("XML incluye ubigeos de partida y llegada", xml.includes("<cbc:ID>150131</cbc:ID>") && xml.includes("<cbc:ID>040101</cbc:ID>"));

const xmlPriv = construirXmlGre({
  ...base(), transportMode: "PRIVADO", carrier: undefined, vehiclePlate: "ABC-123",
  driver: { docType: "1", docNumber: "45678912", name: "JUAN PEREZ", license: "Q45678912" },
});
caso("XML privado usa modo 02, placa y conductor", xmlPriv.includes("<cbc:TransportModeCode>02</cbc:TransportModeCode>") && xmlPriv.includes("ABC-123") && xmlPriv.includes("<cac:DriverPerson>") && !xmlPriv.includes("<cac:CarrierParty>"));

caso("Hash es determinista y cambia con el contenido", hashXml(xml) === hashXml(xml) && hashXml(xml) !== hashXml(xmlPriv));
caso("Correlativo inicia en 1", siguienteNumeroGuia("T001", null) === "T001-00000001");
caso("Correlativo incrementa", siguienteNumeroGuia("T001", "T001-00000009") === "T001-00000010");
caso("Correlativo ignora otra serie", siguienteNumeroGuia("T001", "EG01-00000050") === "T001-00000001");

console.log(resultados.every(Boolean) ? "\nTODAS LAS PRUEBAS PASARON" : "\nHAY PRUEBAS FALLIDAS");
process.exit(resultados.every(Boolean) ? 0 : 1);
