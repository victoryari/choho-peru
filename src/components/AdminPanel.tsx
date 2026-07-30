import React, { useState } from "react";
import { Users, UserPlus, Settings, Power, Edit3, ShieldAlert, Check, Plus, Package, ShieldCheck, X, Building2, GitBranch } from "lucide-react";
import { User, Product, RolePermission } from "../types";

interface AdminPanelProps {
  users: User[];
  products: Product[];
  onAddUser: (user: Omit<User, "id">) => Promise<void>;
  onUpdateUser: (id: string, updated: Partial<User>) => Promise<void>;
  onUpdateProduct: (sku: string, updatedPayload: Partial<Product>) => Promise<void>;
}

const DEFAULT_ROLES: RolePermission[] = [
  {
    id: "ROL-1",
    name: "Admin General",
    description: "Acceso total a la administración, usuarios, catálogo, reportes y configuración de sistema.",
    permissions: { catalog: true, quotes: true, billing: true, inventory: true, telemetry: true, admin: true }
  },
  {
    id: "ROL-2",
    name: "Asesor Comercial",
    description: "Acceso a Catálogo de repuestos, creación de presupuestos de campo, mis cotizaciones y geolocalización.",
    permissions: { catalog: true, quotes: true, billing: false, inventory: false, telemetry: true, admin: false }
  },
  {
    id: "ROL-3",
    name: "Jefe de Finanzas",
    description: "Acceso a Panel de analíticas, historial de cotizaciones y facturación electrónica SUNAT.",
    permissions: { catalog: true, quotes: true, billing: true, inventory: false, telemetry: false, admin: false }
  },
  {
    id: "ROL-4",
    name: "Jefe de Almacén",
    description: "Acceso al control de inventario, stock físico y consulta del catálogo de productos.",
    permissions: { catalog: true, quotes: false, billing: false, inventory: true, telemetry: false, admin: false }
  }
];

const DEFAULT_DEPARTMENTS = ["Ventas", "Facturación", "Almacén", "Gerencia", "Marketing", "Operaciones", "Soporte Técnico"];
const DEFAULT_BRANCHES = ["Sede Trujillo", "Sede Lima", "Sede Lima Centro", "Sede Arequipa", "Sede Chiclayo"];

