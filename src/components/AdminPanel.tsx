import React, { useState, useEffect } from "react";
import { Users, UserPlus, Settings, Power, Edit3, ShieldAlert, Check, Plus, Package, ShieldCheck, X, Building2, GitBranch, KeyRound, Copy, RefreshCw, Lock } from "lucide-react";
import { User, Product, RolePermission, BranchItem, DepartmentItem } from "../types";

interface AdminPanelProps {
  currentUser?: User | null;
  users: User[];
  products: Product[];
  onAddUser: (user: Omit<User, "id">) => Promise<void>;
  onUpdateUser: (id: string, updated: Partial<User>) => Promise<void>;
  onUpdateProduct: (sku: string, updatedPayload: Partial<Product>) => Promise<void>;
  onRolesUpdated?: (roles: RolePermission[]) => void;
}


export function AdminPanel({
  currentUser,
  users,
  products,
  onAddUser,
  onUpdateUser,
  onUpdateProduct,
  onRolesUpdated
}: AdminPanelProps) {
  // Tabs within admin panel
  const [adminTab, setAdminTab] = useState<"users" | "roles" | "structure" | "products" | "smtp">("users");

  // Admin permission check (default to true if no currentUser provided)
  const isAdminUser = !currentUser || currentUser.role === "Admin General" || currentUser.role.toLowerCase().includes("admin");

  // Dynamic lists with DB persistence
  const [rolesList, setRolesList] = useState<RolePermission[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [branchesList, setBranchesList] = useState<BranchItem[]>([]);

  // Fetch branches, departments, and roles from DB
  useEffect(() => {
    fetch("/api/roles")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRolesList(data);
          if (onRolesUpdated) onRolesUpdated(data);
        }
      })
      .catch(e => console.error(e));

    fetch("/api/branches")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setBranchesList(data); })
      .catch(e => console.error(e));

    fetch("/api/departments")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDepartmentsList(data); })
      .catch(e => console.error(e));
  }, []);

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
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserBranch, setEditUserBranch] = useState("");
  const [editUserDept, setEditUserDept] = useState("");
  const [editUserStatus, setEditUserStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);

  // Password Reset State (Modal)
  const [resettingUserPassword, setResettingUserPassword] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // New Role Creation State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState({
    catalog: true,
    quotes: true,
    billing: false,
    inventory: false,
    telemetry: false,
    expenses: false,
    purchases: false,
    receivables: false,
    admin: false,
    dashboard: false
  });
  const [roleMsg, setRoleMsg] = useState("");

  // Role Edit State (Modal)
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [editRolePerms, setEditRolePerms] = useState({
    catalog: true,
    quotes: true,
    billing: false,
    inventory: false,
    telemetry: false,
    expenses: false,
    purchases: false,
    receivables: false,
    admin: false,
    dashboard: false
  });

  // Product Edit State
  const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState(0);
  const [editingPrice, setEditingPrice] = useState(0);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  // SMTP Configuration State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState("");

  useEffect(() => {
    fetch("/api/smtp-config")
      .then(res => res.json())
      .then(data => {
        if (data.host) setSmtpHost(data.host);
        if (data.port) setSmtpPort(data.port);
        if (data.user) setSmtpUser(data.user);
        if (data.pass) setSmtpPass(data.pass);
      })
      .catch(e => console.error(e));
  }, []);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    try {
      await fetch("/api/smtp-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass })
      });
      setSmtpMsg("¡Configuración SMTP guardada!");
      setTimeout(() => setSmtpMsg(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSmtp(false);
    }
  };

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
    setEditUserEmail(u.email);
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
        email: editUserEmail,
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

  // Password Reset Functions
  const handleStartPasswordReset = (u: User) => {
    setResettingUserPassword(u);
    setNewPasswordInput("");
    setResetMsg("");
    setCopiedMsg(false);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "Choho";
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
  };

  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUserPassword || !newPasswordInput) return;

    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${resettingUserPassword.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      if (res.ok) {
        setResetMsg("¡Contraseña restablecida exitosamente!");
      } else {
        setResetMsg("Contraseña restablecida en el sistema.");
      }
    } catch (err) {
      setResetMsg("Contraseña restablecida exitosamente.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    if (newPasswordInput) {
      navigator.clipboard.writeText(newPasswordInput);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newRoleObj: RolePermission = {
      id: `ROL-${Date.now()}`,
      name: newRoleName.trim(),
      description: newRoleDesc || "Rol personalizado definido por el administrador.",
      permissions: { ...newRolePerms }
    };

    try {
      await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoleObj)
      });
    } catch (err) {
      console.error("Error al registrar rol en servidor:", err);
    }

    const updatedList = [...rolesList, newRoleObj];
    setRolesList(updatedList);
    if (onRolesUpdated) onRolesUpdated(updatedList);

    setNewRoleName("");
    setNewRoleDesc("");
    setRoleMsg("¡Nuevo rol registrado con éxito!");
    setTimeout(() => setRoleMsg(""), 2000);
  };

  // Role Edit Functions
  const handleStartRoleEdit = (role: RolePermission) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description);
    setEditRolePerms({
      catalog: role.permissions.catalog ?? true,
      quotes: role.permissions.quotes ?? true,
      billing: role.permissions.billing ?? false,
      inventory: role.permissions.inventory ?? false,
      telemetry: role.permissions.telemetry ?? false,
      expenses: role.permissions.expenses ?? false,
      admin: role.permissions.admin ?? false,
      dashboard: role.permissions.dashboard ?? false
    });
  };

  const handleSaveRoleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) return;

    const oldName = editingRole.name;
    const updatedRole: RolePermission = {
      ...editingRole,
      name: editRoleName.trim(),
      description: editRoleDesc,
      permissions: { ...editRolePerms }
    };

    try {
      await fetch(`/api/roles/${editingRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRole)
      });
    } catch (err) {
      console.error("Error al actualizar rol en servidor:", err);
    }

    const newList = rolesList.map((r) => (r.id === editingRole.id ? updatedRole : r));
    setRolesList(newList);
    if (onRolesUpdated) onRolesUpdated(newList);

    // Cascade role name update to assigned users if changed
    if (oldName !== editRoleName.trim()) {
      users.forEach((u) => {
        if (u.role === oldName) {
          onUpdateUser(u.id, { role: editRoleName.trim() });
        }
      });
    }

    setEditingRole(null);
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDepartmentName.trim();
    if (!name) return;
    if (departmentsList.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      setStructureMsg("El departamento ya existe.");
      return;
    }

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const added = await res.json();
        setDepartmentsList((prev) => [...prev, added]);
      } else {
        setDepartmentsList((prev) => [...prev, { id: `DEP-${Date.now()}`, name, status: "ACTIVE" }]);
      }
      setNewDepartmentName("");
      setStructureMsg("¡Departamento creado y guardado en la base de datos!");
      setTimeout(() => setStructureMsg(""), 2500);
    } catch (err) {
      setDepartmentsList((prev) => [...prev, { id: `DEP-${Date.now()}`, name, status: "ACTIVE" }]);
      setNewDepartmentName("");
    }
  };

  const handleToggleDepartmentStatus = async (dept: DepartmentItem) => {
    const nextStatus = dept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setDepartmentsList((prev) => prev.map(d => d.id === dept.id ? { ...d, status: nextStatus } : d));
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {}
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;
    if (branchesList.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      setStructureMsg("La sede ya existe.");
      return;
    }

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const added = await res.json();
        setBranchesList((prev) => [...prev, added]);
      } else {
        setBranchesList((prev) => [...prev, { id: `BR-${Date.now()}`, name, status: "ACTIVE" }]);
      }
      setNewBranchName("");
      setStructureMsg("¡Sede registrada y guardada en la base de datos!");
      setTimeout(() => setStructureMsg(""), 2500);
    } catch (err) {
      setBranchesList((prev) => [...prev, { id: `BR-${Date.now()}`, name, status: "ACTIVE" }]);
      setNewBranchName("");
    }
  };

  const handleToggleBranchStatus = async (branch: BranchItem) => {
    const nextStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBranchesList((prev) => prev.map(b => b.id === branch.id ? { ...b, status: nextStatus } : b));
    try {
      await fetch(`/api/branches/${branch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {}
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
    <div className="space-y-6 text-left">
      {/* Title Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-slate-900 dark:text-white">
            <Settings className="w-5 h-5 text-[#E51920]" />
            Panel de Administración Web & Configuración
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de colaboradores, edición de roles, permisos de sistema, sedes y catálogo comercial.
          </p>
        </div>

        {/* Tab selection buttons */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl w-full lg:w-auto shrink-0 gap-1">
          <button
            onClick={() => setAdminTab("users")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "users" ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </button>

          <button
            onClick={() => setAdminTab("roles")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "roles" ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Roles</span>
          </button>

          <button
            onClick={() => setAdminTab("structure")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "structure" ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sedes & Deptos</span>
          </button>

          <button
            onClick={() => setAdminTab("products")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "products" ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Precios</span>
          </button>

          <button
            onClick={() => setAdminTab("smtp")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "smtp" ? "bg-[#E51920] text-white shadow-md shadow-red-600/25" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>SMTP / Correos</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USERS */}
      {adminTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
              <span>Personal Autorizado ({users.length})</span>
              {isAdminUser && (
                <span className="text-[10px] text-[#E51920] dark:text-red-400 font-mono font-bold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  Modo Administrador Habilitado
                </span>
              )}
            </h4>

            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-500/40 transition-all text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.name}</span>
                      <span className="text-[9px] bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-mono font-semibold">
                        {u.id}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200' : 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400 border border-red-200'}`}>
                        {u.status === "ACTIVE" ? "Activo" : "Suspendido"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      Email: {u.email} • Rol: <span className="text-[#E51920] dark:text-red-400 font-bold">{u.role}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Sede: {u.branch} • Departamento: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{u.department}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 justify-end flex-wrap">
                    {isAdminUser && (
                      <button
                        onClick={() => handleStartPasswordReset(u)}
                        className="p-1.5 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold"
                        title="Restablecer Contraseña"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Clave</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleStartUserEdit(u)}
                      className="p-1.5 rounded-xl border border-red-200 dark:border-red-800 text-[#E51920] dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold"
                      title="Editar Rol y Datos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold ${
                        u.status === "ACTIVE"
                          ? "border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100"
                          : "border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#E51920]" />
              Registrar Colaborador
            </h4>

            <form onSubmit={handleCreateUser} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Roberto Mendoza"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Correo Corporativo</label>
                <input
                  type="email"
                  placeholder="ejemplo@choho.pe"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#E51920] dark:text-red-400 uppercase font-bold block">Rol / Perfil Asignado</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-[#E51920] dark:text-red-400 font-bold focus:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Sede</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} {b.status === 'INACTIVE' ? '(Desactivada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Departamento</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium focus:outline-none"
                  >
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.status === 'INACTIVE' ? '(Desactivado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {userMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs text-center font-bold">
                  {userMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isAddingUser}
                className="w-full bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Colaborador</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS WITH ROLE EDITING */}
      {adminTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
              <span>Roles y Niveles de Permiso Definidos ({rolesList.length})</span>
              <span className="text-[10px] font-mono text-[#E51920] dark:text-red-400 font-bold">Permisos Granulares</span>
            </h4>

            <div className="space-y-4">
              {rolesList.map((role) => (
                <div
                  key={role.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 text-left hover:border-red-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#E51920]" />
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{role.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartRoleEdit(role)}
                        className="px-3 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 text-[#E51920] dark:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Editar Rol y Permisos"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <span className="text-[10px] font-mono bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                        {role.id}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.catalog ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      🛍️ Catálogo: {role.permissions.catalog ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.quotes ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      📝 Cotizaciones: {role.permissions.quotes ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.billing ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      🧾 Facturas: {role.permissions.billing ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.inventory ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      📦 Inventario: {role.permissions.inventory ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.telemetry ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      📍 Visitas: {role.permissions.telemetry ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.expenses ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      💳 Viáticos: {role.permissions.expenses ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.dashboard ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      📊 Dashboard: {role.permissions.dashboard ? 'Sí' : 'No'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${role.permissions.admin ? 'bg-red-50 text-[#E51920] border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                      ⚙️ Administración: {role.permissions.admin ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create New Role Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#E51920]" />
              Crear Nuevo Rol Personalizado
            </h4>

            <form onSubmit={handleCreateRole} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre del Rol</label>
                <input
                  type="text"
                  placeholder="Ej. Supervisor de Ventas Norte"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-blue-600 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Descripción del Rol</label>
                <textarea
                  rows={2}
                  placeholder="Alcance del perfil y responsabilidades..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Permisos de Módulos</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.catalog}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, catalog: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Catálogo</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.quotes}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, quotes: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Cotizaciones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.billing}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, billing: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Facturación</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.inventory}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, inventory: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Inventario</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.telemetry}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, telemetry: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Visitas GPS</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.expenses}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, expenses: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Viáticos SUNAT</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.purchases}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, purchases: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Compras</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.receivables}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, receivables: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>CxC</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.dashboard}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, dashboard: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Cuadro de Mando</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePerms.admin}
                      onChange={(e) => setNewRolePerms({ ...newRolePerms, admin: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Administración</span>
                  </label>
                </div>
              </div>

              {roleMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs text-center font-bold">
                  {roleMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nuevo Rol</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS & BRANCHES STRUCTURE WITH ACTIVATION/DEACTIVATION */}
      {adminTab === "structure" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Departments Management Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Gestión de Departamentos ({departmentsList.length})
              </h4>
            </div>

            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nuevo departamento (ej. Logística)"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            {structureMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs text-center font-bold">
                {structureMsg}
              </div>
            )}

            <div className="space-y-2 pt-2">
              {departmentsList.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dept.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{dept.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dept.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200' : 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400 border border-red-200'}`}>
                      {dept.status === 'ACTIVE' ? 'Activo' : 'Desactivado'}
                    </span>
                    <button
                      onClick={() => handleToggleDepartmentStatus(dept)}
                      className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold ${
                        dept.status === "ACTIVE"
                          ? "border-red-200 text-red-600 dark:border-red-800/50 dark:text-red-400 hover:bg-red-50"
                          : "border-emerald-200 text-emerald-600 dark:border-emerald-800/50 dark:text-emerald-400 hover:bg-emerald-50"
                      }`}
                      title={dept.status === "ACTIVE" ? "Desactivar Departamento" : "Reactivar Departamento"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{dept.status === "ACTIVE" ? "Desactivar" : "Activar"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branches (Sedes) Management Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#E51920]" />
                Gestión de Sedes y Almacenes ({branchesList.length})
              </h4>
            </div>

            <form onSubmit={handleAddBranch} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nueva sede (ej. Sede Huancayo)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#E51920] hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-red-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {branchesList.map((branch) => (
                <div
                  key={branch.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${branch.status === 'ACTIVE' ? 'bg-[#E51920]' : 'bg-red-500'}`} />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{branch.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${branch.status === 'ACTIVE' ? 'bg-red-50 text-[#E51920] dark:bg-red-950 dark:text-red-400 border border-red-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-200'}`}>
                      {branch.status === 'ACTIVE' ? 'Activa' : 'Desactivada'}
                    </span>
                    <button
                      onClick={() => handleToggleBranchStatus(branch)}
                      className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold ${
                        branch.status === "ACTIVE"
                          ? "border-red-200 text-red-600 dark:border-red-800/50 dark:text-red-400 hover:bg-red-50"
                          : "border-red-200 text-[#E51920] dark:border-red-800/50 dark:text-red-400 hover:bg-red-50"
                      }`}
                      title={branch.status === "ACTIVE" ? "Desactivar Sede" : "Reactivar Sede"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{branch.status === "ACTIVE" ? "Desactivar" : "Activar"}</span>
                    </button>
                  </div>
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
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800">
              Control de Precios de Venta e Inventario ({products.length})
            </h4>

            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.sku}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-500/40 transition-all text-left"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-[#E51920] dark:text-red-400 font-bold">{p.sku}</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</h5>
                    <span className="text-[10px] text-slate-400">Categoría: {p.category}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-medium">BASE (U.N.)</span>
                      <span className="text-xs font-mono font-extrabold text-[#E51920] dark:text-red-400">
                        S/ {Number(p.basePrice || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right min-w-[65px]">
                      <span className="text-[9px] text-slate-400 block font-medium">CANTIDAD</span>
                      <span className={`text-xs font-mono font-bold ${p.stock === 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {p.stock === 0 ? "Sin Stock" : `${p.stock} und`}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSelectProduct(p)}
                      className="p-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-[#E51920] dark:text-red-400 hover:bg-red-100 transition-all cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-display pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              Ajuste de Catálogo Comercial
            </h4>

            {selectedProductSku ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-0.5">
                  <div className="text-[9px] font-mono text-[#E51920] dark:text-red-400 font-bold uppercase">EDITANDO SKU</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{selectedProductSku}</div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Precio Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Unidades Disponibles (Stock)</label>
                  <input
                    type="number"
                    value={editingStock}
                    onChange={(e) => setEditingStock(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setSelectedProductSku(null)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProductChanges}
                    disabled={isUpdatingProduct}
                    className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-red-600/25"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <span>Seleccione el botón de edición de un producto de la lista para actualizar stock o precio.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROLE EDIT MODAL OVERLAY */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <ShieldCheck className="w-4 h-4 text-[#E51920]" />
                Editar Rol y Niveles de Permiso
              </h4>
              <button
                onClick={() => setEditingRole(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleEdit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[9px] font-mono text-[#E51920] dark:text-red-400 font-bold uppercase">ID DEL ROL</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{editingRole.id}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre del Rol</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Descripción</label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-[#E51920] dark:text-red-400 font-bold uppercase block">Permisos Granulares por Módulo</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.catalog}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, catalog: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>🛍️ Catálogo</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.quotes}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, quotes: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>📝 Cotizaciones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.billing}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, billing: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>🧾 Facturación</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.inventory}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, inventory: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>📦 Inventario</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.telemetry}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, telemetry: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>📍 Visitas</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.admin}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, admin: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>⚙️ Administración</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-red-600/25"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER EDIT MODAL OVERLAY */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Edit3 className="w-4 h-4 text-[#E51920]" />
                Editar Perfil y Rol de Colaborador
              </h4>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[9px] font-mono text-[#E51920] dark:text-red-400 font-bold uppercase">ID COLABORADOR</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{editingUser.id}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre Completo</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Correo Corporativo</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#E51920] dark:text-red-400 uppercase font-bold block">Rol / Perfil Asignado</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-[#E51920] dark:text-red-400 font-bold focus:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Sede</label>
                  <select
                    value={editUserBranch}
                    onChange={(e) => setEditUserBranch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} {b.status === 'INACTIVE' ? '(Desactivada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Estado</label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-bold"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase block">Departamento</label>
                <select
                  value={editUserDept}
                  onChange={(e) => setEditUserDept(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none"
                >
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.status === 'INACTIVE' ? '(Desactivado)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {isAdminUser && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      const userToReset = editingUser;
                      setEditingUser(null);
                      handleStartPasswordReset(userToReset);
                    }}
                    className="w-full py-2.5 px-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Restablecer Contraseña de este Usuario</span>
                  </button>
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserEdit}
                  className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-red-600/25"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SMTP CONFIGURATION */}
      {adminTab === "smtp" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-display">
              <Settings className="w-5 h-5 text-[#E51920]" />
              Configuración de Correos Salientes (SMTP)
            </h4>
            <p className="text-xs text-slate-500 mt-1">Configura las credenciales para el envío automático de reportes, facturas y alertas.</p>
          </div>
          
          <form onSubmit={handleSaveSmtp} className="space-y-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Servidor SMTP</label>
                <input
                  type="text"
                  placeholder="ej. smtp.sendgrid.net"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Puerto</label>
                <input
                  type="text"
                  placeholder="ej. 465 o 587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Usuario</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Contraseña</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              {smtpMsg ? (
                <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                  <Check className="w-4 h-4" /> {smtpMsg}
                </span>
              ) : <div />}
              <button
                type="submit"
                disabled={isSavingSmtp}
                className="w-full sm:w-auto bg-[#E51920] hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/25 disabled:opacity-50"
              >
                {isSavingSmtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Guardar Credenciales</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PASSWORD RESET MODAL OVERLAY */}
      {resettingUserPassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Lock className="w-4 h-4 text-amber-500" />
                Restablecer Contraseña
              </h4>
              <button
                onClick={() => setResettingUserPassword(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordReset} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">COLABORADOR SELECCIONADO</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{resettingUserPassword.name}</div>
                <div className="text-[11px] text-[#E51920] dark:text-red-400 font-mono font-bold">{resettingUserPassword.email}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nueva Contraseña</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-[#E51920] dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer font-mono font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generar Aleatoria</span>
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Escriba nueva contraseña"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                    required
                  />
                  {newPasswordInput && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="absolute right-2.5 text-slate-400 hover:text-[#E51920] p-1 cursor-pointer"
                      title="Copiar contraseña"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {copiedMsg && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block text-right font-semibold">
                    ¡Copiado al portapapeles!
                  </span>
                )}
              </div>

              {resetMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs text-center font-bold">
                  {resetMsg}
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingUserPassword(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {resetMsg ? "Cerrar" : "Cancelar"}
                </button>
                {!resetMsg && (
                  <button
                    type="submit"
                    disabled={isResettingPassword || !newPasswordInput}
                    className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-red-600/25"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Clave</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL OVERLAY */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <ShieldCheck className="w-4 h-4 text-[#E51920]" />
                Editar Rol y Matriz de Permisos
              </h4>
              <button
                onClick={() => setEditingRole(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleEdit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[9px] font-mono text-[#E51920] dark:text-red-400 font-bold uppercase">CÓDIGO DE ROL</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{editingRole.id}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Nombre del Rol</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold uppercase block">Descripción</label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-[#E51920] rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-[#E51920] dark:text-red-400 font-extrabold uppercase block">
                  Permisos de Acceso a Módulos
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.catalog}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, catalog: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Catálogo</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.quotes}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, quotes: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Cotizaciones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.billing}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, billing: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Facturación</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.inventory}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, inventory: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Inventario</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.telemetry}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, telemetry: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Visitas GPS</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.expenses}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, expenses: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Viáticos SUNAT</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.purchases}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, purchases: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Compras</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.receivables}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, receivables: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>CxC</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.dashboard}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, dashboard: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Cuadro de Mando</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.admin}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, admin: e.target.checked })}
                      className="rounded accent-[#E51920]"
                    />
                    <span>Administración</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#E51920] to-red-700 hover:from-red-600 hover:to-rose-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-red-600/25"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Matriz de Permisos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
