import React, { useState, useRef, useEffect } from "react";
import { Laptop, Tablet, Smartphone, Info, X, CheckCircle2, Touchpad } from "lucide-react";
import { useDeviceType } from "../hooks/useDeviceType";

export function DeviceBadge() {
  const device = useDeviceType();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getDeviceIcon = () => {
    switch (device.type) {
      case "tablet":
        return <Tablet className="w-3.5 h-3.5 text-blue-500" />;
      case "mobile":
        return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Laptop className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const getBadgeStyle = () => {
    switch (device.type) {
      case "tablet":
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100";
      case "mobile":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100";
      default:
        return "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80";
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Dispositivo detectado: ${device.label}`}
        title="Clic para ver detalles de adaptación de pantalla"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${getBadgeStyle()}`}
      >
        {getDeviceIcon()}
        <span className="font-bold tracking-tight">{device.label}</span>
        <span className="hidden xl:inline text-micro opacity-70 font-mono">
          ({device.width}px)
        </span>
      </button>

      {/* Popover con detalles técnicos del dispositivo */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                {getDeviceIcon()}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Detección de Dispositivo
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">Modo Adaptativo CHOHO ERP</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 text-[11px]">Tipo de Equipo:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {device.label}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 text-[11px]">Resolución Actual:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {device.width} × {device.height} px
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 text-[11px]">Orientación:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                {device.orientation === "landscape" ? "Horizontal (Landscape)" : "Vertical (Portrait)"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 text-[11px]">Pantalla Táctil:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {device.isTouch ? "Sí (Touch Habilitado)" : "No (Mouse / Teclado)"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 text-[11px]">Sistema Operativo:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{device.os}</span>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              {device.isTablet
                ? "Interfaz optimizada para dedos y stylus en tableta. Barra lateral colapsable para máximo espacio."
                : device.isMobile
                ? "Interfaz táctil compacta adaptada para smartphone con barra inferior rápida."
                : "Interfaz de alta densidad optimizada para teclado, ratón y monitores amplios."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
