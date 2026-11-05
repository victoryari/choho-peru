import React, { useState } from "react";
import { 
  User, KeyRound, Building2, MapPin, Mail, ShieldCheck, LogOut, 
  X, Lock, Check, AlertCircle, Eye, EyeOff, RefreshCw, Briefcase, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function UserProfileModal({ isOpen, onClose, onLogout }: UserProfileModalProps) {
  const { currentUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<"info" | "password">("info");

  // Form states for change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "CH";
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 3) {
      setErrorMsg("La nueva contraseña debe tener al menos 3 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Las nuevas contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la contraseña.");
      }

      setSuccessMsg("¡Contraseña actualizada exitosamente!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab("info");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-line rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-left flex flex-col max-h-[90vh]"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-brand to-brand/85 p-6 text-brand-contrast relative shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-xl font-black font-display shadow-lg shrink-0">
                {getInitials(currentUser.name)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-micro font-bold uppercase tracking-wider inline-block">
                  {currentUser.role}
                </span>
                <h3 className="font-extrabold text-base text-white font-display truncate mt-1">
                  {currentUser.name}
                </h3>
                <p className="text-xs text-white/80 font-mono truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-line bg-surface-2 px-4 pt-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab("info"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "info"
                  ? "border-brand text-brand-fg bg-surface rounded-t-xl"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Mi Perfil & Sede</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("password"); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "password"
                  ? "border-brand text-brand-fg bg-surface rounded-t-xl"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Cambiar Contraseña</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4">
            {activeTab === "info" ? (
              <div className="space-y-4">
                {/* Information cards */}
                <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-brand-fg shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-micro font-bold uppercase text-ink-subtle block">Sede Asignada</span>
                      <span className="text-xs font-bold text-ink">{currentUser.branch || "Sede Lima Centro"}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2.5 border-t border-line/60">
                    <Briefcase className="w-4 h-4 text-brand-fg shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-micro font-bold uppercase text-ink-subtle block">Departamento / Área</span>
                      <span className="text-xs font-bold text-ink">{currentUser.department || "Operaciones"}</span>
                    </div>
                  </div>

                  {currentUser.salesZone && (
                    <div className="flex items-start gap-3 pt-2.5 border-t border-line/60">
                      <MapPin className="w-4 h-4 text-brand-fg shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-micro font-bold uppercase text-ink-subtle block">Zona Comercial de Ventas</span>
                        <span className="text-xs font-bold text-brand-fg">{currentUser.salesZone}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 pt-2.5 border-t border-line/60">
                    <ShieldCheck className="w-4 h-4 text-success-fg shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-micro font-bold uppercase text-ink-subtle block">Estado de la Cuenta</span>
                      <span className="text-xs font-bold text-success-fg flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        Activa y Autorizada
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("password")}
                    className="w-full bg-surface-2 hover:bg-surface-3 border border-line text-ink font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-brand-fg" />
                    <span>Actualizar Contraseña de Acceso</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-danger-soft border border-danger/30 text-danger-fg rounded-xl text-xs flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs flex items-center gap-2 font-semibold">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Contraseña Actual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 3 caracteres"
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3.5 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("info")}
                    className="flex-1 bg-surface-2 hover:bg-surface-3 text-ink font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar Clave</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer with Logout action */}
          <div className="p-4 border-t border-line bg-surface-2/60 shrink-0 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-xs font-semibold text-danger-fg hover:text-danger-fg/80 flex items-center gap-1.5 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-danger-soft"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>

            <span className="text-micro text-ink-subtle font-mono">CHOHO Perú ERP</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
