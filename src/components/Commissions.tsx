import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Download, X, Plus } from 'lucide-react';
import { Commission, Quote } from '../types';

interface CommissionsProps {
  commissions: Commission[];
  onAddCommission: (comm: Commission) => void;
  quotes: Quote[];
}

export function Commissions({ commissions, onAddCommission, quotes }: CommissionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seller, setSeller] = useState("");
  const [rate, setRate] = useState<number | "">("");
  const [month, setMonth] = useState("Noviembre 2023");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller || rate === "" || Number(rate) < 0) return;
    
    // Calculate total sales for this seller from quotes
    // (Only billed or approved quotes can be counted, but for this demo let's say 'billed')
    const sellerQuotes = quotes.filter(q => q.advisor === seller && (q.status === 'billed' || q.status === 'approved'));
    const salesTotal = sellerQuotes.reduce((sum, q) => sum + q.total, 0);
    
    // Fallback logic if there are no quotes, just to show functionality
    const finalSalesTotal = salesTotal > 0 ? salesTotal : 15000;
    const commissionAmt = finalSalesTotal * (Number(rate) / 100);

    onAddCommission({
      id: `COM-${Math.floor(Math.random() * 10000)}`,
      seller,
      salesTotal: finalSalesTotal,
      rate: Number(rate),
      commission: commissionAmt,
      month,
      status: 'Pendiente'
    });
    
    setIsModalOpen(false);
    setSeller("");
    setRate("");
  };

  const defaultCommissions = commissions.length > 0 ? commissions : [
    { id: 'COM-1', seller: 'Ana Torres', salesTotal: 25000.00, rate: 2.5, commission: 625.00, month: 'Noviembre 2023', status: 'Pagado' },
    { id: 'COM-2', seller: 'Luis Gomez', salesTotal: 18400.00, rate: 2.5, commission: 460.00, month: 'Noviembre 2023', status: 'Pendiente' }
  ] as Commission[];

  const totalCommissions = defaultCommissions.reduce((sum, c) => sum + c.commission, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black font-display text-slate-900 dark:text-[#3D3528]">Cálculo de Comisiones</h1>
          <p className="text-sm text-slate-500 dark:text-[#7F735F] mt-1">
            Resumen de ventas liquidadas y comisiones por asesor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#4D4DFF] hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-md shadow-[#4D4DFF]/20">
            <Plus className="w-4 h-4" />
            Nueva Liquidación
          </button>
          <button className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold transition-colors hidden sm:flex">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#FFFFFF] p-5 rounded-2xl border border-slate-100 dark:border-[#E5DEC9] shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Total Comisiones Mes</h3>
          </div>
          <div className="text-2xl font-black text-[#4D4DFF]">S/ {totalCommissions.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-[#E5DEC9] shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#E5DEC9]">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asesor</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Periodo</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ventas Acumuladas</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tasa (%)</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Comisión a Pagar</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {defaultCommissions.map((c, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#F2ECDE]/50 hover:bg-[#F7F8FC] dark:hover:bg-[#F7F8FC]/60 transition-colors">
                  <td className="py-4 px-4 text-sm font-bold text-slate-900 dark:text-[#3D3528]">{c.seller}</td>
                  <td className="py-4 px-4 text-sm text-slate-500">{c.month}</td>
                  <td className="py-4 px-4 text-sm font-mono text-slate-600 text-right">S/ {c.salesTotal.toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm font-mono text-slate-600 text-right">{c.rate}%</td>
                  <td className="py-4 px-4 text-sm font-mono font-black text-emerald-600 text-right">S/ {c.commission.toFixed(2)}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                      ${c.status === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.status}
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
                <TrendingUp className="w-5 h-5 text-[#4D4DFF]" />
                Liquidar Comisiones
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
                  <label className="text-xs font-bold text-slate-500 uppercase">Tasa de Comisión (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Ej. 2.5"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Mes a Liquidar</label>
                  <input
                    type="text"
                    required
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="Ej. Diciembre 2023"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full mt-6 bg-[#4D4DFF] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-[#4D4DFF]/30"
                >
                  Generar Liquidación
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
