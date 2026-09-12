import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tags, ShieldAlert, X } from 'lucide-react';
import { DiscountRule } from '../types';

interface DiscountManagerProps {
  rules: DiscountRule[];
  onAddRule: (rule: DiscountRule) => void;
}

export function DiscountManager({ rules, onAddRule }: DiscountManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [role, setRole] = useState("");
  const [maxDiscount, setMaxDiscount] = useState<number | "">("");
  const [category, setCategory] = useState("General");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || maxDiscount === "" || Number(maxDiscount) < 0 || Number(maxDiscount) > 100) return;
    
    onAddRule({
      id: `DR-${Math.floor(Math.random() * 10000)}`,
      role,
      maxDiscount: Number(maxDiscount),
      category,
      status: 'Activo'
    });
    
    setIsModalOpen(false);
    setRole("");
    setMaxDiscount("");
    setCategory("General");
  };

  const defaultRules = rules.length > 0 ? rules : [
    { id: 'DR-1', role: 'Vendedor Junior', maxDiscount: 5, category: 'General', status: 'Activo' },
    { id: 'DR-2', role: 'Vendedor Senior', maxDiscount: 15, category: 'General', status: 'Activo' },
    { id: 'DR-3', role: 'Gerencia', maxDiscount: 100, category: 'General', status: 'Activo' },
    { id: 'DR-4', role: 'Todos', maxDiscount: 20, category: 'Campaña Liquidación', status: 'Inactivo' }
  ] as DiscountRule[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black font-display text-slate-900 dark:text-[#3D3528]">Gestión de Descuentos</h1>
          <p className="text-sm text-slate-500 dark:text-[#7F735F] mt-1">
            Configuración de límites de descuento por usuario o campaña
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#4D4DFF] hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors">
          <Tags className="w-4 h-4" />
          Nueva Regla
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-500">
          <span className="font-bold block mb-1">Políticas de Seguridad Comercial</span>
          El sistema bloqueará cualquier intento de cotización que sobrepase los límites máximos establecidos aquí. Las excepciones solo pueden ser aprobadas por Gerencia.
        </div>
      </div>

      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-[#E5DEC9] shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#E5DEC9]">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol/Usuario</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría Aplicable</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Descuento Máximo (%)</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {defaultRules.map((rule, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#F2ECDE]/50 hover:bg-[#F7F8FC] dark:hover:bg-[#F7F8FC]/60 transition-colors">
                  <td className="py-4 px-4 text-sm font-bold text-slate-900 dark:text-[#3D3528]">{rule.role}</td>
                  <td className="py-4 px-4 text-sm text-slate-500">{rule.category}</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-[#F2ECDE] text-[#4D4DFF] font-mono font-bold rounded-lg">
                      {rule.maxDiscount}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                      ${rule.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {rule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-slate-50 shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-md p-6 relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Tags className="w-5 h-5 text-[#4D4DFF]" />
                Nueva Regla de Descuento
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Rol o Usuario</label>
                  <select
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccione Rol...</option>
                    <option value="Vendedor Junior">Vendedor Junior</option>
                    <option value="Vendedor Senior">Vendedor Senior</option>
                    <option value="Todos">Todos (Global)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Porcentaje Máximo (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Ej. 15"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Categoría o Campaña</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ej. General o Campaña 2024"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full mt-6 bg-[#4D4DFF] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-[#4D4DFF]/30"
                >
                  Guardar Regla
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
