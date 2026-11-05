import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Truck, FilePlus2, Download, FileCode2, RefreshCw, AlertTriangle, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { generateGuidePDF, GuideForPdf } from "../utils/grePdfGenerator";

interface Pending {
  pickingId: string;
  quoteId: string | null;
  branch: string;
  packages: number;
  weightKg: number | string;
  clientName: string | null;
  clientDoc: string | null;
  clientAddress: string | null;
}

const AGENCIAS = ["Shalom Empresarial", "Marvisur", "Cavassa", "Flores Hnos", "Olva Courier", "Otra"];

const emptyForm = {
  transferDate: new Date().toISOString().slice(0, 10),
  transferReason: "01",
  transportMode: "PUBLICO" as "PUBLICO" | "PRIVADO",
  carrierName: "",
  carrierRuc: "",
  driverDocType: "1",
  driverDocNumber: "",
  driverName: "",
  driverLicense: "",
  vehiclePlate: "",
  originUbigeo: "150131",
  originAddress: "",
  destinationUbigeo: "",
  destinationAddress: "",
  totalWeightKg: 0,
  packagesCount: 1,
  receiverName: "",
  receiverDoc: "",
};

const input = "w-full bg-surface-2 border border-line rounded-lg px-2.5 py-2 text-xs font-semibold focus-visible:outline-none focus:border-brand";

