export const SEED_ROLES = [
  {
    id: "ROL-1",
    name: "Admin General",
    description: "Acceso total a la administración, usuarios, catálogo, reportes y configuración de sistema.",
    permissions: { catalog: true, quotes: true, maintenance: true, inventory: true, telemetry: true, expenses: true, travelBudgets: true, purchases: true, receivables: true, discounts: true, commissions: true, admin: true, dashboard: true }
  },
  {
    id: "ROL-2",
    name: "Asesor Comercial",
    description: "Acceso a Catálogo de repuestos, creación de presupuestos de campo, mis cotizaciones, geolocalización y viáticos.",
    permissions: { catalog: true, quotes: true, maintenance: false, inventory: false, telemetry: true, expenses: true, travelBudgets: false, purchases: false, receivables: false, discounts: false, commissions: false, admin: false, dashboard: false }
  },
  {
    id: "ROL-3",
    name: "Ventas",
    description: "Rol comercial de ventas de campo (Catálogo, Cotizaciones, Check-ins y Sustento de Viáticos).",
    permissions: { catalog: true, quotes: true, maintenance: false, inventory: false, telemetry: true, expenses: true, travelBudgets: false, purchases: false, receivables: false, discounts: false, commissions: false, admin: false, dashboard: false }
  },
  {
    id: "ROL-4",
    name: "Jefe de Finanzas",
    description: "Acceso a Panel de analíticas, historial de cotizaciones, facturación SUNAT y aprobación de viáticos.",
    permissions: { catalog: true, quotes: true, maintenance: false, inventory: false, telemetry: false, expenses: true, travelBudgets: true, purchases: false, receivables: true, discounts: true, commissions: true, admin: false, dashboard: true }
  },
  {
    id: "ROL-5",
    name: "Jefe de Almacén",
    description: "Acceso al control de inventario, stock físico y consulta del catálogo de productos.",
    permissions: { catalog: true, quotes: false, maintenance: true, inventory: true, telemetry: false, expenses: false, travelBudgets: false, purchases: true, receivables: false, discounts: false, commissions: false, admin: false, dashboard: false }
  }
];

// Master Operational Administrator User
export const SEED_USERS = [
  {
    id: "USR-ADMIN",
    name: "Administrador CHOHO",
    email: "admin@choho.pe",
    password: "123",
    role: "Admin General",
    status: "ACTIVE",
    branch: "Sede Lima Centro",
    department: "Gerencia",
    salesZone: "Zona - Lima"
  }
];

export const SEED_PRODUCTS: any[] = [];
export const SEED_COMMISSIONS: any[] = [];
export const SEED_EXPENSES: any[] = [];
export const SEED_BRANCHES = [
  { id: "BR-1", name: "Sede Trujillo", status: "ACTIVE" },
  { id: "BR-2", name: "Sede Lima", status: "ACTIVE" },
  { id: "BR-3", name: "Sede Lima Centro", status: "ACTIVE" },
  { id: "BR-4", name: "Sede Arequipa", status: "ACTIVE" }
];

export const SEED_DEPARTMENTS = [
  { id: "DEP-1", name: "Ventas", status: "ACTIVE" },
  { id: "DEP-2", name: "Facturación", status: "ACTIVE" },
  { id: "DEP-3", name: "Almacén", status: "ACTIVE" },
  { id: "DEP-4", name: "Gerencia", status: "ACTIVE" },
  { id: "DEP-5", name: "Marketing", status: "ACTIVE" }
];

export const SEED_PURCHASES: any[] = [];
export const SEED_PAYMENTS: any[] = [];
export const SEED_DISCOUNTS: any[] = [];

export let inMemoryRoles = [...SEED_ROLES];
export let inMemoryUsers = [...SEED_USERS];
export let inMemoryProducts: any[] = [];
export let inMemoryExpenses: any[] = [];
export let inMemoryTelemetry: any[] = [];
export let inMemoryBranches = [...SEED_BRANCHES];
export let inMemoryDepartments = [...SEED_DEPARTMENTS];
export let inMemoryInvoices: any[] = [];
export let inMemoryPurchases: any[] = [];
export let inMemoryPayments: any[] = [];
export let inMemoryCommissions: any[] = [];
export let inMemoryDiscounts: any[] = [];
