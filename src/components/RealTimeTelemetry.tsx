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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> href="https://carto.com/attributions">CARTO</a>',
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
          html: `<div style="background-color: #5A7A68; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 10px rgba(90,122,104,0.35);">${idx + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });
        marker.bindPopup(`<div style="font-family: sans-serif; padding: 2px;"> <strong style="color: #466754; font-size: 13px;">${pin.client}</strong><br/> <span style="font-size: 11px; color: #555;">📍${pin.address || 'Ubicación GPS'}</span><br/> <span style="font-size: 10px; color: #888;">👤 Asesor: ${pin.advisor} • ⏰ ${pin.time}</span> </div>`);
        marker.on("click", () => setSelectedPin(pin));
        markersGroup?.addLayer(marker);
      }
    });

    // Draw Commercial Route Polyline
    if (points.length > 1) {
      const polyline = L.polyline(points, {
        color: "#5A7A68",
        weight: 3.5,
        dashArray: "8, 6",
        opacity: 0.9
      });
      markersGroup?.addLayer(polyline);
    }

    // Render LIVE Active Advisor GPS Positions
    liveLocations.forEach((live) => {
      if (selectedAdvisor !== "all" && live.advisor.toLowerCase() !== selectedAdvisor.toLowerCase()) return;
      if (live.lat && live.lng) {
        const liveIcon = L.divIcon({
          className: "live-radar-marker",
          html: `<div style="position: relative; width: 36px; height: 36px;"> absolute; inset: 0; background-color: #10B981; opacity: 0.4; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div> color: white; border: 3px solid 32px; display: flex; align-items: center; justify-content: font-size: 14px; box-shadow: 0 4px 14px rgba(16,185,129,0.5); font-weight: bold;">🚗</div> </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const liveMarker = L.marker([live.lat, live.lng], { icon: liveIcon });
        liveMarker.bindPopup(`<div style="font-family: sans-serif; padding: 2px;"> <span style="background: #10B981; color: white; 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">LIVE GPS</span> <h4 style="margin: 4px 0 2px; 13px;">Asesor:${live.advisor}</h4> <span style="font-size: 11px; color: #555;">⚡ Velocidad:${live.speed || 0}km/h</span><br/> <span style="font-size: 10px; color: #888;">🎯 Precisión: ±${live.accuracy || 5}m • Último ping:${live.updatedAt}</span> </div>`);
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
        alert("Error obteniendo ubicación GPS. Por favor, permite el acceso a la en tu navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Upper header with stats & controls */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-ink">
            <Navigation className="w-5 h-5 text-brand-fg" />
            Panel de Telemetría & Geolocalización de Rutas GPS (Tiempo Real)
          </h3>
          <p className="text-xs text-ink-subtle mt-1">
            Rastreo continuo del equipo comercial CHOHO PERÚ con mapas cartográficos interactivos y posicionamiento directo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Tracking Toggle Button */}
          <button type="button"
            onClick={() => setIsLiveTracking(!isLiveTracking)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              isLiveTracking
                ? "bg-success text-white animate-pulse shadow-success/30"
                : "bg-surface-2 dark:bg-ink-muted text-ink-muted dark:text-ink-subtle hover:bg-field-hover"
            }`}
          >
            <Radio className={`w-4 h-4 ${isLiveTracking ? "animate-spin" : ""}`} />
            <span>{isLiveTracking ? "TRANSMITIENDO GPS EN VIVO" : "Activar Rastreo GPS Continuo"}</span>
          </button>

          {/* Advisor selector */}
          <div className="flex items-center gap-2 bg-surface-2 border-none px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-ink-subtle" />
            <span className="text-ink-subtle font-semibold">Asesor:</span>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="bg-transparent font-bold text-ink focus-visible:outline-none cursor-pointer"
            >
              <option value="all">Todos los Asesores</option>
              {advisors.map(adv => (
                <option key={adv} value={adv}>{adv}</option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-surface-2 dark:bg-surface p-1 rounded-xl border border-line gap-1">
            <button type="button"
              onClick={() => setActiveViewMode("map")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === "map"
                  ? "bg-brand text-brand-contrast shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa Cartográfico Real</span>
            </button>
            <button type="button"
              onClick={() => setActiveViewMode("timeline")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === "timeline"
                  ? "bg-brand text-brand-contrast shadow-sm"
                  : "text-ink-muted hover:text-ink"
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
        <div className="p-4 bg-success-soft border border-success/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-success-fg shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping" />
            <span>GPS ACTIVO ({currentUserName}): {currentPosition.lat}, {currentPosition.lng}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>⚡ Velocidad: <strong>{currentPosition.speed} km/h</strong></span>
            <span>🎯 Precisión: <strong>±{currentPosition.accuracy}m</strong></span>
            <span className="text-ink-subtle">Emisores activos: {liveLocations.length}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area: Interactive Leaflet Map or Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {activeViewMode === "map" ? (
            <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-fg" />
                  Mapa Cartográfico Interactivo (OpenStreetMap Real) - {filteredList.length} Puntos
                </h4>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={fetchLiveLocations}
                    aria-label="Actualizar posiciones de la flota"
                    className="p-1 text-ink-subtle hover:text-brand-fg transition-colors cursor-pointer"
                    title="Actualizar Posiciones"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <span className="text-xs font-mono text-ink-subtle">Lima • Trujillo • Arequipa</span>
                </div>
              </div>

              {/* Leaflet Map Canvas Container */}
              <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border border-line shadow-inner z-0">
                <div ref={mapContainerRef} id="leaflet-map-container" className="w-full h-full z-0" />

                {/* Live Tracking overlay badge */}
                <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-ink/90 backdrop-blur-md border border-line dark:border-line-strong px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-success-fg flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-success animate-ping" />
                  <span>TRANSMISIÓN LIVE: {liveLocations.length} ASESOR(ES)</span>
                </div>
              </div>
            </div>
          ) : (
            /* Timeline View */
            <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs">
              <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-4">
                Línea de Tiempo del Itinerario ({filteredList.length} registros)
              </h4>

              <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-6.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-line dark:before:bg-ink">
                {filteredList.map((node) => (
                  <div key={node.id} className="relative flex items-start gap-4">
                    <div className="relative z-10 mt-1 shrink-0 bg-surface p-1 rounded-full">
                      {node.status === "Visited" ? (
                        <CheckCircle2 className="w-5 h-5 text-success-fg" />
                      ) : (
                        <Circle className="w-5 h-5 text-ink-subtle fill-white dark:fill-ink" />
                      )}
                    </div>

                    <div className="flex-1 bg-surface-2 dark:bg-surface-2/40 border border-line p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand/border transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">{node.client}</span>
                          <span className="text-micro bg-line/60 dark:bg-surface-2 text-ink-muted px-2 py-0.5 rounded-full font-mono">
                            {node.time}
                          </span>
                        </div>
                        <p className="text-xs text-ink-subtle mt-0.5 font-mono">
                          Asesor: <span className="text-brand-fg font-bold">{node.advisor}</span> • Coordenadas: {node.lat}, {node.lng}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${node.status === 'Visited' ? 'bg-success-soft/30 text-success-fg dark:bg-success-soft border border-success/30 dark:border-success/border' : 'bg-surface-2 text-ink-muted'}`}>
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
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit">
          <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-fg" />
            Registrar Nueva Visita de Campo
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-ink-muted font-semibold uppercase block">Cliente / Punto de Venta</label>
              <input
                type="text"
                placeholder="Ej. Taller Mecánico Trujillo / Moto Repuestos Lima"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-muted font-semibold uppercase block">Dirección Fiscal / Ubicación Referencial</label>
              <input
                type="text"
                placeholder="Ej. Av. Nicolás de Piérola 450, Trujillo"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-ink-muted font-semibold uppercase block">Hora de Registro</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                <input
                  type="text"
                  placeholder="Ej. 16:30"
                  value={newClientTime}
                  onChange={(e) => setNewClientTime(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-9 pr-4 py-2 text-xs text-ink focus-visible:outline-none font-mono"
                />
              </div>
            </div>

            {success && (
              <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl flex items-center gap-1.5 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Check-in registrado con coordenadas GPS.</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full gap-1.5"
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
