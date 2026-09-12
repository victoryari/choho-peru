import React, { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Compass, CheckCircle2, Circle, Clock, Plus, ShieldCheck, Map as MapIcon, Filter, Layers, Activity, Radio, Signal, RefreshCw } from "lucide-react";
import L from "leaflet";
import { Telemetry } from "../types";

interface LiveLocation {
  advisor: string;
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
  updatedAt: string;
}

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

  // Live Tracking state
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; speed: number; accuracy: number } | null>(null);
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const watchIdRef = useRef<number | null>(null);

  // Leaflet Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const safeTelemetry = Array.isArray(telemetryList) ? telemetryList : [];
  const filteredList = selectedAdvisor === "all"
    ? safeTelemetry
    : safeTelemetry.filter(t => t && (t.advisor || "").toLowerCase().includes((selectedAdvisor || "").toLowerCase()));

  const advisors = Array.from(new Set(safeTelemetry.map(t => t && t.advisor).filter(Boolean)));

  // Fetch Live Locations from server periodically
  const fetchLiveLocations = async () => {
    try {
      const res = await fetch("/api/telemetry/live");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLiveLocations(data);
      }
    } catch (e) {
      console.error("Error fetching live locations:", e);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
    const interval = setInterval(fetchLiveLocations, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle Continuous Live GPS Tracking (watchPosition)
  useEffect(() => {
    if (isLiveTracking) {
      if (!navigator.geolocation) {
        alert("Geolocalización no es soportada por este dispositivo.");
        setIsLiveTracking(false);
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const speed = pos.coords.speed ? Number((pos.coords.speed * 3.6).toFixed(1)) : 0; // m/s to km/h
          const accuracy = Number(pos.coords.accuracy.toFixed(0));

          setCurrentPosition({ lat, lng, speed, accuracy });

          // Send live location update to server
          try {
            await fetch("/api/telemetry/live", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                advisor: currentUserName,
                lat,
                lng,
                speed,
                accuracy
              })
            });
            fetchLiveLocations();
          } catch (err) {
            console.error("Error transmitiendo GPS:", err);
          }
        },
        (err) => {
          console.error("Live GPS Watch Error:", err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isLiveTracking, currentUserName]);

  // Leaflet Map Initialization and Layer Rendering
  useEffect(() => {
    if (activeViewMode !== "map" || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Peru (Lima / Trujillo center or first telemetry point)
      const defaultLat = filteredList.length > 0 ? filteredList[0].lat : -12.046374;
      const defaultLng = filteredList.length > 0 ? filteredList[0].lng : -77.042793;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;

    if (markersGroup) markersGroup.clearLayers();

    const points: [number, number][] = [];

    // Render Visited Route Pins
    filteredList.forEach((pin, idx) => {
      if (pin.lat && pin.lng) {
        points.push([pin.lat, pin.lng]);

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div style="background-color: #4D4DFF; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${idx + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 2px;">
            <strong style="color: #4D4DFF; font-size: 13px;">${pin.client}</strong><br/>
            <span style="font-size: 11px; color: #555;">📍 ${pin.address || 'Ubicación GPS'}</span><br/>
            <span style="font-size: 10px; color: #888;">👤 Asesor: ${pin.advisor} • ⏰ ${pin.time}</span>
          </div>
        `);
        marker.on("click", () => setSelectedPin(pin));
        markersGroup?.addLayer(marker);
      }
    });

    // Draw Commercial Route Polyline
    if (points.length > 1) {
      const polyline = L.polyline(points, {
        color: "#4D4DFF",
        weight: 4,
        dashArray: "8, 6",
        opacity: 0.85
      });
      markersGroup?.addLayer(polyline);
    }

    // Render LIVE Active Advisor GPS Positions
    liveLocations.forEach((live) => {
      if (selectedAdvisor !== "all" && live.advisor.toLowerCase() !== selectedAdvisor.toLowerCase()) return;
      if (live.lat && live.lng) {
        const liveIcon = L.divIcon({
          className: "live-radar-marker",
          html: `
            <div style="position: relative; width: 36px; height: 36px;">
              <div style="position: absolute; inset: 0; background-color: #10B981; opacity: 0.4; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; background-color: #10B981; color: white; border: 3px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 14px rgba(16,185,129,0.5); font-weight: bold;">🚗</div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const liveMarker = L.marker([live.lat, live.lng], { icon: liveIcon });
        liveMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 2px;">
            <span style="background: #10B981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">LIVE GPS</span>
            <h4 style="margin: 4px 0 2px; font-size: 13px;">Asesor: ${live.advisor}</h4>
            <span style="font-size: 11px; color: #555;">⚡ Velocidad: ${live.speed || 0} km/h</span><br/>
            <span style="font-size: 10px; color: #888;">🎯 Precisión: ±${live.accuracy || 5}m • Último ping: ${live.updatedAt}</span>
          </div>
        `);
        markersGroup?.addLayer(liveMarker);
      }
    });

    // Auto fit bounds if points exist
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
    }
  }, [activeViewMode, filteredList, liveLocations, selectedAdvisor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    if (!navigator.geolocation) {
      alert("Geolocalización no es soportada por este navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          advisor: currentUserName,
          client: newClientName,
          time: newClientTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "Visited" as const,
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          address: newAddress || "Ubicación detectada por GPS"
        };

        await onAddVisit(payload);
        setNewClientName("");
        setNewClientTime("");
        setNewAddress("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      },
      (error) => {
        console.error("GPS Error:", error);
        alert("Error obteniendo ubicación GPS. Por favor, permite el acceso a la ubicación en tu navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Upper header with stats & controls */}
      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-[#3D3528]">
            <Navigation className="w-5 h-5 text-[#4D4DFF]" />
            Panel de Telemetría & Geolocalización de Rutas GPS (Tiempo Real)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Rastreo continuo del equipo comercial CHOHO PERÚ con mapas cartográficos interactivos y posicionamiento directo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Tracking Toggle Button */}
          <button
            onClick={() => setIsLiveTracking(!isLiveTracking)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              isLiveTracking
                ? "bg-emerald-500 text-white animate-pulse shadow-emerald-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Radio className={`w-4 h-4 ${isLiveTracking ? "animate-spin" : ""}`} />
            <span>{isLiveTracking ? "TRANSMITIENDO GPS EN VIVO" : "Activar Rastreo GPS Continuo"}</span>
          </button>

          {/* Advisor selector */}
          <div className="flex items-center gap-2 bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-semibold">Asesor:</span>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-[#3D3528] focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Asesores</option>
              {advisors.map(adv => (
                <option key={adv} value={adv}>{adv}</option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-[#FDF9F1] p-1 rounded-xl border border-slate-200 dark:border-[#E5DEC9] gap-1">
            <button
              onClick={() => setActiveViewMode("map")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === "map"
                  ? "bg-[#4D4DFF] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa Cartográfico Real</span>
            </button>
            <button
              onClick={() => setActiveViewMode("timeline")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === "timeline"
                  ? "bg-[#4D4DFF] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Línea de Tiempo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Status Indicators Banner */}
      {currentPosition && isLiveTracking && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-emerald-800 dark:text-emerald-300 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>GPS ACTIVO ({currentUserName}): {currentPosition.lat}, {currentPosition.lng}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>⚡ Velocidad: <strong>{currentPosition.speed} km/h</strong></span>
            <span>🎯 Precisión: <strong>±{currentPosition.accuracy}m</strong></span>
            <span className="text-slate-400">Emisores activos: {liveLocations.length}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area: Interactive Leaflet Map or Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {activeViewMode === "map" ? (
            <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#E5DEC9]">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#3D3528] font-display flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#4D4DFF]" />
                  Mapa Cartográfico Interactivo (OpenStreetMap Real) - {filteredList.length} Puntos
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLiveLocations}
                    className="p-1 text-slate-400 hover:text-[#4D4DFF] transition-colors cursor-pointer"
                    title="Actualizar Posiciones"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-400">Lima • Trujillo • Arequipa</span>
                </div>
              </div>

              {/* Leaflet Map Canvas Container */}
              <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-100 shadow-inner z-0">
                <div ref={mapContainerRef} id="leaflet-map-container" className="w-full h-full z-0" />

                {/* Live Tracking overlay badge */}
                <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>TRANSMISIÓN LIVE: {liveLocations.length} ASESOR(ES)</span>
                </div>
              </div>
            </div>
          ) : (
            /* Timeline View */
            <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#3D3528] font-display pb-3 border-b border-slate-100 dark:border-[#E5DEC9] mb-4">
                Línea de Tiempo del Itinerario ({filteredList.length} registros)
              </h4>

              <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-6.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {filteredList.map((node) => (
                  <div key={node.id} className="relative flex items-start gap-4">
                    <div className="relative z-10 mt-1 shrink-0 bg-white dark:bg-[#FFFFFF] p-1 rounded-full">
                      {node.status === "Visited" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 fill-white dark:fill-slate-900" />
                      )}
                    </div>

                    <div className="flex-1 bg-[#F7F8FC] dark:bg-[#F7F8FC]/40 border border-slate-100 dark:border-[#E5DEC9] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/40 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-[#3D3528]">{node.client}</span>
                          <span className="text-[9px] bg-slate-200/60 dark:bg-[#F2ECDE] text-slate-600 dark:text-[#7F735F] px-2 py-0.5 rounded-full font-mono">
                            {node.time}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Asesor: <span className="text-[#4D4DFF] dark:text-blue-500 font-bold">{node.advisor}</span> • Coordenadas: {node.lat}, {node.lng}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${node.status === 'Visited' ? 'bg-[#98FB98]/30 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 text-slate-500 dark:bg-[#F2ECDE] dark:text-[#7F735F]'}`}>
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
        <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#3D3528] font-display pb-3 border-b border-slate-100 dark:border-[#E5DEC9] mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#4D4DFF]" />
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
                className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-[#3D3528] focus:outline-none"
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
                className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-[#3D3528] focus:outline-none"
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
                  className="w-full bg-[#F7F8FC] dark:bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-[#3D3528] focus:outline-none font-mono"
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
              className="w-full bg-[#4D4DFF] hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#4D4DFF]/30"
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
