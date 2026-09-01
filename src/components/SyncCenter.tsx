import React, { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Laptop, Wifi, WifiOff, FileDown, ArrowUpRight } from "lucide-react";
import { Quote } from "../types";

interface SyncCenterProps {
  isOfflineMode: boolean;
  onToggleOffline: () => void;
  onSyncNow: () => Promise<number>;
  localOfflineCount: number;
}

export function SyncCenter({
  isOfflineMode,
  onToggleOffline,
  onSyncNow,
  localOfflineCount
}: SyncCenterProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<string[]>([
    "Sincronización inicial exitosa a las 08:30 AM",
    "Sincronización automatizada periódica a las 11:45 AM",
    "Inventario actualizado con almacén central Ate a las 02:15 PM"
  ]);
  const [lastSyncTime, setLastSyncTime] = useState("Hace unos minutos");

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate API lag
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const syncCount = await onSyncNow();
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSyncHistory((prev) => [
        `Sincronización manual completada a las ${nowStr} (${syncCount} registros sincronizados)`,
        ...prev
      ]);
      setLastSyncTime("Ahora mismo");
    } catch (err) {
      console.error("Sync error", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Simulated auto-sync interval
  useEffect(() => {
    if (isOfflineMode) return;

    const interval = setInterval(() => {
      onSyncNow().then((syncCount) => {
        if (syncCount > 0) {
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setSyncHistory((prev) => [
            `Auto-Sync periódica a las ${nowStr} (${syncCount} registros)`,
            ...prev.slice(0, 5)
          ]);
          setLastSyncTime("Ahora mismo");
        }
      });
    }, 40000);

    return () => clearInterval(interval);
  }, [isOfflineMode, onSyncNow]);

  return (
    <div className="space-y-6 text-left">
      {/* Title Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#E51920]" />
            Centro de Sincronización Automática
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Garantiza una experiencia fluida de datos sincronizando automáticamente cotizaciones e inventarios entre dispositivos móviles de asesores de campo y la base de datos principal.
          </p>
        </div>

        {/* Manual Offline toggle button */}
        <button
          onClick={onToggleOffline}
          className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
            isOfflineMode
              ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 hover:bg-amber-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-100"
          }`}
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Simulando: Modo Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>Simulando: En Línea</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection status card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-3">
              <div className={`p-2 rounded-xl ${isOfflineMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                {isOfflineMode ? <CloudOff className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white font-display">Estado de Conexión</h4>
                <p className={`text-xs font-bold mt-0.5 ${isOfflineMode ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isOfflineMode ? "Trabajando de forma local" : "Conectado a TiDB Cloud"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {isOfflineMode
                    ? "Los cambios se guardan localmente en IndexedDB. Se sincronizarán automáticamente al volver en línea."
                    : "Sincronización bidireccional instantánea activa."}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-50 text-[#E51920] dark:bg-red-950/40 dark:text-red-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white font-display">Cola de Cambios Locales</h4>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  {localOfflineCount === 0 ? "Sin cambios pendientes" : `${localOfflineCount} Transacciones pendientes`}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {localOfflineCount > 0
                    ? "Tienes cotizaciones de campo generadas sin sincronizar con el panel central."
                    : "Todos tus registros locales están completamente limpios y respaldados."}
                </p>
              </div>
            </div>
          </div>

          {/* Sync history log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Log de Auditoría de Sincronización (Tiempo Real)
            </h4>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {syncHistory.map((history, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{history}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Controls action card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800">
              Acciones de Sincronización
            </h4>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Última sincronización:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{lastSyncTime}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Base de Datos Remota:</span>
                <span className="font-mono text-[#E51920] dark:text-red-400 font-bold">TIDB_CLOUD_LIVE</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Velocidad de Respuesta:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">24ms (Excelente)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || isOfflineMode}
              className="w-full bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/25 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Forzar Sincronización</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center italic leading-tight">
              *La base de datos local y remota se mantienen sincronizadas de manera bidireccional periódicamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
