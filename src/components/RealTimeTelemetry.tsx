import React, { useState } from "react";
import { Navigation, MapPin, Compass, CheckCircle2, Circle, Clock, Plus, ShieldCheck } from "lucide-react";
import { Telemetry } from "../types";

interface RealTimeTelemetryProps {
  telemetryList: Telemetry[];
  onAddVisit: (visit: Omit<Telemetry, "id">) => Promise<void>;
  currentUserName: string;
}

export function RealTimeTelemetry({ telemetryList, onAddVisit, currentUserName }: RealTimeTelemetryProps) {
  const [newClientName, setNewClientName] = useState("");
  const [newClientTime, setNewClientTime] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const mockLat = -12.1 + (Math.random() - 0.5) * 0.1;
    const mockLng = -77.0 + (Math.random() - 0.5) * 0.1;

    const payload = {
      advisor: currentUserName,
      client: newClientName,
      time: newClientTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Visited" as const,
      lat: Number(mockLat.toFixed(4)),
      lng: Number(mockLng.toFixed(4))
    };

    await onAddVisit(payload);
    setNewClientName("");
    setNewClientTime("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-gray-200 font-display flex items-center gap-2">
            <Navigation className="w-5 h-5 text-sky-400" />
            Panel de Telemetría y Geolocalización de Asesores
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Visualiza en tiempo real el itinerario físico y check-in de visitas del equipo comercial de CHOHO PERU.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-[#0F172A] border border-slate-800 p-2 rounded-lg">
          <Compass className="w-4 h-4 text-emerald-500 animate-spin" />
          <span>Frecuencia: GPS_ON (Cada 10 seg)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time map & advisor visit logs list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl">
            <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50 mb-4">
              Itinerario del Asesor Carlos Mendoza (Hoy)
            </h4>

            <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-6.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-700/50">
              {telemetryList.map((node) => (
                <div key={node.id} className="relative flex items-start gap-4">
                  {/* Visual bullet */}
                  <div className="relative z-10 mt-1 shrink-0 bg-[#1E293B] p-1 rounded-full">
                    {node.status === "Visited" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600 fill-[#1E293B]" />
                    )}
                  </div>

                  <div className="flex-1 bg-[#0F172A]/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between hover:border-slate-700/50 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-200">{node.client}</span>
                        <span className="text-[9px] bg-slate-800 text-gray-400 px-1.5 py-0.2 rounded font-mono">
                          {node.time}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        Coordenadas: {node.lat}, {node.lng}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${node.status === 'Visited' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-slate-800 text-gray-400'}`}>
                        {node.status === "Visited" ? "Visitado" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advisor check-in generator */}
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl h-fit">
          <h4 className="font-bold text-xs text-gray-200 font-display pb-3 border-b border-slate-700/50 mb-4">
            Registrar Nueva Visita de Campo
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-gray-400 uppercase font-mono block">Cliente / Punto de Venta</label>
              <input
                type="text"
                placeholder="Ej. Taller Mecánico Trujillo"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-gray-400 uppercase font-mono block">Hora de Registro</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Ej. 16:30"
                  value={newClientTime}
                  onChange={(e) => setNewClientTime(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none"
                />
              </div>
            </div>

            {success && (
              <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/60 text-emerald-400 rounded-lg flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Check-in registrado con éxito.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Visita (Check-in)</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