export function AdminPanel({
  users,
  products,
  onAddUser,
  onUpdateUser,
  onUpdateProduct
}: AdminPanelProps) {
  // Tabs within admin panel
  const [adminTab, setAdminTab] = useState<"users" | "roles" | "structure" | "products">("users");

  // Dynamic lists
  const [rolesList, setRolesList] = useState<RolePermission[]>(DEFAULT_ROLES);
  const [departmentsList, setDepartmentsList] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [branchesList, setBranchesList] = useState<string[]>(DEFAULT_BRANCHES);

  // New Department & Branch State
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [structureMsg, setStructureMsg] = useState("");

  // Add User State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Asesor Comercial");
  const [newUserBranch, setNewUserBranch] = useState("Sede Trujillo");
  const [newUserDept, setNewUserDept] = useState("Ventas");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  // User Edit State (Modal)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserBranch, setEditUserBranch] = useState("");
  const [editUserDept, setEditUserDept] = useState("");
  const [editUserStatus, setEditUserStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);

  // New Role Creation State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState({
    catalog: true,
    quotes: true,
    billing: false,
    inventory: false,
    telemetry: false,
    admin: false
  });
  const [roleMsg, setRoleMsg] = useState("");

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
      setUserMsg("Error al registrar colaborador.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleStartUserEdit = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserRole(u.role);
    setEditUserBranch(u.branch);
    setEditUserDept(u.department);
    setEditUserStatus(u.status);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingUserEdit(true);
    try {
      await onUpdateUser(editingUser.id, {
        name: editUserName,
        role: editUserRole,
        branch: editUserBranch,
        department: editUserDept,
        status: editUserStatus
      });
      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await onUpdateUser(user.id, { status: nextStatus });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;

    const newRoleObj: RolePermission = {
      id: `ROL-${Date.now()}`,
      name: newRoleName,
      description: newRoleDesc || "Rol personalizado definido por el administrador.",
      permissions: { ...newRolePerms }
    };

    setRolesList((prev) => [...prev, newRoleObj]);
    setNewRoleName("");
    setNewRoleDesc("");
    setRoleMsg("¡Nuevo rol registrado con éxito!");
    setTimeout(() => setRoleMsg(""), 2000);
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    if (departmentsList.includes(newDepartmentName.trim())) {
      setStructureMsg("El departamento ya existe.");
      return;
    }
    setDepartmentsList((prev) => [...prev, newDepartmentName.trim()]);
    setNewDepartmentName("");
    setStructureMsg("¡Departamento creado correctamente!");
    setTimeout(() => setStructureMsg(""), 2000);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    if (branchesList.includes(newBranchName.trim())) {
      setStructureMsg("La sede ya existe.");
      return;
    }
    setBranchesList((prev) => [...prev, newBranchName.trim()]);
    setNewBranchName("");
    setStructureMsg("¡Sede registrada correctamente!");
    setTimeout(() => setStructureMsg(""), 2000);
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
      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="font-bold text-sm text-gray-200 font-display flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            Panel de Administración Web Administrativo
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Gestión de colaboradores, asignación de roles, departamentos, sedes y catálogo comercial.
          </p>
        </div>

        {/* Tab selection buttons */}
        <div className="flex flex-wrap bg-[#0F172A] border border-slate-700/50 p-1 rounded-xl w-full lg:w-auto shrink-0 gap-1">
          <button
            onClick={() => setAdminTab("users")}
            className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "users" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </button>

          <button
            onClick={() => setAdminTab("roles")}
            className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "roles" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Roles</span>
          </button>

          <button
            onClick={() => setAdminTab("structure")}
            className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "structure" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sedes & Deptos</span>
          </button>

          <button
            onClick={() => setAdminTab("products")}
            className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "products" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Precios</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USERS */}
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

                    <div className="text-[11px] text-gray-400 mt-1 font-mono">
                      Email: {u.email} • Rol: <span className="text-sky-400 font-bold">{u.role}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Sede: {u.branch} • Departamento: <span className="text-emerald-400 font-medium">{u.department}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50 justify-end">
                    <button
                      onClick={() => handleStartUserEdit(u)}
                      className="p-1.5 rounded-lg border border-sky-900/60 text-sky-400 bg-sky-950/30 hover:bg-sky-900/50 text-xs transition-all cursor-pointer flex items-center gap-1"
                      title="Editar Rol y Datos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
                        u.status === "ACTIVE"
                          ? "border-red-900/50 text-red-400 bg-red-950/20 hover:bg-red-950/45"
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

            <form onSubmit={handleCreateUser} className="space-y-4 text-left">
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
                <label className="text-[11px] text-gray-400 uppercase font-mono block font-bold text-sky-400">Rol / Perfil Asignado</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-sky-400 font-bold focus:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
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
                    {branchesList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Departamento</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-3 py-2 text-xs text-emerald-400 font-medium focus:outline-none"
                  >
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
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

      {/* TAB 2: ROLES & PERMISSIONS */}
      {adminTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-xs text-gray-300 font-display pb-3 border-b border-slate-700/50 mb-2 flex items-center justify-between">
              <span>Roles y Niveles de Permiso Definidos ({rolesList.length})</span>
              <span className="text-[10px] font-mono text-sky-400 font-normal">Permisos Granulares por Módulo</span>
            </h4>

            <div className="space-y-4">
              {rolesList.map((role) => (
                <div
                  key={role.id}
                  className="p-4 bg-[#0F172A]/50 border border-slate-700/60 rounded-xl space-y-3 text-left hover:border-sky-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span className="text-sm font-bold text-white">{role.name}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {role.id}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${role.permissions.catalog ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' : 'bg-slate-900 text-gray-600 border-slate-800'}`}>
                      🛍️ Catálogo: {role.permissions.catalog ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${role.permissions.quotes ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' : 'bg-slate-900 text-gray-600 border-slate-800'}`}>
                      📝 Cotizaciones: {role.permissions.quotes ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${role.permissions.billing ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' : 'bg-slate-900 text-gray-600 border-slate-800'}`}>
                      🧾 Facturas: {role.permissions.billing ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${role.permissions.inventory ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' : 'bg-slate-900 text-gray-600 border-slate-800'}`}>
                      📦 Inventario: {role.permissions.inventory ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${role.permissions.telemetry ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' : 'bg-slate-900 text-gray-600 border-slate-800'}`}>
                      📍 Visitas: {role.permissions.telemetry ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${role.permissions.admin ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' : 'bg-slate-900 text-gray-600 border-slate-800'}`}>
                      ⚙️ Administración: {role.permissions.admin ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create New Role Panel */}
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl h-fit">
            <h4 className="font-bold text-xs text-gray-200 font-display pb-3 border-b border-slate-700/50 mb-4 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              Crear Nuevo Rol Personalizado
            </h4>

            <form onSubmit={handleCreateRole} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Nombre del Rol</label>
                <input
                  type="text"
                  placeholder="Ej. Supervisor de Ventas Norte"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Descripción del Rol</label>
                <textarea
                  rows={2}
                  placeholder="Alcance del perfil y responsabilidades..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 focus:border-sky-500/80 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Permisos de Módulos</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <label className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.catalog}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, catalog: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Catálogo</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.quotes}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, quotes: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Cotizaciones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.billing}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, billing: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Facturación</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.inventory}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, inventory: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Inventario</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.telemetry}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, telemetry: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Visitas</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.admin}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, admin: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>Administración</span>
                  </label>
                </div>
              </div>

              {roleMsg && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/60 text-emerald-400 rounded-lg text-xs text-center font-bold">
                  {roleMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nuevo Rol</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS & BRANCHES STRUCTURE */}
      {adminTab === "structure" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Departments Management Panel */}
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h4 className="font-bold text-xs text-gray-200 font-display flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Gestión de Departamentos ({departmentsList.length})
              </h4>
            </div>

            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nuevo departamento (ej. Logística)"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="flex-1 bg-[#0F172A] border border-slate-700/50 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            {structureMsg && (
              <div className="p-2 bg-emerald-950/30 border border-emerald-800 text-emerald-400 rounded-lg text-xs text-center font-bold">
                {structureMsg}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {departmentsList.map((dept) => (
                <div
                  key={dept}
                  className="p-3 bg-[#0F172A] border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-gray-200">{dept}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Branches (Sedes) Management Panel */}
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h4 className="font-bold text-xs text-gray-200 font-display flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-sky-400" />
                Gestión de Sedes y Almacenes ({branchesList.length})
              </h4>
            </div>

            <form onSubmit={handleAddBranch} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nueva sede (ej. Sede Huancayo)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="flex-1 bg-[#0F172A] border border-slate-700/50 focus:border-sky-500 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {branchesList.map((branch) => (
                <div
                  key={branch}
                  className="p-3 bg-[#0F172A] border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-gray-200">{branch}</span>
                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCTS & INVENTORY PRICING */}
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

      {/* USER EDIT MODAL OVERLAY */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h4 className="font-bold text-sm text-gray-200 flex items-center gap-2 font-display">
                <Edit3 className="w-4 h-4 text-sky-400" />
                Editar Perfil y Rol de Colaborador
              </h4>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="p-2.5 bg-[#0F172A] rounded-xl border border-slate-800">
                <div className="text-[9px] font-mono text-sky-400 font-bold uppercase">ID COLABORADOR</div>
                <div className="text-xs font-bold text-gray-200 font-mono">{editingUser.id} — {editingUser.email}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block">Nombre Completo</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block font-bold text-sky-400">Rol / Perfil Asignado</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 rounded-xl px-4 py-2 text-xs text-sky-400 font-bold focus:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Sede</label>
                  <select
                    value={editUserBranch}
                    onChange={(e) => setEditUserBranch(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
                  >
                    {branchesList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase font-mono block">Estado</label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full bg-[#0F172A] border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none font-bold"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 uppercase font-mono block font-bold text-emerald-400">Departamento</label>
                <select
                  value={editUserDept}
                  onChange={(e) => setEditUserDept(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none"
                >
                  {departmentsList.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-850 hover:bg-slate-850 text-gray-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserEdit}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
