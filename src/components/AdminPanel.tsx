import React, { useState } from "react";
import { Users, UserPlus, Settings, Power, Edit3, ShieldAlert, Check, Plus, Package } from "lucide-react";
import { User, Product } from "../types";

interface AdminPanelProps {
  users: User[];
  products: Product[];
  onAddUser: (user: Omit<User, "id">) => Promise<void>;
  onUpdateUser: (id: string, updated: Partial<User>) => Promise<void>;
  onUpdateProduct: (sku: string, updatedPayload: Partial<Product>) => Promise<void>;
}

export function AdminPanel({
  users,
  products,
  onAddUser,
  onUpdateUser,
  onUpdateProduct
}: AdminPanelProps) {
  // Tabs within admin panel
  const [adminTab, setAdminTab] = useState<"users" | "products">("users");

  // Add User State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Asesor Comercial");
  const [newUserBranch, setNewUserBranch] = useState("Sede Trujillo");
  const [newUserDept, setNewUserDept] = useState("Ventas");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  // Product Edit State
  const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState(0);
  const [editingPrice, setEditingPrice] = useState(0);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    setIsAddingUser(true);
    try {
      await onAddUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        branch: newUserBranch,
        department: newUserDept,
        status: "ACTIVE"
      });
      setNewUserName("");
      setNewUserEmail("");
      setUserMsg("¡Usuario registrado exitosamente!");
      setTimeout(() => setUserMsg(""), 2000);
    } catch (err) {
      console.error(err);
      setUserMsg("Error al registrar correo repetido.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await onUpdateUser(user.id, { status: nextStatus });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductSku(product.sku);
    setEditingStock(product.stock);
    setEditingPrice(product.basePrice);
  };

  const handleSaveProductChanges = async () => {
    if (!selectedProductSku) return;
    setIsUpdatingProduct(true);
    try {
      await onUpdateProduct(selectedProductSku, { stock: editingStock, basePrice: editingPrice });
      setSelectedProductSku(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Panel */}
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-sm text-gray-200 font-display flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            Panel de Administración Web Administrativo
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Gestión centralizada de personal comercial de CHOHO PERU, permisos del sistema, catálogo de precios e inventario físico.
          </p>
        </div>

        {/* Tab selection buttons */}
        <div className="flex bg-[#0F172A] border border-slate-700/50 p-1 rounded-xl w-full sm:w-auto shrink-0">
          <button
            onClick={() => setAdminTab("users")}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "users" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios de Red</span>
          </button>
          <button
            onClick={() => setAdminTab("products")}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "products" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Precios e Inventarios</span>
          </button>
        </div>
      </div>

      {adminTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50 mb-2">
              Personal Autorizado ({users.length})
            </h4>

            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 bg-[#0F172A]/40 border border-slate-700/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-650 transition-all text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200">{u.name}</span>
                      <span className="text-[9px] bg-slate-850 text-gray-400 px-1.5 py-0.2 rounded font-mono font-semibold">
                        {u.id}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${u.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                        {u.status === "ACTIVE" ? "Activo" : "Suspendido"}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1 font-mono">
                      Email: {u.email} • Rol: <span className="text-sky-400">{u.role}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Sede: {u.branch} • Departamento: {u.department}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50 justify-end">
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
                        u.status === "ACTIVE"
                          ? "border-sky-900/50 text-sky-400 bg-sky-950/20 hover:bg-sky-950/45"
                          : "border-emerald-900/50 text-emerald-500 bg-emerald-950/20 hover:bg-emerald-950/45"
                      }`}
                      title={u.status === "ACTIVE" ? "Suspender Acceso" : "Reactivar Acceso"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{u.status === "ACTIVE" ? "Suspender" : "Activar"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add User panel */}
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl h-fit">
            <h4 className="font-bold text-xs text-gray-200 font-display pb-3 border-b border-slate-700/50 mb-4 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-sky-400" />
              Registrar Nuevo Colaborador
            </h4>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Roberto Mendoza"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Correo Corporativo</label>
                <input
                  type="email"
                  placeholder="ejemplo@choho.pe"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Rol Asignado</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="Asesor Comercial">Asesor Comercial</option>
                  <option value="Jefe de Finanzas">Jefe de Finanzas</option>
                  <option value="Operario Master">Operario Master</option>
                  <option value="Admin General">Admin General</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Sede</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                  >
                    <option value="Sede Trujillo">Sede Trujillo</option>
                    <option value="Sede Lima">Sede Lima</option>
                    <option value="Sede Lima Centro">Sede Lima Centro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Depto</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                  >
                    <option value="Ventas">Ventas</option>
                    <option value="Facturación">Facturación</option>
                    <option value="Almacén">Almacén</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              {userMsg && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/60 text-emerald-400 rounded-lg text-xs text-center font-bold">
                  {userMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isAddingUser}
                className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Colaborador</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {adminTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Stock management list */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50">
              Control de Precios de Venta e Inventario ({products.length})
            </h4>

            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.sku}
                  className="p-3.5 bg-[#0F172A]/40 border border-slate-700/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-650 transition-all text-left"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-sky-400 font-bold">{p.sku}</span>
                    <h5 className="text-xs font-bold text-gray-200 truncate">{p.name}</h5>
                    <span className="text-[10px] text-gray-500">Categoría: {p.category}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50">
                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 block">BASE (U.N.)</span>
                      <span className="text-xs font-mono font-bold text-sky-400">
                        S/ {p.basePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right min-w-[65px]">
                      <span className="text-[9px] text-gray-500 block">CANTIDAD</span>
                      <span className={`text-xs font-mono font-bold ${p.stock === 0 ? "text-sky-400" : "text-emerald-500"}`}>
                        {p.stock === 0 ? "Sin Stock" : `${p.stock} und`}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSelectProduct(p)}
                      className="p-1.5 bg-[#0F172A] border border-slate-800 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                      title="Editar Precios y Stock"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product edit panel */}
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl h-fit">
            <h4 className="font-bold text-xs text-gray-200 font-display pb-3 border-b border-slate-700/50 mb-4">
              Ajuste de Catálogo Comercial
            </h4>

            {selectedProductSku ? (
              <div className="space-y-4">
                <div className="p-2.5 bg-[#0F172A] border border-slate-800 rounded-xl space-y-0.5">
                  <div className="text-[9px] font-mono text-sky-400 font-bold uppercase">EDITANDO SKU</div>
                  <div className="text-xs font-bold text-gray-200 truncate">{selectedProductSku}</div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Precio Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(Number(e.target.value))}
                    className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Unidades Disponibles (Stock)</label>
                  <input
                    type="number"
                    value={editingStock}
                    onChange={(e) => setEditingStock(Number(e.target.value))}
                    className="w-full bg-[#0F172A] border border-slate-800 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setSelectedProductSku(null)}
                    className="flex-1 bg-slate-850 hover:bg-slate-850 text-gray-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProductChanges}
                    disabled={isUpdatingProduct}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-gray-700" />
                <span>Seleccione el botón de edición de un producto de la lista para actualizar de forma inmediata stock o base de precio.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
