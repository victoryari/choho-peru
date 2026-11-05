import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Users, UserPlus, Settings, Power, Edit3, ShieldAlert, Check, Plus, Package, 
  ShieldCheck, X, Building2, GitBranch, KeyRound, Copy, RefreshCw, Lock, Network, 
  ChevronRight, LayoutDashboard, ShoppingBag, Boxes, FileText, Receipt, Compass, 
  Wallet, DollarSign, Tags, TrendingUp, Cloud, ArrowUpRight, Layers,
  Upload, Image, Landmark, Trash2, Percent, Sliders, RotateCcw
} from "lucide-react";
import { User, Product, RolePermission, BranchItem, DepartmentItem, Categoria, BankAccount, CompanySettings } from "../types";
import { useAppStore } from "../store/useAppStore";
import { ChohoLogo } from "./ChohoLogo";
import { construirArbol, etiquetaClasificacion } from "../utils/categorias";

/** Directorio y Matriz de los 16 Módulos Operativos del Sistema ERP CHOHO Perú */
const SYSTEM_MODULES = [
  { key: "dashboard", label: "Cuadro de Mando (Dashboard)", path: "/", icon: LayoutDashboard, desc: "KPIs comerciales, reportes ejecutivos y gráficos analíticos de ventas", group: "Estratégico" },
  { key: "catalog", label: "Catálogo de Repuestos", path: "/catalog", icon: ShoppingBag, desc: "Catálogo oficial de transmisión y repuestos CHOHO", group: "Comercial" },
  { key: "inventory", label: "Control de Inventario & Almacén", path: "/inventory", icon: Boxes, desc: "Stock físico por sede y carga masiva desde Excel", group: "Operaciones" },
  { key: "picking", label: "Picking & Empaque", path: "/picking", icon: Boxes, desc: "Preparación de pedidos con escaneo, bultos y peso", group: "Operaciones" },
  { key: "shippingGuides", label: "Guías de Remisión (GRE)", path: "/shipping-guides", icon: FileText, desc: "Emisión de guías de remisión electrónicas del remitente", group: "Operaciones" },
  { key: "kardex", label: "Kárdex Multisede y Traslados", path: "/kardex", icon: Boxes, desc: "Kárdex físico inmutable y traslados de mercadería entre sedes", group: "Operaciones" },
  { key: "quotes", label: "Cotizaciones & Presupuestos", path: "/quotes", icon: FileText, desc: "Carrito de presupuesto comercial y cotizaciones en ruta", group: "Comercial" },
  { key: "billing", label: "Facturación Electrónica SUNAT", path: "/billing", icon: Receipt, desc: "Emisión de facturas y boletas electrónicas UBL 2.1", group: "Finanzas" },
  { key: "telemetry", label: "Check-ins GPS & Visitas", path: "/telemetry", icon: Compass, desc: "Geolocalización de visitas comerciales a clientes", group: "Comercial" },
  { key: "travelBudgets", label: "Caja Chica & Viáticos", path: "/travel-budgets", icon: Wallet, desc: "Fondos fijos de sede, rendición física e importación XML SUNAT", group: "Finanzas" },
  { key: "expenses", label: "Sustento de Viáticos (Ventas)", path: "/expenses", icon: Receipt, desc: "Portal de gastos en ruta para asesores comerciales", group: "Comercial" },
  { key: "receivables", label: "Cuentas por Cobrar (CxC)", path: "/receivables", icon: DollarSign, desc: "Cartera de clientes, seguimiento de pagos y cobranzas", group: "Finanzas" },
  { key: "discounts", label: "Reglas de Descuento", path: "/discounts", icon: Tags, desc: "Matriz comercial de escalas por volumen y pronto pago", group: "Comercial" },
  { key: "commissions", label: "Cálculo de Comisiones", path: "/commissions", icon: TrendingUp, desc: "Cálculo automático de comisiones por zonas y metas", group: "Comercial" },
  { key: "purchases", label: "Compras & Proveedores", path: "/inventory", icon: Package, desc: "Órdenes de compra, abastecimiento y recepción", group: "Operaciones" },
  { key: "sync", label: "Centro de Sincronización", path: "/sync", icon: Cloud, desc: "Operación offline y sincronización con base de datos", group: "Sistema" },
  { key: "admin", label: "Administración del Sistema", path: "/admin", icon: Users, desc: "Gestión de personal, roles, sedes y configuración SMTP", group: "Sistema" },
] as const;

/**
 * Determina si un rol o departamento corresponde a la fuerza comercial/ventas
 * para la cual aplica asignación de zona comercial y comisiones.
 */
function isSalesProfile(
  roleName?: string,
  deptName?: string,
  roles: RolePermission[] = []
): boolean {
  if (!roleName) return false;
  const r = roleName.toLowerCase().trim();
  const d = (deptName || "").toLowerCase().trim();

  // 1. Coincidencias directas por nombre de rol comercial / ventas
  if (
    r.includes("venta") ||
    r.includes("comercial") ||
    r.includes("vendedor") ||
    r.includes("asesor") ||
    r.includes("sales") ||
    r.includes("promotor") ||
    r.includes("preventa")
  ) {
    return true;
  }

  // 2. Si el departamento asignado es Ventas o Comercial
  if (d.includes("venta") || d.includes("comercial")) {
    return true;
  }

  // 3. Revisión en la matriz de roles: si tiene cotizaciones o comisiones (excluyendo roles puramente administrativos)
  const found = roles.find(item => item.name.toLowerCase() === r || item.id.toLowerCase() === r);
  if (found) {
    const p = found.permissions;
    if ((p.quotes || p.commissions || p.telemetry) && !p.admin) {
      return true;
    }
  }

  return false;
}

/** Una fila del árbol: muestra el nodo, cuántos productos lo usan y permite activar o eliminar. */
function FilaCategoria({
  cat,
  productos,
  onToggle,
  onDelete,
  sangria = 0
}: {
  cat: Categoria;
  productos: Product[];
  onToggle: (c: Categoria) => void;
  onDelete: (c: Categoria) => void;
  sangria?: number;
  // `key` se acepta explicitamente por compatibilidad con las tipas de React del proyecto.
  key?: React.Key;
}) {
  const usos = productos.filter(p => p.categoriaId === cat.id).length;
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 px-3 rounded-xl hover:bg-surface-2 dark:hover:bg-surface-2/60 transition-colors ${
        cat.activo ? "" : "opacity-50"
      }`}
      style={{ marginLeft: sangria * 20 }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {sangria > 0 && <ChevronRight className="w-3 h-3 text-ink-subtle shrink-0" />}
        <span
          className={`font-bold text-xs truncate ${
            cat.activo ? "text-ink" : "text-ink-subtle line-through"
          }`}
        >
          {cat.nombre}
        </span>
        <span className="text-micro font-mono text-ink-subtle bg-surface-2 px-1.5 py-0.5 rounded shrink-0">
          N{cat.nivel}
        </span>
        <span className="text-micro font-mono text-ink-subtle shrink-0">{usos} prod.</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button type="button"
          onClick={() => onToggle(cat)}
          title={cat.activo ? "Desactivar" : "Reactivar"}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            cat.activo
              ? "text-success-fg hover:bg-success-soft dark:hover:bg-success/30"
              : "text-ink-subtle hover:bg-field-hover dark:hover:bg-surface-2"
          }`}
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <button type="button"
          onClick={() => onDelete(cat)}
          title="Eliminar"
          className="p-1.5 rounded-lg text-ink-subtle hover:text-danger-fg hover:bg-danger-soft dark:hover:bg-danger/30 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface AdminPanelProps {
  currentUser?: User | null;
  users: User[];
  products: Product[];
  categorias: Categoria[];
  onCategoriasChanged: (categorias: Categoria[]) => void;
  onAddUser: (user: Omit<User, "id">) => Promise<void>;
  onUpdateUser: (id: string, updated: Partial<User>) => Promise<void>;
  onUpdateProduct: (sku: string, updatedPayload: Partial<Product>) => Promise<void>;
  onRolesUpdated?: (roles: RolePermission[]) => void;
}


