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
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-ink font-display flex items-center gap-2">
            <Cloud className="w-5 h-5 text-brand-fg" />
            Centro de Sincronización Automática
          </h3>
          <p className="text-xs text-ink-subtle mt-1">
            Garantiza una experiencia fluida de datos sincronizando automáticamente cotizaciones e inventarios entre dispositivos móviles de asesores de campo y la base de datos principal.
          </p>
        </div>

        {/* Manual Offline toggle button */}
        <button type="button"
          onClick={onToggleOffline}
          className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
            isOfflineMode
              ? "bg-warning-soft border-warning/30 text-warning-fg dark:bg-warning/30 dark:border-warning/60 hover:bg-warning-soft/50"
              : "bg-success-soft border-success/30 text-success-fg hover:bg-success-soft/50"
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
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl flex items-start gap-3">
              <div className={`p-2 rounded-xl ${isOfflineMode ? 'bg-warning-soft/50 text-warning-fg dark:bg-warning' : 'bg-success-soft/40 text-success-fg dark:bg-success-soft'}`}>
                {isOfflineMode ? <CloudOff className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-ink font-display">Estado de Conexión</h4>
                <p className={`text-xs font-bold mt-0.5 ${isOfflineMode ? 'text-warning-fg' : 'text-success-fg'}`}>
                  {isOfflineMode ? "Trabajando de forma local" : "Conectado a TiDB Cloud"}
                </p>
                <p className="text-xs text-ink-subtle mt-1 leading-relaxed">
                  {isOfflineMode
                    ? "Los cambios se guardan localmente en IndexedDB. Se sincronizarán automáticamente al volver línea."
                    : "Sincronización bidireccional instantánea activa."}
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl flex items-start gap-3">
              <div className="p-2 rounded-xl bg-danger-soft text-danger-fg">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-ink font-display">Cola de Cambios Locales</h4>
                <p className="text-xs font-bold text-ink dark:text-ink-muted mt-0.5">
                  {localOfflineCount === 0 ? "Sin cambios pendientes" : `${localOfflineCount}Transacciones pendientes`}
                </p>
                <p className="text-xs text-ink-subtle mt-1 leading-relaxed">
                  {localOfflineCount > 0
                    ? "Tienes cotizaciones de campo generadas sin sincronizar con el panel central."
                    : "Todos tus registros locales están completamente limpios y respaldados."}
                </p>
              </div>
            </div>
          </div>

          {/* Sync history log */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs">
            <h4 className="font-extrabold text-xs text-ink font-display pb-3 border-b border-line mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-success-fg" />
              Log de Auditoría de Sincronización (Tiempo Real)
            </h4>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 font-mono text-xs text-ink-muted">
              {syncHistory.map((history, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-line dark:border-line/60 last:border-0">
                  <ArrowUpRight className="w-3.5 h-3.5 text-success-fg shrink-0 mt-0.5" />
                  <span>{history}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Controls action card */}
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <h4 className="font-extrabold text-xs text-ink font-display pb-3 border-b border-line">
              Acciones de Sincronización
            </h4>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex justify-between items-center text-ink-subtle">
                <span>Última sincronización:</span>
                <span className="font-mono text-ink dark:text-ink-muted font-semibold">{lastSyncTime}</span>
              </div>
              <div className="flex justify-between items-center text-ink-subtle">
                <span>Base de Datos Remota:</span>
                <span className="font-mono text-brand-fg font-bold">TIDB_CLOUD_LIVE</span>
              </div>
              <div className="flex justify-between items-center text-ink-subtle">
                <span>Velocidad de Respuesta:</span>
                <span className="font-mono text-success-fg font-bold">24ms (Excelente)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button type="button"
              onClick={handleManualSync}
              disabled={isSyncing || isOfflineMode}
              className="btn-primary w-full gap-1.5 disabled:opacity-50"
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
            <p className="text-xs text-ink-subtle text-center italic leading-tight">
              *La base de datos local y remota se mantienen sincronizadas de manera bidireccional periódicamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
