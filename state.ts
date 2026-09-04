export const SEED_ROLES = [
  {
    id: "ROL-1",
    name: "Admin General",
    description: "Acceso total a la administración, usuarios, catálogo, reportes y configuración de sistema.",
    permissions: { catalog: true, quotes: true, billing: true, inventory: true, telemetry: true, expenses: true, purchases: true, receivables: true, admin: true, dashboard: true }
  },
  {
    id: "ROL-2",
    name: "Asesor Comercial",
    description: "Acceso a Catálogo de repuestos, creación de presupuestos de campo, mis cotizaciones, geolocalización y viáticos.",
    permissions: { catalog: true, quotes: true, billing: false, inventory: false, telemetry: true, expenses: true, purchases: false, receivables: false, admin: false, dashboard: false }
  },
  {
    id: "ROL-3",
    name: "Ventas",
    description: "Rol comercial de ventas de campo (Catálogo, Cotizaciones, Check-ins y Sustento de Viáticos).",
    permissions: { catalog: true, quotes: true, billing: false, inventory: false, telemetry: true, expenses: true, purchases: false, receivables: false, admin: false, dashboard: false }
  },
  {
    id: "ROL-4",
    name: "Jefe de Finanzas",
    description: "Acceso a Panel de analíticas, historial de cotizaciones, facturación SUNAT y aprobación de viáticos.",
    permissions: { catalog: true, quotes: true, billing: true, inventory: false, telemetry: false, expenses: true, purchases: false, receivables: true, admin: false, dashboard: true }
  },
  {
    id: "ROL-5",
    name: "Jefe de Almacén",
    description: "Acceso al control de inventario, stock físico y consulta del catálogo de productos.",
    permissions: { catalog: true, quotes: false, billing: false, inventory: true, telemetry: false, expenses: false, purchases: true, receivables: false, admin: false, dashboard: false }
  }
];

export const SEED_USERS = [
  {
    id: "USR-101",
    name: "Carlos Mendoza",
    email: "cmendoza@choho.pe",
    password: "123",
    role: "Ventas",
    status: "ACTIVE",
    branch: "Sede Lima Centro",
    department: "Ventas"
  },
  {
    id: "USR-102",
    name: "R. Mendoza",
    email: "rmendoza@choho.pe",
    password: "123",
    role: "Asesor Comercial",
    status: "ACTIVE",
    branch: "Sede Trujillo",
    department: "Ventas"
  },
  {
    id: "USR-103",
    name: "L. Castro",
    email: "lcastro@choho.pe",
    password: "123",
    role: "Admin General",
    status: "ACTIVE",
    branch: "Sede Lima Centro",
    department: "Gerencia"
  },
  {
    id: "USR-104",
    name: "Jefe de Finanzas",
    email: "finanzas@choho.pe",
    password: "123",
    role: "Jefe de Finanzas",
    status: "ACTIVE",
    branch: "Sede Lima Centro",
    department: "Facturación"
  }
];

export const SEED_PRODUCTS = [
  {
    sku: "CH-CAD-428H-132",
    name: "Cadena CHOHO 428H - 132 Eslabones Dorada Reforzada",
    category: "Cadenas",
    basePrice: 68.50,
    stock: 24,
    description: "Cadena de alta durabilidad con aleación de carbono tratada térmicamente.",
    tags: ["Best Seller", "Reforzada"],
    img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400",
    images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400"]
  },
  {
    sku: "CH-KIT-PULSAR200",
    name: "Kit de Arrastre Completo CHOHO Bajaj Pulsar 200 NS",
    category: "Kits de Arrastre",
    basePrice: 155.00,
    stock: 18,
    description: "Incluye Catalina 39T, Piñón 14T y Cadena 520OR O-Ring siliconada.",
    tags: ["Kit Completo"],
    img: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400",
    images: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400"]
  },
  {
    sku: "CH-PIN-14T-CB190R",
    name: "Piñón de Ataque CHOHO 14T Honda CB190R",
    category: "Piñones",
    basePrice: 28.00,
    stock: 45,
    description: "Piñón en acero 1045 con tratamiento de inducción para máxima vida útil.",
    tags: ["Honda"],
    img: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400",
    images: ["https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400"]
  }
];

export const SEED_EXPENSES = [
  {
    id: "EXP-2026-001",
    advisor: "Carlos Mendoza",
    date: "2026-08-27",
    category: "Hospedaje",
    docType: "Factura",
    rucIssuer: "20124567891",
    companyName: "Hotel Real Trujillo S.A.C.",
    series: "F001",
    number: "0004521",
    amount: 180.00,
    receiptImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
    sunatStatus: "ACEPTADO",
    approvalStatus: "Aprobado",
    notes: "Noche de hospedaje durante ruta comercial Trujillo - Huanchaco."
  },
  {
    id: "EXP-2026-002",
    advisor: "Carlos Mendoza",
    date: "2026-08-28",
    category: "Alimentación",
    docType: "Factura",
    rucIssuer: "20608542193",
    companyName: "Restaurante El Paisano S.A.C.",
    series: "F002",
    number: "0012894",
    amount: 65.50,
    receiptImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500",
    sunatStatus: "ACEPTADO",
    approvalStatus: "Pendiente",
    notes: "Almuerzo de trabajo con cliente taller Moto Repuestos Lima."
  },
  {
    id: "EXP-2026-003",
    advisor: "Roberto Mendoza",
    date: "2026-08-28",
    category: "Peaje",
    docType: "Ticket",
    rucIssuer: "20448123956",
    companyName: "Concesión Vial del Norte S.A.",
    series: "T001",
    number: "0088123",
    amount: 24.00,
    receiptImage: "https://images.unsplash.com/photo-1545179652-536308b9bf74?w=500",
    sunatStatus: "ACEPTADO",
    approvalStatus: "Aprobado",
    notes: "Peaje Ancón - Variante Pasamayo ida y vuelta."
  }
];

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

export const SEED_PURCHASES: any[] = [
  {
    id: "PO-2026-001",
    supplierRuc: "20100200300",
    supplierName: "Importaciones Generales S.A.C.",
    date: "2026-08-30",
    total: 2500.00,
    status: "Recibido",
    items: [
      { sku: "CH-CAD-428H-132", name: "Cadena CHOHO 428H - 132 Eslabones Dorada Reforzada", qty: 50, unitCost: 50.00 }
    ],
    receivedBy: "L. Castro",
    receiveDate: "2026-09-01",
    location: "Almacén Central (Pasillo A, Estante 3)"
  }
];

export const SEED_PAYMENTS: any[] = [];

export let inMemoryRoles = [...SEED_ROLES];
export let inMemoryUsers = [...SEED_USERS];
export let inMemoryProducts = [...SEED_PRODUCTS];
export let inMemoryExpenses = [...SEED_EXPENSES];
export let inMemoryTelemetry: any[] = [
  {
    id: "VIS-101",
    advisor: "Carlos Mendoza",
    client: "MotoRepuestos El Sol S.A.C.",
    time: "2026-08-28T09:30:00Z",
    status: "Visited",
    quote_id: "COT-2026-101",
    lat: -8.1116,
    lng: -79.0287,
    address: "Av. España 1420, Trujillo"
  }
];
export let inMemoryBranches = [...SEED_BRANCHES];
export let inMemoryDepartments = [...SEED_DEPARTMENTS];
export let inMemoryInvoices: any[] = [];
export let inMemoryPurchases = [...SEED_PURCHASES];
export let inMemoryPayments = [...SEED_PAYMENTS];
