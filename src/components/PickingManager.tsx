import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ScanLine, PackageCheck, RefreshCw, AlertTriangle, CheckCircle2, Boxes, Weight, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

interface PickingItem {
  id: number;
  picking_id: string;
  sku: string;
  name: string;
  ordered_qty: number;
  picked_qty: number;
  is_verified: number;
}

interface PickingOrder {
  id: string;
  quote_id: string | null;
  client_name: string | null;
  branch: string;
  operator: string | null;
  status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "OBSERVADO";
  total_packages: number;
  total_weight_kg: number | string;
  created_at: string;
  items: PickingItem[];
}

const STATUS_STYLE: Record<string, string> = {
  PENDIENTE: "bg-warning-soft text-warning-fg",
  EN_PROCESO: "bg-brand-soft text-brand-fg",
  COMPLETADO: "bg-success-soft text-success-fg",
  OBSERVADO: "bg-danger-soft text-danger-fg",
};

/** Beep corto generado con WebAudio: agudo = OK, grave = error. */
function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 1100 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.08 : 0.3));
    setTimeout(() => ctx.close(), 400);
  } catch {
    /* sin audio disponible */
  }
}

export function PickingManager() {
  const { currentUser, userPermissions: _unused } = useAppStore() as any;
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("ACTIVAS");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [packages, setPackages] = useState(1);
  const [weight, setWeight] = useState(0);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/picking");
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => orders.filter((o) => (filter === "ACTIVAS" ? o.status !== "COMPLETADO" : filter === "TODAS" ? true : o.status === filter)),
    [orders, filter]
  );
  const selected = orders.find((o) => o.id === selectedId) || null;

  const progress = (o: PickingOrder) => {
    const total = o.items.reduce((a, i) => a + i.ordered_qty, 0);
    const done = o.items.reduce((a, i) => a + i.picked_qty, 0);
    return total ? Math.round((done / total) * 100) : 0;
  };

  const selectOrder = (o: PickingOrder) => {
    setSelectedId(o.id);
    setPackages(o.total_packages || 1);
    setWeight(Number(o.total_weight_kg) || 0);
    setFeedback(null);
    setTimeout(() => scanRef.current?.focus(), 50);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = scanValue.trim();
    if (!sku || !selected) return;
    setScanValue("");
    const res = await fetch(`/api/picking/${selected.id}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, qty: 1, operator: currentUser?.name }),
    });
    const data = await res.json().catch(() => ({}));
    beep(res.ok);
    setFeedback(res.ok
      ? { ok: true, msg: `${data.sku}: ${data.pickedQty}/${data.orderedQty}` }
      : { ok: false, msg: data.error || "Error de escaneo" });
    if (res.ok) await load();
    scanRef.current?.focus();
  };

  const handleComplete = async () => {
    if (!selected) return;
    const res = await fetch(`/api/picking/${selected.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalPackages: packages, totalWeightKg: weight }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setFeedback({ ok: true, msg: "Pedido empacado. Listo para Guía de Remisión." });
      await load();
    } else {
      beep(false);
      setFeedback({ ok: false, msg: data.error || "No se pudo completar." });
    }
  };

  const handleObserve = async () => {
    if (!selected) return;
    const notes = window.prompt("Motivo de la observación:");
    if (!notes) return;
    await fetch(`/api/picking/${selected.id}/observe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    await load();
  };

  const allDone = !!selected && selected.items.every((i) => i.picked_qty >= i.ordered_qty);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-left">
      {/* Cola de pedidos */}
      <div className="lg:col-span-5 bg-surface border border-line rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-ink flex items-center gap-2">
            <Boxes className="w-4 h-4 text-brand-fg" /> Cola de Picking
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg text-xs font-bold px-2 py-1"
            >
              <option value="ACTIVAS">Activas</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="OBSERVADO">Observadas</option>
              <option value="COMPLETADO">Completadas</option>
              <option value="TODAS">Todas</option>
            </select>
            <button type="button" onClick={load} className="p-1.5 rounded-lg hover:bg-surface-2 cursor-pointer" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {visible.length === 0 && (
            <div className="py-10 text-center text-xs text-ink-subtle">
              No hay órdenes. Se generan al aceptar una cotización.
            </div>
          )}
          {visible.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => selectOrder(o)}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedId === o.id ? "border-brand bg-brand-soft/40" : "border-line hover:bg-surface-2"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-extrabold text-xs text-brand-fg">{o.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status]}`}>{o.status}</span>
              </div>
              <div className="text-xs font-semibold text-ink truncate mt-0.5">{o.client_name || "Cliente"}</div>
              <div className="text-[11px] text-ink-subtle">{o.branch} · Cot. {o.quote_id}</div>
              <div className="h-1.5 bg-line rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-brand" style={{ width: `${progress(o)}%` }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Terminal de escaneo */}
      <div className="lg:col-span-7 bg-surface border border-line rounded-2xl p-4 space-y-4">
        {!selected ? (
          <div className="py-24 text-center text-xs text-ink-subtle">Seleccione una orden para iniciar el picking.</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-ink">{selected.id} · {selected.client_name}</h3>
                <p className="text-[11px] text-ink-subtle">Avance {progress(selected)}%</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[selected.status]}`}>{selected.status}</span>
            </div>

            {selected.status !== "COMPLETADO" && (
              <form onSubmit={handleScan} className="relative">
                <ScanLine className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-fg" />
                <input
                  ref={scanRef}
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  placeholder="Escanee o digite el SKU y presione Enter"
                  autoFocus
                  className="w-full pl-11 pr-3 py-4 text-base font-mono font-bold bg-surface-2 border-2 border-line focus:border-brand rounded-2xl focus-visible:outline-none"
                />
              </form>
            )}

            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${feedback.ok ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg"}`}>
                {feedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {feedback.msg}
              </div>
            )}

            <div className="space-y-2">
              {selected.items.map((i) => {
                const done = i.picked_qty >= i.ordered_qty;
                return (
                  <div key={i.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${done ? "border-success/40 bg-success-soft/40" : "border-line"}`}>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-extrabold text-brand-fg">{i.sku}</div>
                      <div className="text-xs font-semibold text-ink truncate">{i.name}</div>
                    </div>
                    <div className={`font-mono font-black text-lg shrink-0 ${done ? "text-success-fg" : "text-ink"}`}>
                      {i.picked_qty}/{i.ordered_qty}
                    </div>
                  </div>
                );
              })}
            </div>

            {selected.status === "COMPLETADO" && (
              <button type="button" onClick={() => navigate(`/shipping-guides?picking=${selected.id}`)}
                className="w-full py-3 rounded-xl text-xs font-bold bg-brand text-brand-contrast cursor-pointer flex items-center justify-center gap-2">
                <Truck className="w-4 h-4" /> Generar Guía de Remisión
              </button>
            )}

            {selected.status !== "COMPLETADO" && (
              <div className="pt-3 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <label className="text-[11px] font-bold uppercase text-ink-subtle space-y-1">
                  <span className="flex items-center gap-1"><Boxes className="w-3 h-3" /> Bultos</span>
                  <input type="number" min={1} value={packages} onChange={(e) => setPackages(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-surface-2 border border-line rounded-lg px-2 py-2 text-sm font-mono font-bold" />
                </label>
                <label className="text-[11px] font-bold uppercase text-ink-subtle space-y-1">
                  <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> Peso (Kg)</span>
                  <input type="number" min={0} step="0.1" value={weight} onChange={(e) => setWeight(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-surface-2 border border-line rounded-lg px-2 py-2 text-sm font-mono font-bold" />
                </label>
                <button type="button" onClick={handleObserve}
                  className="py-2.5 rounded-xl text-xs font-bold bg-surface-2 border border-line hover:bg-surface-3 cursor-pointer">
                  Observar
                </button>
                <button type="button" onClick={handleComplete} disabled={!allDone}
                  className="py-2.5 rounded-xl text-xs font-bold bg-brand text-brand-contrast disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5">
                  <PackageCheck className="w-4 h-4" /> Completar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
