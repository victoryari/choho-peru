import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, DollarSign, X } from 'lucide-react';
import { TravelBudget, TravelExpense } from '../types';

interface TravelBudgetsProps {
  budgets: TravelBudget[];
  onAddBudget: (budget: TravelBudget) => void;
  expenses: TravelExpense[];
}

export function TravelBudgets({ budgets, onAddBudget, expenses }: TravelBudgetsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seller, setSeller] = useState("");
  const [assigned, setAssigned] = useState<number | "">("");

  // Calculate dynamic spent and balance based on approved expenses
  const computedBudgets = useMemo(() => {
    const defaultBudgets = budgets.length > 0 ? budgets : [
      { id: 'TB-1', seller: 'Ana Torres', assigned: 1500, spent: 0, balance: 1500, status: 'Activo' },
      { id: 'TB-2', seller: 'Luis Gomez', assigned: 2000, spent: 0, balance: 2000, status: 'Activo' }
    ] as TravelBudget[];

    return defaultBudgets.map(b => {
      // Find all approved expenses for this seller
      const sellerExpenses = expenses.filter(e => e.advisor === b.seller && e.approvalStatus === 'Aprobado');
      const spent = sellerExpenses.reduce((sum, e) => sum + e.amount, 0);
      const balance = b.assigned - spent;
      const status = balance <= 0 ? 'Agotado' : (balance < (b.assigned * 0.2) ? 'Crítico' : 'Activo');
      
      return { ...b, spent, balance, status };
    });
  }, [budgets, expenses]);

  const totalAssigned = computedBudgets.reduce((sum, b) => sum + b.assigned, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller || !assigned || Number(assigned) <= 0) return;
    
    onAddBudget({
      id: `TB-${Math.floor(Math.random() * 10000)}`,
      seller,
      assigned: Number(assigned),
      spent: 0,
      balance: Number(assigned),
      status: 'Activo'
    });
    
    setIsModalOpen(false);
    setSeller("");
    setAssigned("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black font-display text-slate-900 dark:text-[#3D3528]">Caja Chica & Viáticos</h1>
          <p className="text-sm text-slate-500 dark:text-[#7F735F] mt-1">
            Asignación de fondos para equipo comercial
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#4D4DFF] hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors">
          <DollarSign className="w-4 h-4" />
          Nueva Asignación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#FFFFFF] p-5 rounded-2xl border border-slate-100 dark:border-[#E5DEC9] shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Wallet className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Fondo Total Mes</h3>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#3D3528]">S/ {totalAssigned.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-[#E5DEC9] shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#E5DEC9]">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendedor</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Asignado</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Consumido</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Saldo Final</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {computedBudgets.map((b, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#F2ECDE]/50 hover:bg-[#F7F8FC] dark:hover:bg-[#F7F8FC]/60 transition-colors">
                  <td className="py-4 px-4 text-sm font-bold text-slate-900 dark:text-[#3D3528]">{b.seller}</td>
                  <td className="py-4 px-4 text-sm font-mono font-bold text-slate-900 text-right">S/ {b.assigned.toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm font-mono text-rose-500 text-right">S/ {b.spent.toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm font-mono font-black text-[#4D4DFF] text-right">S/ {b.balance.toFixed(2)}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                      ${b.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 
                        b.status === 'Agotado' ? 'bg-red-100 text-red-700' : 'bg-rose-100 text-rose-700'}`}>
                      {b.status}
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
                <Wallet className="w-5 h-5 text-[#4D4DFF]" />
                Asignar Presupuesto
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Asesor Comercial</label>
                  <select
                    required
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccione Asesor...</option>
                    <option value="Ana Torres">Ana Torres</option>
                    <option value="Luis Gomez">Luis Gomez</option>
                    <option value="Carlos Mendoza">Carlos Mendoza</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Monto Asignado (S/)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={assigned}
                    onChange={(e) => setAssigned(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Ej. 1500.00"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full mt-6 bg-[#4D4DFF] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-[#4D4DFF]/30"
                >
                  Asignar Presupuesto
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
