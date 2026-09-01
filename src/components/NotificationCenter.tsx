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
        message: "Actualización de catálogo de detracciones SUNAT procesada con éxito.",
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
      <button
        id="notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNew(false);
        }}
        className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-[#E51920] dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {hasNew && notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#E51920] rounded-full animate-ping" />
        )}
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#E51920] text-white text-[10px] font-extrabold px-1.5 rounded-full shadow-xs">
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
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-4 overflow-hidden text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E51920]" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-white font-display">Notificaciones de Red</span>
              </div>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-semibold text-slate-400 hover:text-[#E51920] transition-colors cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 hover:border-red-500/40 transition-all text-left"
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {notif.type === "info" && <RefreshCw className="w-4 h-4 text-[#E51920]" />}
                      {notif.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {notif.type === "user" && <UserCheck className="w-4 h-4 text-[#E51920]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{notif.title}</p>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    <button
                      onClick={() => removeOne(notif.id)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 self-start cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 italic">
                Sincronización multi-dispositivo y push activados en background
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
