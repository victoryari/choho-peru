export const SEED_ROLES = [
  {
    id: "ROL-1",
    name: "Admin General",
    description: "Acceso total a la administración, usuarios, catálogo, reportes y configuración de sistema.",
    permissions: { picking: true, shippingGuides: true, kardex: true, catalog: true, quotes: true, maintenance: true, inventory: true, telemetry: true, expenses: true, travelBudgets: true, purchases: true, receivables: true, discounts: true, commissions: true, admin: true, dashboard: true, billing: true }
  },
  {
    id: "ROL-2",
    name: "Asesor Comercial",
    description: "Acceso a Catálogo de repuestos, creación de presupuestos de campo, mis cotizaciones, geolocalización y viáticos.",
    permissions: { catalog: true, quotes: true, maintenance: false, inventory: false, telemetry: true, expenses: true, travelBudgets: false, purchases: false, receivables: false, discounts: false, commissions: false, admin: false, dashboard: true, billing: false }
  },
  {
    id: "ROL-3",
    name: "Ventas",
    description: "Rol comercial de ventas de campo (Catálogo, Cotizaciones, Check-ins y Sustento de Viáticos).",
    permissions: { catalog: true, quotes: true, maintenance: false, inventory: false, telemetry: true, expenses: true, travelBudgets: false, purchases: false, receivables: false, discounts: false, commissions: false, admin: false, dashboard: true, billing: false }
  },
  {
    id: "ROL-4",
    name: "Jefe de Finanzas",
    description: "Acceso a Panel de analíticas, historial de cotizaciones, facturación SUNAT y aprobación de viáticos.",
    permissions: { catalog: true, quotes: true, maintenance: false, inventory: false, telemetry: false, expenses: true, travelBudgets: true, purchases: false, receivables: true, discounts: true, commissions: true, admin: false, dashboard: true, billing: true }
  },
  {
    id: "ROL-5",
    name: "Jefe de Almacén",
    description: "Acceso al control de inventario, stock físico y consulta del catálogo de productos.",
    permissions: { picking: true, shippingGuides: true, catalog: true, quotes: false, maintenance: true, inventory: true, telemetry: false, expenses: false, travelBudgets: false, purchases: true, receivables: false, discounts: false, commissions: false, admin: false, dashboard: false, billing: false }
  },
  {
    id: "ROL-6",
    name: "Contabilidad",
    description: "Acceso a Facturación Electrónica SUNAT, Cuentas por Cobrar, Liquidación de Comisiones y Viáticos.",
    permissions: { catalog: false, quotes: true, maintenance: false, inventory: false, telemetry: false, expenses: true, travelBudgets: true, purchases: false, receivables: true, discounts: false, commissions: true, admin: false, dashboard: false, billing: true }
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

export const SEED_PRODUCTS = [
  {
    sku: "CH-428H-118L",
    name: "Cadena CHOHO 428H x 118L Dorada Reforzada",
    categoriaId: null,
    basePrice: 48.50,
    stock: 50,
    description: "Cadena reforzada dorada para trabajo pesado con bujes sólidos",
    tags: ["cadena", "dorada", "428h", "reforzada", "428"],
    img: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300&auto=format&fit=crop&q=80",
    images: []
  },
  {
    sku: "CH-520H-106L",
    name: "Cadena CHOHO 520H x 106L Heavy Duty O-Ring",
    categoriaId: null,
    basePrice: 85.00,
    stock: 35,
    description: "Cadena de alta gama con retenes O-Ring de nitrilo resistente",
    tags: ["cadena", "520", "520h", "oring", "reforzada"],
    img: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300&auto=format&fit=crop&q=80",
    images: []
  },
  {
    sku: "CH-SPK-14T-GN",
    name: "Piñón de Ataque 14T Suzuki GN125",
    categoriaId: null,
    basePrice: 15.00,
    stock: 120,
    description: "Piñón templado con acero de aleación cromoly 20CrMo",
    tags: ["pinon", "sprockets", "suzuki", "gn125", "14t"],
    img: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&auto=format&fit=crop&q=80",
    images: []
  },
  {
    sku: "CH-COR-42T-FZ",
    name: "Corona Trasera 42T Yamaha FZ16 / FZ2.0",
    categoriaId: null,
    basePrice: 36.00,
    stock: 80,
    description: "Corona de acero tratado térmicamente C45",
    tags: ["corona", "yamaha", "fz16", "42t", "sprocket"],
    img: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&auto=format&fit=crop&q=80",
    images: []
  },
  {
    sku: "CH-KIT-PULSAR-200",
    name: "Kit de Arrastre Completo Bajaj Pulsar NS200",
    categoriaId: null,
    basePrice: 125.00,
    stock: 45,
    description: "Kit completo que incluye cadena dorada 520H, corona 39T y piñón 14T",
    tags: ["kit", "arrastre", "pulsar", "ns200", "520"],
    img: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300&auto=format&fit=crop&q=80",
    images: []
  },
  {
    sku: "CH-BUJ-D8TC",
    name: "Bujía Resistiva D8TC CHOHO Racing Gold",
    categoriaId: null,
    basePrice: 8.50,
    stock: 250,
    description: "Electrodo con alma de cobre de alto rendimiento",
    tags: ["bujia", "encendido", "d8tc", "racing"],
    img: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&auto=format&fit=crop&q=80",
    images: []
  }
];

/**
 * Taxonomia provisional de catalogo.
 *
 * IMPORTANTE: es una propuesta derivada de las unicas dos fuentes de verdad que
 * existian en el codigo (la lista de `Catalog.tsx` y las categorias del
 * dashboard). Debe ajustarse a la jerarquia oficial de CHOHO desde el panel de
 * administracion; toda la estructura es editable y el motor de descuentos la
 * consume tal cual este.
 *
 *   Familia (1) -> Sub-familia (2) -> Linea (3)
 */
export const SEED_CATEGORIAS = [
  { id: "CAT-TRANSMISION", nombre: "Transmision", parentId: null, nivel: 1 },
  { id: "CAT-FRENOS", nombre: "Frenos", parentId: null, nivel: 1 },
  { id: "CAT-MOTOR", nombre: "Motor", parentId: null, nivel: 1 },
  { id: "CAT-ACCESORIOS", nombre: "Accesorios", parentId: null, nivel: 1 },

  // Sub-familias de Transmision
  { id: "CAT-CADENAS", nombre: "Cadenas de Transmision", parentId: "CAT-TRANSMISION", nivel: 2 },
  { id: "CAT-PINONES", nombre: "Pinones & Catalina", parentId: "CAT-TRANSMISION", nivel: 2 },
  { id: "CAT-KITS", nombre: "Kits de Arrastre", parentId: "CAT-TRANSMISION", nivel: 2 },

  // Lineas
  { id: "CAT-LIN-ORING", nombre: "Cadena O-Ring", parentId: "CAT-CADENAS", nivel: 3 },
  { id: "CAT-LIN-XPR", nombre: "Cadena XPR", parentId: "CAT-CADENAS", nivel: 3 },
  { id: "CAT-LIN-PINON", nombre: "Pinon de Arrastre", parentId: "CAT-PINONES", nivel: 3 },
  { id: "CAT-LIN-CAT", nombre: "Catalina", parentId: "CAT-PINONES", nivel: 3 },
  { id: "CAT-LIN-KIT", nombre: "Kit Completo", parentId: "CAT-KITS", nivel: 3 },

  // Sub-familias de Frenos
  { id: "CAT-DISCOS", nombre: "Discos y Balatas", parentId: "CAT-FRENOS", nivel: 2 },
  // Sub-familias de Motor
  { id: "CAT-MOTOR-COMP", nombre: "Componentes de Motor", parentId: "CAT-MOTOR", nivel: 2 }
];

/**
 * Politicas oficiales de descuento, hasta ahora escritas dentro de
 * `DiscountManager.tsx`. Se mueven a la base de datos para que sean
 * administrables sin recompilar el frontend.
 */
export const SEED_DISCOUNT_POLICIES = [
  {
    id: "ESC-15000",
    scope: "ESCALA_MONTO",
    category: "General",
    discountType: "PORCENTAJE",
    minAmount: 15000,
    maxAmount: null,
    discountCash: 20,
    discountCredit: 18,
    notes: "Escala venta >= S/ 15,000 (Contado 20% / Credito 18%)",
    status: "Activo"
  },
  {
    id: "ESC-6000",
    scope: "ESCALA_MONTO",
    category: "General",
    discountType: "PORCENTAJE",
    minAmount: 6000,
    maxAmount: 15000,
    discountCash: 18,
    discountCredit: 15,
    notes: "Escala venta >= S/ 6,000 y < S/ 15,000 (Contado 18% / Credito 15%)",
    status: "Activo"
  },
  {
    id: "ESC-3000",
    scope: "ESCALA_MONTO",
    category: "General",
    discountType: "PORCENTAJE",
    minAmount: 3000,
    maxAmount: 6000,
    discountCash: 15,
    discountCredit: 10,
    notes: "Escala venta >= S/ 3,000 y < S/ 6,000 (Contado 15% / Credito 10%)",
    status: "Activo"
  },
  {
    id: "ESC-1500",
    scope: "ESCALA_MONTO",
    category: "General",
    discountType: "PORCENTAJE",
    minAmount: 1500,
    maxAmount: 3000,
    discountCash: 10,
    discountCredit: 5,
    notes: "Escala venta >= S/ 1,500 y < S/ 3,000 (Contado 10% / Credito 5%)",
    status: "Activo"
  },
  {
    id: "FRE-PROV-15000",
    scope: "SUBSIDIO_FLETE",
    category: "General",
    discountType: "PORCENTAJE",
    region: "PROVINCIA",
    minAmount: 15000,
    discountCash: 3.5,
    discountCredit: 3.5,
    notes: "Subsidio de flete en Provincia para ventas >= S/ 15,000",
    status: "Activo"
  },
  {
    id: "FRE-PROV-6000",
    scope: "SUBSIDIO_FLETE",
    category: "General",
    discountType: "PORCENTAJE",
    region: "PROVINCIA",
    minAmount: 6000,
    maxAmount: 15000,
    discountCash: 2.5,
    discountCredit: 2.5,
    notes: "Subsidio de flete en Provincia para ventas >= S/ 6,000",
    status: "Activo"
  },
  {
    id: "FRE-PROV-3000",
    scope: "SUBSIDIO_FLETE",
    category: "General",
    discountType: "PORCENTAJE",
    region: "PROVINCIA",
    minAmount: 3000,
    maxAmount: 6000,
    discountCash: 2.0,
    discountCredit: 2.0,
    notes: "Subsidio de flete en Provincia para ventas >= S/ 3,000",
    status: "Activo"
  }
,
  // --- Promoción Spartan AC-0008 ---
  {
    id: "POL-SPARTAN-AC0008",
    scope: "PRODUCTO",
    sku: "AC-0008",
    productName: "Alforja Spartan (AC-0008)",
    category: "Accesorios",
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 303.80,
    priceOfferCredit: 345.50,
    status: "Activo",
    notes: "Alforja Spartan (AC-0008) - Precio Contado S/ 303.80 / Crédito S/ 345.50"
  },
  // --- Promoción Vedamotors / Servitec ---
  {
    id: "POL-VEDAMOTORS",
    scope: "PRODUCTO",
    productName: "VEDAMOTORS",
    category: "Motor y Repuestos",
    discountType: "PORCENTAJE",
    discountCash: 20,
    discountCredit: 20,
    status: "Activo",
    notes: "Vedamotors 20% OFF Descuento Directo"
  },
  {
    id: "POL-SERVITEC",
    scope: "PRODUCTO",
    productName: "SERVITEC",
    category: "Motor y Repuestos",
    discountType: "PORCENTAJE",
    discountCash: 20,
    discountCredit: 20,
    status: "Activo",
    notes: "Servitec 20% OFF Descuento Directo"
  },
  // --- Pastillas de Freno (Lotes 10, 30, 50 u.) ---
  {
    id: "POL-PASTILLAS-LOTE-50",
    scope: "PRODUCTO",
    productName: "PASTILLA DE FRENO",
    category: "Frenos",
    minQty: 50,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 3.90,
    priceOfferCredit: 3.90,
    status: "Activo",
    notes: "Pastillas de Freno Lote 50+ u. -> S/ 3.90 c/u"
  },
  {
    id: "POL-PASTILLAS-LOTE-30",
    scope: "PRODUCTO",
    productName: "PASTILLA DE FRENO",
    category: "Frenos",
    minQty: 30,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 4.20,
    priceOfferCredit: 4.20,
    status: "Activo",
    notes: "Pastillas de Freno Lote 30-49 u. -> S/ 4.20 c/u"
  },
  {
    id: "POL-PASTILLAS-LOTE-10",
    scope: "PRODUCTO",
    productName: "PASTILLA DE FRENO",
    category: "Frenos",
    minQty: 10,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 4.50,
    priceOfferCredit: 4.50,
    status: "Activo",
    notes: "Pastillas de Freno Lote 10-29 u. -> S/ 4.50 c/u"
  },
  // --- Zapatas de Freno (Lotes 10, 30, 50 u.) ---
  {
    id: "POL-ZAPATAS-LOTE-50",
    scope: "PRODUCTO",
    productName: "ZAPATA DE FRENO",
    category: "Frenos",
    minQty: 50,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 8.60,
    priceOfferCredit: 8.60,
    status: "Activo",
    notes: "Zapatas de Freno Lote 50+ u. -> S/ 8.60 c/u"
  },
  {
    id: "POL-ZAPATAS-LOTE-30",
    scope: "PRODUCTO",
    productName: "ZAPATA DE FRENO",
    category: "Frenos",
    minQty: 30,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 9.20,
    priceOfferCredit: 9.20,
    status: "Activo",
    notes: "Zapatas de Freno Lote 30-49 u. -> S/ 9.20 c/u"
  },
  {
    id: "POL-ZAPATAS-LOTE-10",
    scope: "PRODUCTO",
    productName: "ZAPATA DE FRENO",
    category: "Frenos",
    minQty: 10,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 9.80,
    priceOfferCredit: 9.80,
    status: "Activo",
    notes: "Zapatas de Freno Lote 10-29 u. -> S/ 9.80 c/u"
  },
  // --- Piñones, Seguros y Palancas ---
  {
    id: "POL-PINON-LOTE-20",
    scope: "PRODUCTO",
    productName: "PIÑON",
    category: "Sistema de Arrastre",
    minQty: 20,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 4.80,
    priceOfferCredit: 4.80,
    status: "Activo",
    notes: "Piñón de Arrastre Lote 20+ u. -> S/ 4.80 c/u"
  },
  {
    id: "POL-SEGURO-PINON-100",
    scope: "PRODUCTO",
    productName: "SEGURO DE PIÑON",
    category: "Sistema de Arrastre",
    minQty: 100,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 0.45,
    priceOfferCredit: 0.45,
    status: "Activo",
    notes: "Seguro de Piñón Lote 100+ u. -> S/ 0.45 c/u"
  },
  {
    id: "POL-PALANCA-30",
    scope: "PRODUCTO",
    productName: "PALANCA",
    category: "Frenos y Accesorios",
    minQty: 30,
    discountType: "PRECIO_ESPECIAL",
    priceOfferCash: 6.50,
    priceOfferCredit: 6.50,
    status: "Activo",
    notes: "Palancas Lote 30+ u. -> S/ 6.50 c/u"
  },
  // --- Catalinas de Tracción ---
  {
    id: "POL-CATALINA-LOTE-100",
    scope: "PRODUCTO",
    productName: "CATALINA",
    category: "Sistema de Arrastre",
    minQty: 100,
    discountType: "PORCENTAJE",
    discountCash: 20,
    discountCredit: 18,
    status: "Activo",
    notes: "Catalinas Mayorista (100+ u.) -> 20% contado / 18% crédito"
  },
  {
    id: "POL-CATALINA-LOTE-30",
    scope: "PRODUCTO",
    productName: "CATALINA",
    category: "Sistema de Arrastre",
    minQty: 30,
    discountType: "PORCENTAJE",
    discountCash: 15,
    discountCredit: 10,
    status: "Activo",
    notes: "Catalinas Intermedio (30-99 u.) -> 15% contado / 10% crédito"
  },
  {
    id: "POL-CATALINA-LOTE-10",
    scope: "PRODUCTO",
    productName: "CATALINA",
    category: "Sistema de Arrastre",
    minQty: 10,
    discountType: "PORCENTAJE",
    discountCash: 5,
    discountCredit: 0,
    status: "Activo",
    notes: "Catalinas Base (10-29 u.) -> 5% contado extra"
  }
];
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
