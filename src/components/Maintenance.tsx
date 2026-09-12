import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, Plus, CheckCircle, Clock, X } from 'lucide-react';
import { MaintenanceOrder } from '../types';

interface MaintenanceProps {
  orders: MaintenanceOrder[];
  onAddOrder: (order: MaintenanceOrder) => void;
}

export function Maintenance({ orders, onAddOrder }: MaintenanceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [asset, setAsset] = useState("");
  const [mechanic, setMechanic] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !mechanic || !date) return;
    
    onAddOrder({
      id: `MNT-${Math.floor(Math.random() * 10000)}`,
      asset,
      mechanic,
      date,
      status: 'En Proceso'
    });
    
    setIsModalOpen(false);
    setAsset("");
    setMechanic("");
    setDate(new Date().toISOString().split('T')[0]);
  };

  const defaultOrders = orders.length > 0 ? orders : [
    { id: 'MNT-1001', asset: 'Motocicleta Honda (Placa 1234-A)', status: 'En Proceso', date: '2023-11-20', mechanic: 'Juan Taller' },
    { id: 'MNT-1002', asset: 'Camioneta Reparto (Placa 5678-B)', status: 'Completado', date: '2023-11-15', mechanic: 'Taller Autorizado Sur' }
  ] as MaintenanceOrder[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black font-display text-slate-900 dark:text-[#3D3528]">Mantenimiento de Flota</h1>
          <p className="text-sm text-slate-500 dark:text-[#7F735F] mt-1">
            Gestión de reparaciones y mantenimientos preventivos
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#4D4DFF] hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors">
          <Plus className="w-4 h-4" />
          Nueva Orden
        </button>
      </div>

      <div className="bg-white dark:bg-[#FFFFFF] border border-slate-100 dark:border-[#E5DEC9] shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#E5DEC9]">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Orden</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Activo/Vehículo</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Taller/Mecánico</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {defaultOrders.map((order, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#F2ECDE]/50 hover:bg-[#F7F8FC] dark:hover:bg-[#F7F8FC]/60 transition-colors">
                  <td className="py-4 px-4 text-sm font-mono font-bold text-[#4D4DFF]">{order.id}</td>
                  <td className="py-4 px-4 text-sm font-bold text-slate-900 dark:text-[#3D3528]">{order.asset}</td>
                  <td className="py-4 px-4 text-sm text-slate-500 dark:text-[#7F735F]">{order.date}</td>
                  <td className="py-4 px-4 text-sm text-slate-500 dark:text-[#7F735F]">{order.mechanic}</td>
                  <td className="py-4 px-4 text-sm">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                      ${order.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' : 
                        order.status === 'En Proceso' ? 'bg-blue-100 text-[#4D4DFF]' : 'bg-slate-100 text-slate-600'}`}>
                      {order.status === 'Completado' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {order.status}
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
                <Wrench className="w-5 h-5 text-[#4D4DFF]" />
                Nueva Orden de Mantenimiento
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Vehículo/Activo</label>
                  <input
                    type="text"
                    required
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    placeholder="Ej. Moto Honda (1234-A)"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Mecánico / Taller</label>
                  <input
                    type="text"
                    required
                    value={mechanic}
                    onChange={(e) => setMechanic(e.target.value)}
                    placeholder="Taller Autorizado Sur"
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Ingreso</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1 bg-[#F7F8FC] border-none focus:ring-2 focus:ring-[#4D4DFF]/20 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full mt-6 bg-[#4D4DFF] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-[#4D4DFF]/30"
                >
                  Registrar Orden
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