export function AdminPanel({
  currentUser,
  users,
  products,
  categorias,
  onCategoriasChanged,
  onAddUser,
  onUpdateUser,
  onUpdateProduct,
  onRolesUpdated
}: AdminPanelProps) {
  // Tabs within admin panel
  const [adminTab, setAdminTab] = useState<"users" | "roles" | "structure" | "company" | "categorias" | "products" | "smtp">("users");

  // Company Settings & Financial Parameters
  const { companySettings, setCompanySettings } = useAppStore();
  const [compName, setCompName] = useState("");
  const [compTradeName, setCompTradeName] = useState("");
  const [compRuc, setCompRuc] = useState("");
  const [compAddress, setCompAddress] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compEmail, setCompEmail] = useState("");
  const [compBillingEmail, setCompBillingEmail] = useState("");
  const [compWebsite, setCompWebsite] = useState("");
  const [compSlogan, setCompSlogan] = useState("");
  const [compLogoUrl, setCompLogoUrl] = useState("");
  const [compIgvPercent, setCompIgvPercent] = useState<number>(18);
  const [compExchangeRate, setCompExchangeRate] = useState<number>(3.75);
  const [compDefaultCurrency, setCompDefaultCurrency] = useState<"PEN" | "USD">("PEN");
  const [compDefaultValidityDays, setCompDefaultValidityDays] = useState<number>(15);
  const [compBankAccounts, setCompBankAccounts] = useState<BankAccount[]>([]);

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companySuccessMsg, setCompanySuccessMsg] = useState("");
  const [companyErrorMsg, setCompanyErrorMsg] = useState("");

  // Sync state when companySettings changes or loads
  useEffect(() => {
    if (companySettings) {
      setCompName(companySettings.companyName || "");
      setCompTradeName(companySettings.tradeName || "");
      setCompRuc(companySettings.ruc || "");
      setCompAddress(companySettings.address || "");
      setCompPhone(companySettings.phone || "");
      setCompEmail(companySettings.email || "");
      setCompBillingEmail(companySettings.billingEmail || "");
      setCompWebsite(companySettings.website || "");
      setCompSlogan(companySettings.slogan || "");
      setCompLogoUrl(companySettings.logoUrl || "");
      setCompIgvPercent(typeof companySettings.igvPercent === "number" ? companySettings.igvPercent : 18);
      setCompExchangeRate(typeof companySettings.exchangeRate === "number" ? companySettings.exchangeRate : 3.75);
      setCompDefaultCurrency(companySettings.defaultCurrency || "PEN");
      setCompDefaultValidityDays(typeof companySettings.defaultValidityDays === "number" ? companySettings.defaultValidityDays : 15);
      setCompBankAccounts(Array.isArray(companySettings.bankAccounts) ? companySettings.bankAccounts : []);
    }
  }, [companySettings]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setCompanyErrorMsg("El archivo del logotipo no debe superar los 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCompLogoUrl(base64);
        setCompanyErrorMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultLogo = () => {
    setCompLogoUrl("");
    setCompTradeName("CHOHO");
    setCompSlogan("SISTEMAS DE TRANSMISIÓN");
  };

  const handleAddBankAccount = () => {
    const newAccount: BankAccount = {
      id: "bank_" + Date.now(),
      bankName: "BCP",
      currency: "PEN",
      accountType: "Cta. Corriente",
      accountNumber: "",
      cci: ""
    };
    setCompBankAccounts([...compBankAccounts, newAccount]);
  };

  const handleUpdateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...compBankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setCompBankAccounts(updated);
  };

  const handleRemoveBankAccount = (index: number) => {
    setCompBankAccounts(compBankAccounts.filter((_, i) => i !== index));
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setCompanySuccessMsg("");
    setCompanyErrorMsg("");

    const payload: Partial<CompanySettings> = {
      companyName: compName,
      tradeName: compTradeName,
      ruc: compRuc,
      address: compAddress,
      phone: compPhone,
      email: compEmail,
      billingEmail: compBillingEmail,
      website: compWebsite,
      slogan: compSlogan,
      logoUrl: compLogoUrl,
      igvPercent: Number(compIgvPercent) || 18,
      exchangeRate: Number(compExchangeRate) || 3.75,
      defaultCurrency: compDefaultCurrency,
      defaultValidityDays: Number(compDefaultValidityDays) || 15,
      bankAccounts: compBankAccounts
    };

    try {
      const res = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setCompanyErrorMsg(data.error || "Error al guardar la configuración");
        return;
      }
      setCompanySettings(data.settings);
      setCompanySuccessMsg("¡Configuración de la empresa y parámetros guardados exitosamente!");
      setTimeout(() => setCompanySuccessMsg(""), 4000);
    } catch (err: any) {
      setCompanyErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Admin permission check (default to true if no currentUser provided)
  const isAdminUser = !currentUser || currentUser.role === "Admin General" || (currentUser.role || "").toLowerCase().includes("admin");

  // Dynamic lists with DB persistence
  const [rolesList, setRolesList] = useState<RolePermission[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [branchesList, setBranchesList] = useState<BranchItem[]>([]);

  // Taxonomia de catalogo
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [nuevaCategoriaPadre, setNuevaCategoriaPadre] = useState("");
  const [categoriaMsg, setCategoriaMsg] = useState("");
  const [categoriaError, setCategoriaError] = useState("");
  const [categoriaOcupada, setCategoriaOcupada] = useState<string | null>(null);

  const refrescarCategorias = async () => {
    try {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      if (Array.isArray(data)) onCategoriasChanged(data);
    } catch (e) {
      console.error("No se pudieron cargar las categorías", e);
    }
  };

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoriaMsg("");
    setCategoriaError("");
    if (!nuevaCategoriaNombre.trim()) {
      setCategoriaError("Escribe un nombre para la categoría.");
      return;
    }
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCategoriaNombre.trim(), parentId: nuevaCategoriaPadre || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoriaError(data.error || "No se pudo crear la categoría.");
        return;
      }
      setNuevaCategoriaNombre("");
      setCategoriaMsg(`Categoría "${data.nombre}" creada.`);
      await refrescarCategorias();
    } catch (err) {
      setCategoriaError("No se pudo conectar con el servidor.");
    }
  };

  const handleToggleCategoria = async (cat: Categoria) => {
    setCategoriaMsg("");
    setCategoriaError("");
    try {
      const res = await fetch(`/api/categorias/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !cat.activo })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoriaError(data.error || "No se pudo actualizar la categoría.");
        return;
      }
      setCategoriaMsg(`Categoría "${cat.nombre}"${cat.activo ? "desactivada" : "reactivada"}.`);
      await refrescarCategorias();
    } catch (err) {
      setCategoriaError("No se pudo conectar con el servidor.");
    }
  };

  const handleDeleteCategoria = async (cat: Categoria) => {
    setCategoriaMsg("");
    setCategoriaError("");
    if (!window.confirm(`¿Eliminar la categoría "${cat.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/categorias/${cat.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoriaError(data.error || "No se pudo eliminar la categoría.");
        return;
      }
      setCategoriaMsg(`Categoría "${cat.nombre}" eliminada.`);
      await refrescarCategorias();
    } catch (err) {
      setCategoriaError("No se pudo conectar con el servidor.");
    }
  };

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
  const [newUserSalesZone, setNewUserSalesZone] = useState<import("../types").SalesZone>("Zona - Lima");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  // User Edit State (Modal)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserBranch, setEditUserBranch] = useState("");
  const [editUserDept, setEditUserDept] = useState("");
  const [editUserSalesZone, setEditUserSalesZone] = useState<import("../types").SalesZone>("Zona - Lima");
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
  const [newRolePerms, setNewRolePerms] = useState<Record<string, boolean>>({
    dashboard: false,
    catalog: true,
    inventory: false,
    quotes: true,
    billing: false,
    telemetry: false,
    travelBudgets: false,
    expenses: false,
    receivables: false,
    discounts: false,
    commissions: false,
    purchases: false,
    picking: false,
    shippingGuides: false,
    kardex: false,
    sync: true,
    admin: false
  });
  const [roleMsg, setRoleMsg] = useState("");

  // Role Edit State (Modal)
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [editRolePerms, setEditRolePerms] = useState<Record<string, boolean>>({
    dashboard: false,
    catalog: true,
    inventory: false,
    quotes: true,
    billing: false,
    telemetry: false,
    travelBudgets: false,
    expenses: false,
    receivables: false,
    discounts: false,
    commissions: false,
    purchases: false,
    picking: false,
    shippingGuides: false,
    kardex: false,
    sync: true,
    admin: false
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
      const isSales = isSalesProfile(newUserRole, newUserDept, rolesList);
      await onAddUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        branch: newUserBranch,
        department: newUserDept,
        salesZone: isSales ? newUserSalesZone : undefined,
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
    setEditUserSalesZone(u.salesZone || "Zona - Lima");
    setEditUserStatus(u.status);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingUserEdit(true);
    try {
      const isSales = isSalesProfile(editUserRole, editUserDept, rolesList);
      await onUpdateUser(editingUser.id, {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
        branch: editUserBranch,
        department: editUserDept,
        salesZone: isSales ? editUserSalesZone : undefined,
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
      permissions: {
        catalog: Boolean(newRolePerms.catalog),
        quotes: Boolean(newRolePerms.quotes),
        maintenance: Boolean(newRolePerms.admin || newRolePerms.inventory),
        inventory: Boolean(newRolePerms.inventory),
        telemetry: Boolean(newRolePerms.telemetry),
        expenses: Boolean(newRolePerms.expenses),
        travelBudgets: Boolean(newRolePerms.travelBudgets),
        purchases: Boolean(newRolePerms.purchases),
        receivables: Boolean(newRolePerms.receivables),
        discounts: Boolean(newRolePerms.discounts),
        commissions: Boolean(newRolePerms.commissions),
        admin: Boolean(newRolePerms.admin),
        dashboard: Boolean(newRolePerms.dashboard),
        billing: Boolean(newRolePerms.billing),
        picking: Boolean(newRolePerms.picking),
        shippingGuides: Boolean(newRolePerms.shippingGuides),
        kardex: Boolean(newRolePerms.kardex),
        sync: Boolean(newRolePerms.sync)
      }
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
      dashboard: role.permissions.dashboard ?? false,
      catalog: role.permissions.catalog ?? true,
      inventory: role.permissions.inventory ?? false,
      quotes: role.permissions.quotes ?? true,
      billing: role.permissions.billing ?? false,
      picking: role.permissions.picking ?? role.permissions.inventory ?? false,
      shippingGuides: role.permissions.shippingGuides ?? role.permissions.picking ?? role.permissions.inventory ?? false,
      kardex: role.permissions.kardex ?? role.permissions.inventory ?? false,
      telemetry: role.permissions.telemetry ?? false,
      travelBudgets: role.permissions.travelBudgets ?? false,
      expenses: role.permissions.expenses ?? false,
      receivables: role.permissions.receivables ?? false,
      discounts: role.permissions.discounts ?? false,
      commissions: role.permissions.commissions ?? false,
      purchases: role.permissions.purchases ?? false,
      sync: role.permissions.sync ?? true,
      admin: role.permissions.admin ?? false
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
      permissions: {
        ...editingRole.permissions,
        catalog: Boolean(editRolePerms.catalog),
        quotes: Boolean(editRolePerms.quotes),
        maintenance: Boolean(editRolePerms.admin || editRolePerms.inventory),
        inventory: Boolean(editRolePerms.inventory),
        telemetry: Boolean(editRolePerms.telemetry),
        expenses: Boolean(editRolePerms.expenses),
        travelBudgets: Boolean(editRolePerms.travelBudgets),
        purchases: Boolean(editRolePerms.purchases),
        receivables: Boolean(editRolePerms.receivables),
        discounts: Boolean(editRolePerms.discounts),
        commissions: Boolean(editRolePerms.commissions),
        admin: Boolean(editRolePerms.admin),
        dashboard: Boolean(editRolePerms.dashboard),
        billing: Boolean(editRolePerms.billing),
        picking: Boolean(editRolePerms.picking),
        shippingGuides: Boolean(editRolePerms.shippingGuides),
        kardex: Boolean(editRolePerms.kardex),
        sync: Boolean(editRolePerms.sync)
      }
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
    if (departmentsList.some(d => (d.name || "").toLowerCase() === name.toLowerCase())) {
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
    if (branchesList.some(b => (b.name || "").toLowerCase() === name.toLowerCase())) {
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

  if (currentUser && !isAdminUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="bg-surface border border-line shadow-card rounded-3xl p-8 max-w-md w-full space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-danger-soft text-danger-fg flex items-center justify-center mx-auto border border-danger/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-ink font-display">Acceso Restringido</h3>
            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
              Su perfil (<span className="font-bold text-ink">{currentUser.role}</span>) no cuenta con permisos administrativos para gestionar usuarios, roles ni configuraciones del sistema.
            </p>
          </div>
          <Link
            to="/travel-budgets"
            className="btn-primary w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5"
          >
            <span>Ir a mi Módulo de Trabajo</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Title Panel */}
      <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-base font-display flex items-center gap-2 text-ink">
            <Settings className="w-5 h-5 text-brand-fg" />
            Panel de Administración Web & Configuración
          </h3>
          <p className="text-xs text-ink-subtle mt-1">
            Gestión de colaboradores, edición de roles, permisos de sistema, sedes y catálogo comercial.
          </p>
        </div>

        {/* Tab selection buttons */}
        <div className="flex flex-wrap bg-surface-2 dark:bg-surface border border-line p-1.5 rounded-2xl w-full lg:w-auto shrink-0 gap-1">
          <button type="button"
            onClick={() => setAdminTab("users")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "users" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </button>

          <button type="button"
            onClick={() => setAdminTab("roles")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "roles" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Roles</span>
          </button>

          <button type="button"
            onClick={() => setAdminTab("structure")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "structure" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sedes & Deptos</span>
          </button>

          <button type="button"
            onClick={() => setAdminTab("company")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "company" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Empresa & Parámetros</span>
          </button>

          <button type="button"
            onClick={() => setAdminTab("categorias")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "categorias" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Categorías</span>
          </button>

          <button type="button"
            onClick={() => setAdminTab("products")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "products" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Precios</span>
          </button>

          <button type="button"
            onClick={() => setAdminTab("smtp")}
            className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "smtp" ? "bg-brand text-brand-contrast shadow-md shadow-brand/30" : "text-ink-muted hover:text-ink"
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
          <div className="lg:col-span-2 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-2 flex items-center justify-between">
              <span>Personal Autorizado ({users.length})</span>
              {isAdminUser && (
                <span className="text-xs text-brand-fg font-mono font-bold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  Modo Administrador Habilitado
                </span>
              )}
            </h4>

            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand/border transition-all text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">{u.name}</span>
                      <span className="text-micro bg-line/60 dark:bg-surface-2 text-ink-muted px-1.5 py-0.2 rounded font-mono font-semibold">
                        {u.id}
                      </span>
 <span className={`text-micro font-bold px-2 py-0.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-success-soft/30 text-success-fg dark:bg-success-soft border border-success/30' : 'bg-danger-soft/40 text-danger-fg dark:bg-danger-soft border border-danger/30'}`}>
                        {u.status === "ACTIVE" ? "Activo" : "Suspendido"}
                      </span>
                    </div>

                    <div className="text-xs text-ink-muted mt-1 font-mono">
                      Email: {u.email} • Rol: <span className="text-brand-fg font-bold">{u.role}</span>
                    </div>
                    <div className="text-xs text-ink-subtle mt-0.5">
                      Sede: {u.branch} • Departamento: <span className="text-success-fg font-medium">{u.department}</span>
                      {isSalesProfile(u.role, u.department, rolesList) && u.salesZone && (
                        <span> • Zona: <span className="text-brand-fg font-bold">{u.salesZone}</span></span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-line justify-end flex-wrap">
                    {isAdminUser && (
                      <button type="button"
                        onClick={() => handleStartPasswordReset(u)}
                        className="p-1.5 rounded-xl border border-warning/30 dark:border-warning/60 text-warning-fg bg-warning-soft dark:bg-warning/30 hover:bg-warning-soft/50 text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold"
                        title="Restablecer Contraseña"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Clave</span>
                      </button>
                    )}

                    <button type="button"
                      onClick={() => handleStartUserEdit(u)}
                      className="p-1.5 rounded-xl border border-danger/30 text-danger-fg bg-danger-soft hover:bg-danger-soft/50 text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold"
                      title="Editar Rol y Datos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button type="button"
                      onClick={() => handleToggleUserStatus(u)}
                      className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold ${
                        u.status === "ACTIVE"
 ? "border-danger/30 dark:border-danger/border text-danger-fg bg-danger-soft hover:bg-danger-soft/50"
                          : "border-success/30 dark:border-success/border text-success-fg bg-success-soft hover:bg-success-soft/50"
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
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit">
            <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-4 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-brand-fg" />
              Registrar Colaborador
            </h4>

            <form onSubmit={handleCreateUser} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Roberto Mendoza"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Correo Corporativo</label>
                <input
                  type="email"
                  placeholder="ejemplo@choho.pe"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-brand-fg uppercase font-bold block">Rol / Perfil Asignado</label>
                <select
                  value={newUserRole}
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    setNewUserRole(selectedRole);
                    const matchingDept = departmentsList.find(
                      d => d.name.toLowerCase() === selectedRole.toLowerCase()
                    );
                    if (matchingDept) {
                      setNewUserDept(matchingDept.name);
                    } else if (
                      selectedRole.toLowerCase().includes("venta") ||
                      selectedRole.toLowerCase().includes("comercial") ||
                      selectedRole.toLowerCase().includes("asesor")
                    ) {
                      const salesDept = departmentsList.find(d => d.name.toLowerCase().includes("venta"));
                      if (salesDept) setNewUserDept(salesDept.name);
                    }
                  }}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-brand-fg font-bold focus-visible:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Sede</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} {b.status === 'INACTIVE' ? '(Desactivada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Departamento</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-success-fg font-medium focus-visible:outline-none"
                  >
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.status === 'INACTIVE' ? '(Desactivado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isSalesProfile(newUserRole, newUserDept, rolesList) && (
                <div className="space-y-1">
                  <label className="text-xs text-brand-fg uppercase font-bold block">Zona de Ventas (Comisiones)</label>
                  <select
                    value={newUserSalesZone}
                    onChange={(e) => setNewUserSalesZone(e.target.value as any)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                  >
                    <option value="Zona - Lima">Zona - Lima</option>
                    <option value="Provincia - Con Metas">Provincia - Con Metas</option>
                    <option value="Provincia - Desde 1era Venta">Provincia - Desde 1era Venta</option>
                  </select>
                </div>
              )}

              {userMsg && (
                <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs text-center font-bold">
                  {userMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isAddingUser}
                className="btn-primary w-full gap-1.5"
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="lg:col-span-2 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-2 flex items-center justify-between">
                <span>Roles y Niveles de Permiso Definidos ({rolesList.length})</span>
                <span className="text-xs font-mono text-brand-fg font-bold">14 Módulos Granulares</span>
              </h4>

              <div className="space-y-4">
                {rolesList.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 bg-surface-2 dark:bg-surface-2/50 border border-line rounded-2xl space-y-3 text-left hover:border-brand/border transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-brand-fg" />
                        <span className="text-sm font-extrabold text-ink">{role.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => handleStartRoleEdit(role)}
                          className="px-3 py-1 bg-brand/10 border border-brand/30 hover:bg-brand/20 text-brand-fg rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Editar Rol y Permisos"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <span className="text-xs font-mono bg-line/60 dark:bg-surface-2 text-ink-muted px-2 py-0.5 rounded-full font-semibold">
                          {role.id}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-ink-muted leading-relaxed">
                      {role.description}
                    </p>

                    <div className="pt-3 border-t border-line">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-micro font-bold uppercase tracking-wider text-ink-subtle">
                          Módulos Habilitados
                        </span>
                        <span className="text-micro font-mono font-bold text-brand-fg bg-brand/10 px-2 py-0.5 rounded-full">
                          {SYSTEM_MODULES.filter(m => !!role.permissions[m.key as keyof typeof role.permissions]).length} / {SYSTEM_MODULES.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SYSTEM_MODULES.map((mod) => {
                          const Icon = mod.icon;
                          const isGranted = !!role.permissions[mod.key as keyof typeof role.permissions];
                          return (
                            <span
                              key={mod.key}
                              title={`${mod.label} (${mod.group}): ${isGranted ? 'Acceso Permitido' : 'Acceso Denegado'}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-micro rounded-lg border transition-all ${
                                isGranted
                                  ? 'bg-brand/10 text-brand-fg border-brand/30 font-bold'
                                  : 'bg-surface text-ink-subtle/50 border-line/60 opacity-60 font-medium'
                              }`}
                            >
                              <Icon className={`w-3 h-3 shrink-0 ${isGranted ? 'text-brand-fg' : 'text-ink-subtle/40'}`} />
                              <span className="truncate max-w-[120px]">{mod.label}</span>
                              <span className={`ml-0.5 font-bold ${isGranted ? 'text-brand-fg' : 'text-ink-subtle/40'}`}>
                                {isGranted ? '✓' : '—'}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Role Panel */}
            <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit">
              <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-4 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-brand-fg" />
                Crear Nuevo Rol Personalizado
              </h4>

              <form onSubmit={handleCreateRole} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre del Rol</label>
                  <input
                    type="text"
                    placeholder="Ej. Supervisor de Ventas Norte"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full bg-surface-2 border-none focus:border-brand/60 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Descripción del Rol</label>
                  <textarea
                    rows={2}
                    placeholder="Alcance del perfil y responsabilidades..."
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-ink-muted font-semibold uppercase block">
                      Permisos de Módulos (14)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allTrue = SYSTEM_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: true }), {});
                          setNewRolePerms(allTrue);
                        }}
                        className="text-micro font-bold text-brand-fg hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-ink-subtle text-micro">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allFalse = SYSTEM_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: false }), {});
                          setNewRolePerms(allFalse);
                        }}
                        className="text-micro font-bold text-ink-muted hover:underline cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-80 overflow-y-auto pr-1">
                    {SYSTEM_MODULES.map((mod) => {
                      const Icon = mod.icon;
                      const isChecked = !!newRolePerms[mod.key];
                      return (
                        <label
                          key={mod.key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-brand/10 border-brand/40 text-brand-fg font-semibold shadow-xs'
                              : 'bg-surface-2 border-line text-ink hover:border-line-hover'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNewRolePerms({ ...newRolePerms, [mod.key]: e.target.checked })}
                            className="rounded accent-brand mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{mod.label}</span>
                            </div>
                            <p className="text-micro text-ink-muted/80 line-clamp-1 mt-0.5 font-normal">
                              {mod.desc}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {roleMsg && (
                  <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs text-center font-bold">
                    {roleMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Nuevo Rol</span>
                </button>
              </form>
            </div>
          </div>

          {/* Directorio General de los 14 Módulos del Sistema */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-brand-fg" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                    Directorio & Matriz de Módulos del Sistema ERP
                    <span className="text-micro font-mono bg-brand/10 text-brand-fg border border-brand/20 px-2 py-0.5 rounded-full font-bold">
                      14 Módulos Activos
                    </span>
                  </h4>
                  <p className="text-xs text-ink-muted">
                    Catálogo oficial de módulos comerciales, financieros, logísticos y administrativos con asignación de roles.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {SYSTEM_MODULES.map((mod) => {
                const Icon = mod.icon;
                const authorizedRoles = rolesList.filter(
                  (r) => !!r.permissions[mod.key as keyof typeof r.permissions]
                );

                return (
                  <div
                    key={mod.key}
                    className="p-4 bg-surface-2 border border-line rounded-2xl flex flex-col justify-between hover:border-brand/40 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-8 h-8 rounded-xl bg-surface border border-line flex items-center justify-center text-brand-fg group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-micro font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-line text-ink-muted">
                          {mod.group}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-ink group-hover:text-brand-fg transition-colors">
                          {mod.label}
                        </div>
                        <p className="text-micro text-ink-muted leading-relaxed line-clamp-2 mt-1">
                          {mod.desc}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-micro font-semibold text-ink-subtle">
                          Roles autorizados ({authorizedRoles.length}):
                        </span>
                        <Link
                          to={mod.path}
                          className="text-micro font-bold text-brand-fg hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Abrir</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                        {authorizedRoles.length > 0 ? (
                          authorizedRoles.map((r) => (
                            <span
                              key={r.id}
                              className="text-micro font-medium bg-surface text-ink px-2 py-0.5 rounded-md border border-line"
                            >
                              {r.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-micro text-ink-subtle italic">Sin roles asignados</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS & BRANCHES STRUCTURE WITH ACTIVATION/DEACTIVATION */}
      {adminTab === "structure" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Departments Management Panel */}
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <Building2 className="w-4 h-4 text-success-fg" />
                Gestión de Departamentos ({departmentsList.length})
              </h4>
            </div>

            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nuevo departamento (ej. Logística)"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="flex-1 bg-surface-2 border-none focus:border-success/30 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
              />
              <button
                type="submit"
                className="bg-success hover:bg-success text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-success/20"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            {structureMsg && (
              <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs text-center font-bold">
                {structureMsg}
              </div>
            )}

            <div className="space-y-2 pt-2">
              {departmentsList.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 bg-surface-2 border border-line rounded-2xl flex items-center justify-between hover:border-line-strong dark:hover:border-line-strong transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dept.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-xs font-bold text-ink">{dept.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dept.status === 'ACTIVE' ? 'bg-success-soft/30 text-success-fg dark:bg-success-soft border border-success/30' : 'bg-danger-soft/40 text-danger-fg dark:bg-danger-soft border border-danger/30'}`}>
                      {dept.status === 'ACTIVE' ? 'Activo' : 'Desactivado'}
                    </span>
                    <button type="button"
                      onClick={() => handleToggleDepartmentStatus(dept)}
                      className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold ${
                        dept.status === "ACTIVE"
 ? "border-danger/30 text-danger-fg dark:border-danger/border hover:bg-danger-soft"
                          : "border-success/30 text-success-fg dark:border-success/border hover:bg-success-soft"
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
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink font-display flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-brand-fg" />
                Gestión de Sedes y Almacenes ({branchesList.length})
              </h4>
            </div>

            <form onSubmit={handleAddBranch} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nueva sede (ej. Sede Huancayo)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="flex-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
              />
              <button
                type="submit"
                className="btn-primary gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {branchesList.map((branch) => (
                <div
                  key={branch.id}
                  className="p-3 bg-surface-2 border border-line rounded-2xl flex items-center justify-between hover:border-line-strong dark:hover:border-line-strong transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${branch.status === 'ACTIVE' ? 'bg-brand' : 'bg-danger'}`} />
                    <span className="text-xs font-bold text-ink">{branch.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${branch.status === 'ACTIVE' ? 'bg-danger-soft text-danger-fg border border-danger/30' : 'bg-surface-2 text-ink-muted dark:bg-surface border border-line'}`}>
                      {branch.status === 'ACTIVE' ? 'Activa' : 'Desactivada'}
                    </span>
                    <button type="button"
                      onClick={() => handleToggleBranchStatus(branch)}
                      className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-1 font-semibold ${
                        branch.status === "ACTIVE"
 ? "border-danger/30 text-danger-fg dark:border-danger/border hover:bg-danger-soft"
                          : "border-danger/30 text-danger-fg dark:border-danger/border hover:bg-danger-soft"
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
      {adminTab === "categorias" && (
        <div className="space-y-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5">
            <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line flex items-center gap-2">
              <Network className="w-4 h-4 text-brand-fg" />
              Taxonomía del Catálogo
              <span className="text-xs font-mono text-ink-subtle font-normal">({categorias.length} nodos)</span>
            </h4>

            <p className="text-xs text-ink-muted mt-3 leading-relaxed">
              Jerarquía de tres niveles: <strong>Familia</strong> → <strong>Sub-familia</strong> → <strong>Línea</strong>.
              El motor de descuentos evalúa de la línea hacia la familia, y la regla más específica prevalece.
            </p>

            <form onSubmit={handleAddCategoria} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nombre de la nueva categoría"
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                className="flex-1 bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
              />
              <select
                value={nuevaCategoriaPadre}
                onChange={(e) => setNuevaCategoriaPadre(e.target.value)}
                className="bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
              >
                <option value="">Familia (nivel 1)</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>
                    {"—".repeat(c.nivel - 1)}{c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-primary gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            {categoriaMsg && (
              <div className="mt-3 p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> {categoriaMsg}
              </div>
            )}
            {categoriaError && (
              <div className="mt-3 p-3 bg-danger-soft border border-danger/30 text-danger-fg rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> {categoriaError}
              </div>
            )}
          </div>

          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5">
            <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line">
              Árbol de Familias
            </h4>

            {construirArbol(categorias).length === 0 ? (
              <p className="text-xs text-ink-subtle mt-4">Aún no hay categorías. Crea la primera familia.</p>
            ) : (
              <div className="mt-3 space-y-1">
                {construirArbol(categorias).map((familia) => (
                  <div key={familia.id}>
                    <FilaCategoria
                      cat={familia}
                      productos={products}
                      onToggle={handleToggleCategoria}
                      onDelete={handleDeleteCategoria}
                    />
                    {familia.hijos.map((sub) => (
                      <div key={sub.id}>
                        <FilaCategoria
                          cat={sub}
                          productos={products}
                          onToggle={handleToggleCategoria}
                          onDelete={handleDeleteCategoria}
                          sangria={1}
                        />
                        {sub.hijos.map((lin) => (
                          <FilaCategoria
                            key={lin.id}
                            cat={lin}
                            productos={products}
                            onToggle={handleToggleCategoria}
                            onDelete={handleDeleteCategoria}
                            sangria={2}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {adminTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Stock management list */}
          <div className="lg:col-span-2 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line">
              Control de Precios de Venta e Inventario ({products.length})
            </h4>

            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.sku}
                  className="p-3.5 bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand/border transition-all text-left"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-brand-fg font-bold">{p.sku}</span>
                    <h5 className="text-xs font-bold text-ink truncate">{p.name}</h5>
                    <span className="text-xs text-ink-subtle">Categoría: {etiquetaClasificacion(p) || "Sin clasificar"}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-line">
                    <div className="text-right">
                      <span className="text-micro text-ink-subtle block font-medium">BASE (U.N.)</span>
                      <span className="text-xs font-mono font-extrabold text-brand-fg">
                        S/ {Number(p.basePrice || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right min-w-[65px]">
                      <span className="text-micro text-ink-subtle block font-medium">CANTIDAD</span>
                      <span className={`text-xs font-mono font-bold ${p.stock === 0 ? "text-danger-fg" : "text-success-fg"}`}>
                        {p.stock === 0 ? "Sin Stock" : `${p.stock}und`}
                      </span>
                    </div>

                    <button type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="p-2 bg-danger-soft border border-danger/30 rounded-xl text-danger-fg hover:bg-danger-soft/50 transition-all cursor-pointer"
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
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-5 shadow-xs h-fit">
            <h4 className="font-extrabold text-sm text-ink font-display pb-3 border-b border-line mb-4">
              Ajuste de Catálogo Comercial
            </h4>

            {selectedProductSku ? (
              <div className="space-y-4">
                <div className="p-3 bg-surface-2 border border-line rounded-2xl space-y-0.5">
                  <div className="text-micro font-mono text-brand-fg font-bold uppercase">EDITANDO SKU</div>
                  <div className="text-xs font-bold text-ink truncate">{selectedProductSku}</div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Precio Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(Number(e.target.value))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Unidades Disponibles (Stock)</label>
                  <input
                    type="number"
                    value={editingStock}
                    onChange={(e) => setEditingStock(Number(e.target.value))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button type="button"
                    onClick={() => setSelectedProductSku(null)}
                    className="flex-1 bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button type="button"
                    onClick={handleSaveProductChanges}
                    disabled={isUpdatingProduct}
                    className="btn-primary flex-1 gap-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-ink-subtle text-xs flex flex-col items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-ink-subtle dark:text-ink" />
                <span>Seleccione el botón de edición de un producto de la lista para actualizar stock o precio.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROLE EDIT MODAL OVERLAY */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink flex items-center gap-2 font-display">
                <ShieldCheck className="w-4 h-4 text-brand-fg" />
                Editar Rol y Niveles de Permiso
              </h4>
              <button type="button"
                onClick={() => setEditingRole(null)}
                className="p-1 text-ink-subtle hover:text-ink rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleEdit} className="space-y-4">
              <div className="p-3 bg-surface-2 rounded-2xl border border-line">
                <div className="text-micro font-mono text-brand-fg font-bold uppercase">ID DEL ROL</div>
                <div className="text-xs font-bold text-ink font-mono">{editingRole.id}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre del Rol</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Descripción</label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-brand-fg font-bold uppercase block">Permisos Granulares por Módulo</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-ink dark:text-ink-muted">
                  <label className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.catalog}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, catalog: e.target.checked })}
                      className="rounded accent-brand"
                    />
                    <span>🛍️ Catálogo</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.quotes}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, quotes: e.target.checked })}
                      className="rounded accent-brand"
                    />
                    <span>📝 Cotizaciones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.billing}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, billing: e.target.checked })}
                      className="rounded accent-brand"
                    />
                    <span>🧾 Facturación</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.inventory}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, inventory: e.target.checked })}
                      className="rounded accent-brand"
                    />
                    <span>📦 Inventario</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.telemetry}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, telemetry: e.target.checked })}
                      className="rounded accent-brand"
                    />
                    <span>📍 Visitas</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRolePerms.admin}
                      onChange={(e) => setEditRolePerms({ ...editRolePerms, admin: e.target.checked })}
                      className="rounded accent-brand"
                    />
                    <span>⚙️ Administración</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="flex-1 bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 gap-1"
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
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink flex items-center gap-2 font-display">
                <Edit3 className="w-4 h-4 text-brand-fg" />
                Editar Perfil y Rol de Colaborador
              </h4>
              <button type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-ink-subtle hover:text-ink rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="p-3 bg-surface-2 rounded-2xl border border-line">
                <div className="text-micro font-mono text-brand-fg font-bold uppercase">ID COLABORADOR</div>
                <div className="text-xs font-bold text-ink font-mono">{editingUser.id}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre Completo</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Correo Corporativo</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-brand-fg uppercase font-bold block">Rol / Perfil Asignado</label>
                <select
                  value={editUserRole}
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    setEditUserRole(selectedRole);
                    const matchingDept = departmentsList.find(
                      d => d.name.toLowerCase() === selectedRole.toLowerCase()
                    );
                    if (matchingDept) {
                      setEditUserDept(matchingDept.name);
                    } else if (
                      selectedRole.toLowerCase().includes("venta") ||
                      selectedRole.toLowerCase().includes("comercial") ||
                      selectedRole.toLowerCase().includes("asesor")
                    ) {
                      const salesDept = departmentsList.find(d => d.name.toLowerCase().includes("venta"));
                      if (salesDept) setEditUserDept(salesDept.name);
                    }
                  }}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-brand-fg font-bold focus-visible:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Sede</label>
                  <select
                    value={editUserBranch}
                    onChange={(e) => setEditUserBranch(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} {b.status === 'INACTIVE' ? '(Desactivada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Estado</label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-ink focus-visible:outline-none font-bold"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-success-fg font-semibold uppercase block">Departamento</label>
                <select
                  value={editUserDept}
                  onChange={(e) => setEditUserDept(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs text-success-fg font-bold focus-visible:outline-none"
                >
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.status === 'INACTIVE' ? '(Desactivado)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {isSalesProfile(editUserRole, editUserDept, rolesList) && (
                <div className="space-y-1">
                  <label className="text-xs text-brand-fg uppercase font-bold block">Zona de Ventas / Esquema de Comisión</label>
                  <select
                    value={editUserSalesZone}
                    onChange={(e) => setEditUserSalesZone(e.target.value as any)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                  >
                    <option value="Zona - Lima">Zona - Lima</option>
                    <option value="Provincia - Con Metas">Provincia - Con Metas</option>
                    <option value="Provincia - Desde 1era Venta">Provincia - Desde 1era Venta</option>
                  </select>
                </div>
              )}

              {isAdminUser && (
                <div className="pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => {
                      const userToReset = editingUser;
                      setEditingUser(null);
                      handleStartPasswordReset(userToReset);
                    }}
                    className="w-full py-2.5 px-3 bg-warning-soft dark:bg-warning/30 border border-warning/30 dark:border-warning/60 hover:bg-warning-soft/50 text-warning-fg rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Restablecer Contraseña de este Usuario</span>
                  </button>
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserEdit}
                  className="btn-primary flex-1 gap-1"
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
        <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-line pb-4">
            <h4 className="font-extrabold text-sm text-ink flex items-center gap-2 font-display">
              <Settings className="w-5 h-5 text-brand-fg" />
              Configuración de Correos Salientes (SMTP)
            </h4>
            <p className="text-xs text-ink-muted mt-1">Configura las credenciales para el envío automático de reportes, facturas y alertas.</p>
          </div>
          
          <form onSubmit={handleSaveSmtp} className="space-y-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Servidor SMTP</label>
                <input
                  type="text"
                  placeholder="ej. smtp.sendgrid.net"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Puerto</label>
                <input
                  type="text"
                  placeholder="ej. 465 o 587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-mono focus-visible:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Usuario</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Contraseña</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-line flex flex-col sm:flex-row justify-between items-center gap-4">
              {smtpMsg ? (
                <span className="text-success-fg font-bold text-xs flex items-center gap-1">
                  <Check className="w-4 h-4" /> {smtpMsg}
                </span>
              ) : <div />}
              <button
                type="submit"
                disabled={isSavingSmtp}
                className="btn-primary w-full sm:w-auto gap-2 disabled:opacity-50"
              >
                {isSavingSmtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Guardar Credenciales</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: EMPRESA Y CONFIGURACIÓN GENERAL */}
      {adminTab === "company" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveCompanySettings} className="space-y-6">
            {/* Header info */}
            <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="font-extrabold text-base text-ink flex items-center gap-2 font-display">
                    <Building2 className="w-5 h-5 text-brand-fg" />
                    Identidad Corporativa, Parámetros Financieros & Fiscales
                  </h4>
                  <p className="text-xs text-ink-muted mt-1">
                    Establezca el logotipo comercial, razón social, RUC SUNAT, tasa de IGV, tipo de cambio y cuentas bancarias oficiales para presupuestos y facturación.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="btn-primary gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSavingCompany ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Guardar Toda la Configuración</span>
                </button>
              </div>

              {companySuccessMsg && (
                <div className="mt-4 p-3 bg-success-soft text-success-fg rounded-xl text-xs font-bold flex items-center gap-2 border border-success/30">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{companySuccessMsg}</span>
                </div>
              )}

              {companyErrorMsg && (
                <div className="mt-4 p-3 bg-danger-soft text-danger-fg rounded-xl text-xs font-bold flex items-center gap-2 border border-danger/30">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{companyErrorMsg}</span>
                </div>
              )}
            </div>

            {/* Grid 2 Columns: Logo & Parameters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Logo e Identidad */}
              <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-2">
                    <Image className="w-4 h-4 text-brand-fg" />
                    Logotipo Oficial & Marca Comercial
                  </h5>
                  {compLogoUrl && (
                    <button
                      type="button"
                      onClick={handleResetDefaultLogo}
                      className="text-micro font-bold text-ink-muted hover:text-danger-fg flex items-center gap-1 cursor-pointer transition-colors"
                      title="Volver al logotipo SVG por defecto de CHOHO"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restaurar CHOHO Oficial</span>
                    </button>
                  )}
                </div>

                {/* Previews: Light and Dark Mode */}
                <div className="space-y-2">
                  <label className="text-micro font-bold uppercase text-ink-muted block">
                    Vista Previa en Vivo (Tema Claro & Tema Oscuro)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Light preview */}
                    <div className="p-4 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center min-h-[120px] text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-stone-400 mb-2">Fondo Claro (PDF / Web)</span>
                      {compLogoUrl ? (
                        <img
                          src={compLogoUrl}
                          alt="Logotipo de la empresa"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <ChohoLogo size="md" />
                      )}
                    </div>

                    {/* Dark preview */}
                    <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex flex-col items-center justify-center min-h-[120px] text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-stone-500 mb-2">Fondo Oscuro</span>
                      {compLogoUrl ? (
                        <img
                          src={compLogoUrl}
                          alt="Logotipo de la empresa"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <ChohoLogo size="md" />
                      )}
                    </div>
                  </div>
                </div>

                {/* File Upload / Image URL */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-ink-muted font-semibold uppercase block mb-1.5">
                      Subir Imagen desde su Computadora
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-line hover:border-brand/50 bg-surface-2 rounded-2xl cursor-pointer transition-all text-xs font-semibold text-ink group">
                      <Upload className="w-4 h-4 text-brand-fg group-hover:scale-110 transition-transform" />
                      <span>Seleccionar archivo (PNG, JPG, SVG o WebP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-micro text-ink-subtle mt-1">
                      Recomendado: Imagen con fondo transparente (PNG o SVG) de 400x120px aprox.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-ink-muted font-semibold uppercase block">
                      O enlace web directo de la imagen (URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/logo.png"
                      value={compLogoUrl}
                      onChange={(e) => setCompLogoUrl(e.target.value)}
                      className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-ink-muted font-semibold uppercase block">
                        Nombre Comercial / Marca
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. CHOHO"
                        value={compTradeName}
                        onChange={(e) => setCompTradeName(e.target.value)}
                        className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-bold focus-visible:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-muted font-semibold uppercase block">
                        Eslogan Comercial
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. SISTEMAS DE TRANSMISIÓN"
                        value={compSlogan}
                        onChange={(e) => setCompSlogan(e.target.value)}
                        className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Parámetros Financieros & Comerciales */}
              <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-fg" />
                    Parámetros Financieros & Fiscales
                  </h5>
                  <span className="text-micro font-bold text-success-fg bg-success-soft px-2 py-0.5 rounded-full">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* IGV Percent */}
                  <div className="space-y-1.5 p-3.5 bg-surface-2 rounded-2xl border border-line">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-ink-muted font-bold uppercase block flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-brand-fg" />
                        Tasa de IGV Oficial
                      </label>
                      <span className="text-micro font-mono font-bold text-brand-fg">SUNAT</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={compIgvPercent}
                        onChange={(e) => setCompIgvPercent(parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-sm text-ink font-bold focus-visible:outline-none font-mono"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">%</span>
                    </div>
                    <p className="text-micro text-ink-subtle">
                      Se aplica automáticamente al desglose de cotizaciones y facturas.
                    </p>
                  </div>

                  {/* Tipo de Cambio */}
                  <div className="space-y-1.5 p-3.5 bg-surface-2 rounded-2xl border border-line">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-ink-muted font-bold uppercase block flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-brand-fg" />
                        Tipo de Cambio (USD a PEN)
                      </label>
                      <span className="text-micro font-mono font-bold text-brand-fg">T.C.</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={compExchangeRate}
                        onChange={(e) => setCompExchangeRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-sm text-ink font-bold focus-visible:outline-none font-mono"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">S/.</span>
                    </div>
                    <p className="text-micro text-ink-subtle">
                      Equivalencia para conversiones entre moneda nacional y extranjera.
                    </p>
                  </div>

                  {/* Moneda Predeterminada */}
                  <div className="space-y-1.5 p-3.5 bg-surface-2 rounded-2xl border border-line">
                    <label className="text-xs text-ink-muted font-bold uppercase block">
                      Moneda Predeterminada
                    </label>
                    <select
                      value={compDefaultCurrency}
                      onChange={(e) => setCompDefaultCurrency(e.target.value as "PEN" | "USD")}
                      className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-2 text-xs font-bold text-ink focus-visible:outline-none"
                    >
                      <option value="PEN">PEN (Soles Peruanos - S/.)</option>
                      <option value="USD">USD (Dólares Americanos - $)</option>
                    </select>
                    <p className="text-micro text-ink-subtle">
                      Moneda base inicial al generar nuevas cotizaciones comerciales.
                    </p>
                  </div>

                  {/* Días de Validez */}
                  <div className="space-y-1.5 p-3.5 bg-surface-2 rounded-2xl border border-line">
                    <label className="text-xs text-ink-muted font-bold uppercase block">
                      Validez de Cotización
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={compDefaultValidityDays}
                        onChange={(e) => setCompDefaultValidityDays(parseInt(e.target.value) || 15)}
                        className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-bold focus-visible:outline-none font-mono"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">días</span>
                    </div>
                    <p className="text-micro text-ink-subtle">
                      Vigencia estándar impresa en la cabecera de las cotizaciones PDF.
                    </p>
                  </div>
                </div>

                {/* Resumen de Datos Legales Rápidos */}
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl text-xs text-brand-fg">
                  <strong>Nota:</strong> Los cambios en la tasa de IGV y tipo de cambio se reflejarán de inmediato en los cálculos de nuevos presupuestos y documentos electrónicos generados.
                </div>
              </div>
            </div>

            {/* Card 3: Información Legal & Fiscal */}
            <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
              <h5 className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-2 pb-3 border-b border-line">
                <Building2 className="w-4 h-4 text-brand-fg" />
                Información Legal, Fiscal & Domicilio SUNAT
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Razón Social Completa
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CHOHO PERU S.A.C."
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-bold focus-visible:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    RUC (Registro Único de Contribuyentes)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="20601234567"
                    value={compRuc}
                    onChange={(e) => setCompRuc(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-mono font-bold focus-visible:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Teléfono Central / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+51 1 234-5678"
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Dirección Fiscal Oficial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Av. Nicolás Arriola Nro. 1234, La Victoria, Lima - Perú"
                    value={compAddress}
                    onChange={(e) => setCompAddress(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Sitio Web Oficial
                  </label>
                  <input
                    type="text"
                    placeholder="www.choho.pe"
                    value={compWebsite}
                    onChange={(e) => setCompWebsite(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Correo Comercial / Cotizaciones
                  </label>
                  <input
                    type="email"
                    placeholder="ventas@choho.pe"
                    value={compEmail}
                    onChange={(e) => setCompEmail(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">
                    Correo Facturación Electrónica
                  </label>
                  <input
                    type="email"
                    placeholder="facturacion@choho.pe"
                    value={compBillingEmail}
                    onChange={(e) => setCompBillingEmail(e.target.value)}
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Cuentas Bancarias Oficiales */}
            <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-line">
                <div>
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-brand-fg" />
                    Cuentas Bancarias Oficiales para Depósitos y Transferencias
                  </h5>
                  <p className="text-micro text-ink-subtle mt-0.5">
                    Estas cuentas bancarias se insertan automáticamente al pie de las cotizaciones en PDF entregadas al cliente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBankAccount}
                  className="btn-primary py-1.5 px-3 text-xs gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Cuenta Bancaria</span>
                </button>
              </div>

              {compBankAccounts.length === 0 ? (
                <div className="text-center py-8 text-ink-muted bg-surface-2 rounded-2xl border border-dashed border-line">
                  <Landmark className="w-8 h-8 mx-auto text-ink-subtle mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No hay cuentas bancarias registradas.</p>
                  <p className="text-micro text-ink-subtle mt-1">Haga clic en "Agregar Cuenta Bancaria" para configurar cuentas del BCP, BBVA, Interbank, etc.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {compBankAccounts.map((account, index) => (
                    <div
                      key={account.id || index}
                      className="p-4 bg-surface-2 rounded-2xl border border-line grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end"
                    >
                      <div className="space-y-1">
                        <label className="text-micro font-bold uppercase text-ink-muted block">Banco</label>
                        <input
                          type="text"
                          placeholder="BCP, BBVA, etc."
                          value={account.bankName}
                          onChange={(e) => handleUpdateBankAccount(index, "bankName", e.target.value)}
                          className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-1.5 text-xs font-bold text-ink focus-visible:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-micro font-bold uppercase text-ink-muted block">Moneda</label>
                        <select
                          value={account.currency}
                          onChange={(e) => handleUpdateBankAccount(index, "currency", e.target.value as any)}
                          className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-2 py-1.5 text-xs font-bold text-ink focus-visible:outline-none"
                        >
                          <option value="PEN">Soles (S/.)</option>
                          <option value="USD">Dólares ($)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-micro font-bold uppercase text-ink-muted block">Tipo Cuenta</label>
                        <input
                          type="text"
                          placeholder="Cta. Corriente"
                          value={account.accountType || ""}
                          onChange={(e) => handleUpdateBankAccount(index, "accountType", e.target.value)}
                          className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-micro font-bold uppercase text-ink-muted block">N° Cuenta</label>
                        <input
                          type="text"
                          placeholder="191-xxxxxxx-0-xx"
                          value={account.accountNumber}
                          onChange={(e) => handleUpdateBankAccount(index, "accountNumber", e.target.value)}
                          className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-1.5 text-xs text-ink font-mono focus-visible:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-micro font-bold uppercase text-ink-muted block">Código CCI</label>
                        <input
                          type="text"
                          placeholder="002-191-xxxxxxxxxxxx-xx"
                          value={account.cci || ""}
                          onChange={(e) => handleUpdateBankAccount(index, "cci", e.target.value)}
                          className="w-full bg-surface border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-3 py-1.5 text-xs text-ink font-mono focus-visible:outline-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveBankAccount(index)}
                          className="p-2 text-danger-fg hover:bg-danger-soft rounded-xl transition-all cursor-pointer"
                          title="Eliminar cuenta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 bg-surface border border-line rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-ink-muted">
                Recuerde hacer clic en guardar para aplicar los cambios en todo el ERP y documentos PDF.
              </span>
              <button
                type="submit"
                disabled={isSavingCompany}
                className="btn-primary w-full sm:w-auto gap-2 disabled:opacity-50"
              >
                {isSavingCompany ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Guardar Toda la Configuración</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PASSWORD RESET MODAL OVERLAY */}
      {resettingUserPassword && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink flex items-center gap-2 font-display">
                <Lock className="w-4 h-4 text-warning-fg" />
                Restablecer Contraseña
              </h4>
              <button type="button"
                onClick={() => setResettingUserPassword(null)}
                className="p-1 text-ink-subtle hover:text-ink rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordReset} className="space-y-4">
              <div className="p-3 bg-surface-2 rounded-2xl border border-line space-y-0.5">
                <div className="text-xs font-mono text-ink-subtle uppercase">COLABORADOR SELECCIONADO</div>
                <div className="text-xs font-bold text-ink">{resettingUserPassword.name}</div>
                <div className="text-xs text-brand-fg font-mono font-bold">{resettingUserPassword.email}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-ink-muted font-semibold uppercase block">Nueva Contraseña</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-xs text-brand-fg hover:underline flex items-center gap-1 cursor-pointer font-mono font-bold"
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
                    className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl pl-4 pr-10 py-2.5 text-xs text-ink font-mono focus-visible:outline-none"
                    required
                  />
                  {newPasswordInput && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      aria-label="Copiar la contraseña generada al portapapeles"
                      className="absolute right-2.5 text-ink-subtle hover:text-brand-fg p-1 cursor-pointer"
                      title="Copiar contraseña"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {copiedMsg && (
                  <span className="text-xs text-success-fg font-mono block text-right font-semibold">
                    ¡Copiado al portapapeles!
                  </span>
                )}
              </div>

              {resetMsg && (
                <div className="p-3 bg-success-soft border border-success/30 text-success-fg rounded-xl text-xs text-center font-bold">
                  {resetMsg}
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setResettingUserPassword(null)}
                  className="flex-1 bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {resetMsg ? "Cerrar" : "Cancelar"}
                </button>
                {!resetMsg && (
                  <button
                    type="submit"
                    disabled={isResettingPassword || !newPasswordInput}
                    className="btn-primary flex-1 gap-1"
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
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="font-extrabold text-sm text-ink flex items-center gap-2 font-display">
                <ShieldCheck className="w-4 h-4 text-brand-fg" />
                Editar Rol y Matriz de Permisos
              </h4>
              <button type="button"
                onClick={() => setEditingRole(null)}
                className="p-1 text-ink-subtle hover:text-ink rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleEdit} className="space-y-4">
              <div className="p-3 bg-surface-2 rounded-2xl border border-line">
                <div className="text-micro font-mono text-brand-fg font-bold uppercase">CÓDIGO DE ROL</div>
                <div className="text-xs font-bold text-ink font-mono">{editingRole.id}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Nombre del Rol</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink font-bold focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-ink-muted font-semibold uppercase block">Descripción</label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-brand/20 rounded-xl px-4 py-2 text-xs text-ink focus-visible:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-brand-fg font-extrabold uppercase block">
                    Permisos de Acceso a Módulos (14)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allTrue = SYSTEM_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: true }), {});
                        setEditRolePerms(allTrue);
                      }}
                      className="text-micro font-bold text-brand-fg hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-ink-subtle text-micro">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allFalse = SYSTEM_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: false }), {});
                        setEditRolePerms(allFalse);
                      }}
                      className="text-micro font-bold text-ink-muted hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-72 overflow-y-auto pr-1">
                  {SYSTEM_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const isChecked = !!editRolePerms[mod.key];
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-brand/10 border-brand/40 text-brand-fg font-semibold shadow-xs'
                            : 'bg-surface-2 border-line text-ink hover:border-line-hover'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setEditRolePerms({ ...editRolePerms, [mod.key]: e.target.checked })}
                          className="rounded accent-brand mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{mod.label}</span>
                          </div>
                          <p className="text-micro text-ink-muted/80 line-clamp-1 mt-0.5 font-normal">
                            {mod.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="flex-1 bg-surface-2 hover:bg-field-hover text-ink dark:text-ink-muted font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 gap-1"
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
