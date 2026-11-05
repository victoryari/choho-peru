import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle2, RefreshCw, AlertTriangle, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "user";
  time: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: "1",
      title: "Sincronización Exitosa",
      message: "Base de datos local sincronizada automáticamente con el servidor principal (12 SKUs actualizados).",
      type: "success",
      time: "Hace 2 min"
    },
    {
      id: "2",
      title: "Cotización Aceptada",
      message: "El cliente Moto Repuestos Lima S.A.C. aceptó la cotización COT-2024-0892.",
      type: "user",
      time: "Hace 10 min"
    },
    {
      id: "3",
      title: "Alerta de Stock Crítico",
      message: "El producto 'Pastilla Freno Cerámica Pulsar' tiene menos de 15 unidades disponibles.",
      type: "warning",
      time: "Hace 1 hora"
    },
    {
      id: "4",
      title: "Servidor SUNAT Activo",
      message: "La firma electrónica de comprobantes electrónicos se encuentra en línea y respondiendo a nivel nacional.",
      type: "info",
      time: "Hace 3 horas"
    }
  ]);

  const [hasNew, setHasNew] = useState(true);

  // Periodic simulated push notification dispatcher
  useEffect(() => {
    const alerts = [
      {
        title: "Nuevo Registro Comercial",
        message: "Asesor Ricardo Mendoza inició check-in en 'Repuestos El Rayo', San Isidro.",
        type: "info" as const
      },
      {
        title: "Cotización Generada Offline",
        message: "Asesor Carlos Mendoza guardó cotización COT-2024-094 en memoria local.",
        type: "success" as const
      },
      {
        title: "Alerta de SUNAT",
        message: "Actualización de catálogo detracciones SUNAT procesada con éxito.",
        type: "info" as const
      }
    ];

    const timer = setInterval(() => {
      const idx = Math.floor(Math.random() * alerts.length);
      const selected = alerts[idx];
      const newNotif: SystemNotification = {
        id: Date.now().toString(),
        title: selected.title,
        message: selected.message,
        type: selected.type,
        time: "Ahora mismo"
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 7)]);
      setHasNew(true);
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  const clearAll = () => {
    setNotifications([]);
    setHasNew(false);
  };

  const removeOne = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative z-50">
      <button type="button"
        id="notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNew(false);
        }}
        aria-label={`Notificaciones ${notifications.length > 0 ? ` (${notifications.length} sin leer)`: ''}`}
        aria-expanded={isOpen}
        className="relative p-2 text-ink-muted hover:text-brand-fg rounded-xl hover:bg-field-hover transition-all cursor-pointer"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {hasNew && notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand rounded-full animate-ping" />
        )}
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-brand text-brand-contrast text-xs font-extrabold px-1.5 rounded-full shadow-xs">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl shadow-2xl p-4 overflow-hidden text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-fg" />
                <span className="font-extrabold text-sm text-ink font-display">Notificaciones de Red</span>
              </div>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold text-ink-subtle hover:text-brand-fg transition-colors cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                )}
                <button type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-ink-subtle hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-ink-subtle text-xs">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex gap-3 p-3 rounded-2xl bg-surface border border-line hover:border-brand/border shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all text-left"
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === "success" && <CheckCircle2 className="w-4 h-4 text-success-fg" />}
                      {notif.type === "info" && <RefreshCw className="w-4 h-4 text-brand-fg" />}
                      {notif.type === "warning" && <AlertTriangle className="w-4 h-4 text-warning-fg" />}
                      {notif.type === "user" && <UserCheck className="w-4 h-4 text-brand-fg" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-ink truncate">{notif.title}</p>
                        <span className="text-micro text-ink-subtle shrink-0 font-medium">{notif.time}</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => removeOne(notif.id)}
                      className="text-ink-subtle hover:text-ink dark:hover:text-ink shrink-0 self-start cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-line text-center">
              <span className="text-xs text-ink-subtle italic">
                Sincronización multi-dispositivo y push activados en background
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