export function ShippingGuideManager() {
  const { companySettings, currentUser } = useAppStore();
  const location = useLocation();
  const [guides, setGuides] = useState<GuideForPdf[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<Pending | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, p] = await Promise.all([fetch("/api/shipping-guides"), fetch("/api/shipping-guides/pending")]);
      if (g.ok) setGuides(await g.json());
      if (p.ok) setPending(await p.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = useCallback((p: Pending) => {
    setModal(p);
    setErrors([]);
    setForm({
      ...emptyForm,
      originAddress: companySettings?.address || "",
      destinationAddress: p.clientAddress || "",
      totalWeightKg: Number(p.weightKg) || 0,
      packagesCount: p.packages || 1,
      receiverName: p.clientName || "",
      receiverDoc: (p.clientDoc || "").replace(/\D/g, ""),
    });
  }, [companySettings?.address]);

  // Llegada desde Picking: /shipping-guides?picking=PK-xxxx abre el formulario directo.
  const wanted = useMemo(() => new URLSearchParams(location.search).get("picking"), [location.search]);
  useEffect(() => {
    if (!wanted || modal) return;
    const p = pending.find((x) => x.pickingId === wanted);
    if (p) openModal(p);
  }, [wanted, pending, modal, openModal]);

  const set = (k: keyof typeof emptyForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const emit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    setErrors([]);
    try {
      const res = await fetch("/api/shipping-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pickingId: modal.pickingId, createdBy: currentUser?.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.detalles?.length ? data.detalles : [data.error || "No se pudo emitir la guía."]);
        return;
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const company = { name: companySettings?.companyName || "CHOHO PERÚ S.A.C.", ruc: companySettings?.ruc || "" };

  return (
    <div className="space-y-4 text-left">
      {/* Pendientes */}
      <div className="bg-surface border border-line rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm text-ink flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-fg" /> Pedidos empacados sin guía ({pending.length})
          </h3>
          <button type="button" onClick={load} className="p-1.5 rounded-lg hover:bg-surface-2 cursor-pointer" title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-ink-subtle py-4 text-center">No hay pedidos pendientes. Complete un picking para habilitarlos.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pending.map((p) => (
              <div key={p.pickingId} className="p-3 border border-line rounded-xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-extrabold text-brand-fg">{p.pickingId}</div>
                  <div className="text-xs font-semibold truncate">{p.clientName || "Cliente"}</div>
                  <div className="text-[11px] text-ink-subtle">{p.packages} bulto(s) · {Number(p.weightKg).toFixed(1)} kg</div>
                </div>
                <button type="button" onClick={() => openModal(p)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-brand text-brand-contrast cursor-pointer flex items-center gap-1.5 shrink-0">
                  <FilePlus2 className="w-4 h-4" /> Emitir GRE
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emitidas */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-surface-2 text-ink-muted uppercase font-bold">
            <tr>
              <th className="p-3">Guía</th><th className="p-3">Destinatario</th><th className="p-3">Modalidad</th>
              <th className="p-3">Traslado</th><th className="p-3">Estado</th><th className="p-3 text-right">Descargas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {guides.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-ink-subtle">Aún no se emitieron guías.</td></tr>
            )}
            {guides.map((g) => (
              <tr key={g.id}>
                <td className="p-3 font-mono font-extrabold text-brand-fg">{g.id}</td>
                <td className="p-3">{g.receiver_name}</td>
                <td className="p-3">{g.transport_mode}</td>
                <td className="p-3">{String(g.transfer_date).slice(0, 10)}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-warning-soft text-warning-fg font-bold text-[10px]">{g.sunat_status}</span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => generateGuidePDF(g, company)} title="PDF"
                      className="p-1.5 rounded-lg hover:bg-surface-2 cursor-pointer"><Download className="w-4 h-4" /></button>
                    <a href={`/api/shipping-guides/${g.id}/xml`} title="XML UBL 2.1"
                      className="p-1.5 rounded-lg hover:bg-surface-2 cursor-pointer"><FileCode2 className="w-4 h-4" /></a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de emisión */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={emit} className="bg-surface rounded-2xl border border-line w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Emitir Guía de Remisión · {modal.pickingId}</h3>
              <button type="button" onClick={() => setModal(null)} className="p-1 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold uppercase text-ink-subtle">
              <label className="space-y-1">Fecha de traslado
                <input type="date" required value={form.transferDate} onChange={(e) => set("transferDate", e.target.value)} className={input} /></label>
              <label className="space-y-1">Motivo
                <select value={form.transferReason} onChange={(e) => set("transferReason", e.target.value)} className={input}>
                  <option value="01">01 · Venta</option>
                  <option value="04">04 · Traslado entre sedes</option>
                </select></label>
              <label className="space-y-1 col-span-2">Destinatario
                <input value={form.receiverName} onChange={(e) => set("receiverName", e.target.value)} className={input} /></label>
              <label className="space-y-1 col-span-2">RUC / DNI destinatario
                <input value={form.receiverDoc} onChange={(e) => set("receiverDoc", e.target.value)} className={input} /></label>

              <label className="space-y-1">Modalidad
                <select value={form.transportMode} onChange={(e) => set("transportMode", e.target.value)} className={input}>
                  <option value="PUBLICO">Pública (agencia)</option>
                  <option value="PRIVADO">Privada (flota propia)</option>
                </select></label>
              <span />

              {form.transportMode === "PUBLICO" ? (
                <>
                  <label className="space-y-1">Agencia
                    <select value={AGENCIAS.includes(form.carrierName) ? form.carrierName : "Otra"}
                      onChange={(e) => set("carrierName", e.target.value === "Otra" ? "" : e.target.value)} className={input}>
                      {AGENCIAS.map((a) => <option key={a}>{a}</option>)}
                    </select></label>
                  <label className="space-y-1">Razón social transportista
                    <input required value={form.carrierName} onChange={(e) => set("carrierName", e.target.value)} className={input} /></label>
                  <label className="space-y-1 col-span-2">RUC transportista (11 dígitos)
                    <input required maxLength={11} value={form.carrierRuc} onChange={(e) => set("carrierRuc", e.target.value.replace(/\D/g, ""))} className={input} /></label>
                </>
              ) : (
                <>
                  <label className="space-y-1">Conductor
                    <input required value={form.driverName} onChange={(e) => set("driverName", e.target.value)} className={input} /></label>
                  <label className="space-y-1">DNI conductor
                    <input required value={form.driverDocNumber} onChange={(e) => set("driverDocNumber", e.target.value)} className={input} /></label>
                  <label className="space-y-1">Licencia (brevete)
                    <input required value={form.driverLicense} onChange={(e) => set("driverLicense", e.target.value)} className={input} /></label>
                  <label className="space-y-1">Placa del vehículo
                    <input required value={form.vehiclePlate} onChange={(e) => set("vehiclePlate", e.target.value.toUpperCase())} className={input} /></label>
                </>
              )}

              <label className="space-y-1">Ubigeo partida
                <input required maxLength={6} value={form.originUbigeo} onChange={(e) => set("originUbigeo", e.target.value.replace(/\D/g, ""))} className={input} /></label>
              <label className="space-y-1">Dirección partida
                <input required value={form.originAddress} onChange={(e) => set("originAddress", e.target.value)} className={input} /></label>
              <label className="space-y-1">Ubigeo llegada
                <input required maxLength={6} value={form.destinationUbigeo} onChange={(e) => set("destinationUbigeo", e.target.value.replace(/\D/g, ""))} className={input} /></label>
              <label className="space-y-1">Dirección llegada
                <input required value={form.destinationAddress} onChange={(e) => set("destinationAddress", e.target.value)} className={input} /></label>
              <label className="space-y-1">Peso bruto (kg)
                <input type="number" min={0.1} step="0.1" required value={form.totalWeightKg} onChange={(e) => set("totalWeightKg", Number(e.target.value))} className={input} /></label>
              <label className="space-y-1">Bultos
                <input type="number" min={1} required value={form.packagesCount} onChange={(e) => set("packagesCount", Number(e.target.value))} className={input} /></label>
            </div>

            {errors.length > 0 && (
              <div className="p-3 rounded-xl bg-danger-soft text-danger-fg text-xs font-semibold space-y-1">
                {errors.map((er, i) => (
                  <div key={i} className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{er}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-2 border border-line cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-brand-contrast disabled:opacity-50 cursor-pointer">
                {saving ? "Emitiendo..." : "Emitir guía"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
