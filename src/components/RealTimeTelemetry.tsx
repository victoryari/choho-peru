import React, { useState } from "react";
import { Navigation, MapPin, Compass, CheckCircle2, Circle, Clock, Plus, ShieldCheck, Map as MapIcon, User, Filter, Eye, Layers } from "lucide-react";
import { Telemetry } from "../types";

interface RealTimeTelemetryProps {
  telemetryList: Telemetry[];
  onAddVisit: (visit: Omit<Telemetry, "id">) => Promise<void>;
  currentUserName: string;
}

export function RealTimeTelemetry({ telemetryList, onAddVisit, currentUserName }: RealTimeTelemetryProps) {
  const [newClientName, setNewClientName] = useState("");
  const [newClientTime, setNewClientTime] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("all");
  const [activeViewMode, setActiveViewMode] = useState<"map" | "timeline">("map");
  const [selectedPin, setSelectedPin] = useState<Telemetry | null>(null);
  const [success, setSuccess] = useState(false);

  // Filter list by selected advisor
  const filteredList = selectedAdvisor === "all"
    ? telemetryList
    : telemetryList.filter(t => t.advisor.toLowerCase().includes(selectedAdvisor.toLowerCase()));

  // Available advisors for filter
  const advisors = Array.from(new Set(telemetryList.map(t => t.advisor)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const mockLat = -12.0464 + (Math.random() - 0.5) * 0.08;
    const mockLng = -77.0428 + (Math.random() - 0.5) * 0.08;

    const payload = {
      advisor: currentUserName,
      client: newClientName,
      time: newClientTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Visited" as const,
      lat: Number(mockLat.toFixed(4)),
      lng: Number(mockLng.toFixed(4)),
      address: newAddress || "Av. Nicolás de Piérola 450, Cercado de Lima"
    };

    await onAddVisit(payload);
    setNewClientName("");
    setNewClientTime("");
    setNewAddress("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Upper header with stats & controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-white">
            <Navigation className="w-5 h-5 text-[#E51920]" />
            Panel de Telemetría & Geolocalización de Rutas GPS
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visualiza en tiempo real el itinerario físico, ruta comercial y check-in de visitas del equipo comercial CHOHO PERÚ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Advisor selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-semibold">Asesor:</span>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Asesores</option>
              {advisors.map(adv => (
                <option key={adv} value={adv}>{adv}</option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
            <button
              onClick={() => setActiveViewMode("map")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === "map"
                  ? "bg-[#E51920] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa GPS</span>
            </button>
            <button
              onClick={() => setActiveViewMode("timeline")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === "timeline"
                  ? "bg-[#E51920] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Línea de Tiempo</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl">
            <Compass className="w-4 h-4 text-emerald-500 animate-spin" />
            <span>GPS: En Línea</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area: Interactive GPS Map or Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {activeViewMode === "map" ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E51920]" />
                  Mapa Interactivo de Ruta Comercial ({filteredList.length} Puntos)
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Lima Centro • Trujillo • Arequipa</span>
              </div>

              {/* Interactive Vector Route Map Canvas Simulation */}
              <div className="relative w-full h-[380px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between p-4 group">
                {/* Map Grid Pattern background */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#E51920 1px, transparent 1px), radial-gradient(#38bdf8 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    backgroundPosition: "0 0, 12px 12px"
                  }}
                />

                {/* Simulated GPS Polyline path */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <polyline
                    fill="none"
                    stroke="#E51920"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    points="60,80 140,160 260,110 380,220 500,180"
                    className="animate-pulse"
                  />
                </svg>

                {/* Map Control Info Overlay */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl text-[10px] text-white font-mono space-y-0.5 shadow-lg">
                    <div className="text-[#E51920] font-bold">CHOHO FLEET GPS TRACKER v2.4</div>
                    <div className="text-slate-400">Asesor: {selectedAdvisor === "all" ? "Todos" : selectedAdvisor}</div>
                  </div>

                  <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2 rounded-xl text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>SEGUIMIENTO EN TIEMPO REAL</span>
                  </div>
                </div>

                {/* Map Markers & Pins */}
                <div className="relative z-10 flex-1 grid grid-cols-5 items-center justify-items-center my-4">
                  {filteredList.slice(0, 5).map((pin, idx) => (
                    <div key={pin.id} className="relative group/pin flex flex-col items-center">
                      <button
                        onClick={() => setSelectedPin(pin)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs transition-all shadow-xl cursor-pointer ${
                          selectedPin?.id === pin.id
                            ? "bg-[#E51920] text-white scale-125 ring-4 ring-red-500/40 z-20"
                            : pin.status === "Visited"
                            ? "bg-emerald-500 text-slate-950 hover:scale-110"
                            : "bg-slate-800 text-slate-300 hover:scale-110"
                        }`}
                        title={`${pin.client} (${pin.time})`}
                      >
                        {idx + 1}
                      </button>

                      <div className="mt-1 bg-slate-900/90 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-md font-mono truncate max-w-[90px] border border-slate-800 shadow-md">
                        {pin.client}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Pin Details Bar */}
                {selectedPin ? (
                  <div className="relative z-10 bg-slate-900/95 backdrop-blur-md border border-red-500/40 p-3 rounded-xl flex items-center justify-between text-xs text-white shadow-xl animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E51920] flex items-center justify-center font-bold text-white shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-white">{selectedPin.client}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Asesor: <span className="text-red-400 font-bold">{selectedPin.advisor}</span> • Hora: {selectedPin.time}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold block">
                        GPS: {selectedPin.lat}, {selectedPin.lng}
                      </span>
                      <button
                        onClick={() => setSelectedPin(null)}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Cerrar Detalle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 text-[10px] text-slate-400 font-mono text-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60">
                    Haz clic en los marcadores numéricos (1, 2, 3...) para inspeccionar la ubicación y hora exacta del check-in.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Timeline View */
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                Línea de Tiempo del Itinerario ({filteredList.length} registros)
              </h4>

              <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-6.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {filteredList.map((node) => (
                  <div key={node.id} className="relative flex items-start gap-4">
                    <div className="relative z-10 mt-1 shrink-0 bg-white dark:bg-slate-900 p-1 rounded-full">
                      {node.status === "Visited" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 fill-white dark:fill-slate-900" />
                      )}
                    </div>

                    <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-500/40 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{node.client}</span>
                          <span className="text-[9px] bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono">
                            {node.time}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Asesor: <span className="text-[#E51920] dark:text-red-400 font-bold">{node.advisor}</span> • Coordenadas: {node.lat}, {node.lng}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${node.status === 'Visited' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {node.status === "Visited" ? "Visitado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advisor check-in generator panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#E51920]" />
            Registrar Nueva Visita de Campo
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold uppercase block">Cliente / Punto de Venta</label>
              <input
                type="text"
                placeholder="Ej. Taller Mecánico Trujillo / Moto Repuestos Lima"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold uppercase block">Dirección Fiscal / Ubicación Referencial</label>
              <input
                type="text"
                placeholder="Ej. Av. Nicolás de Piérola 450, Trujillo"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold uppercase block">Hora de Registro</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ej. 16:30"
                  value={newClientTime}
                  onChange={(e) => setNewClientTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                />
              </div>
            </div>

            {success && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-1.5 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Check-in registrado con coordenadas GPS.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Visita (Check-in GPS)</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

