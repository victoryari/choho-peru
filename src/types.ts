export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  branch: string;
  department: string;
  salesZone?: 'Zona - Lima' | 'Provincia - Con Metas' | 'Provincia - Desde 1era Venta';
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  permissions: {
    catalog: boolean;
    quotes: boolean;
    maintenance: boolean;
    inventory: boolean;
    telemetry: boolean;
    expenses: boolean;
    travelBudgets: boolean;
    purchases: boolean;
    receivables: boolean;
    discounts: boolean;
    commissions: boolean;
    admin: boolean;
    dashboard?: boolean;
    billing?: boolean;
    picking?: boolean;
    shippingGuides?: boolean;
    kardex?: boolean;
    sync?: boolean;
  };
}

export interface BranchItem {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface DepartmentItem {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

/** Nodo de la taxonomia de catalogo: Familia (1) > Sub-familia (2) > Linea (3). */
export interface Categoria {
  id: string;
  nombre: string;
  parentId?: string | null;
  nivel: 1 | 2 | 3;
  activo: boolean;
}

export interface Product {
  sku: string;
  name: string;
  /** Id del nodo asignado. Puede ser de familia, sub-familia o linea. */
  categoriaId?: string | null;
  familia?: { id: string; nombre: string } | null;
  subFamilia?: { id: string; nombre: string } | null;
  linea?: { id: string; nombre: string } | null;
  basePrice: number;
  stock: number;
  description: string;
  tags: string[];
  img?: string;
  images?: string[];
  /** Unidad de medida (PAR, PQT, SET, UND, ROL, CA, KIT, etc.) */
  um?: string;
  /** Código de familia ERP (ej. 001, 002) */
  codFamilia?: string;
  /** Moneda del precio (PEN, USD, MN) */
  moneda?: string;
  /** Código de precio de lista (ej. 01) */
  codPrecio?: string;
  /** Denominación del tarifario (ej. PRECIO 1) */
  tipoPrecio?: string;
}

export interface QuoteItem {
  sku: string;
  name: string;
  qty: number;
  price: number;
  basePrice?: number;
  discountUnit?: number;
  discountTotal?: number;
  discountPercent?: number;
  discountMessage?: string;
}

export interface Quote {
  id: string;
  clientName: string;
  clientDoc: string; // RUC or DNI
  clientAddress?: string;
  clientPhone?: string;
  advisor: string;
  assignedTo?: string;
  total: number;
  subtotal: number;
  igv: number;
  date: string;
  status: 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Facturada';
  items: QuoteItem[];
  validityDays?: number;
  
  // New fields for billing/credits
  paymentType?: 'Contado' | 'Crédito';
  creditStatus?: 'Pendiente' | 'Pagado Parcial' | 'Cancelado';
  creditPaidAmount?: number;
  creditDueAmount?: number;
}

export interface PaymentRecord {
  id: string;
  quoteId: string;
  amount: number;
  date: string;
  registeredBy: string;
}

export interface PurchaseItem {
  sku: string;
  name: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierRuc: string;
  supplierName: string;
  date: string;
  total: number;
  status: 'Pendiente' | 'Recibido';
  items: PurchaseItem[];
  receivedBy?: string;
  receiveDate?: string;
  location?: string;
}

export interface Telemetry {
  id: string;
  advisor: string;
  client: string;
  time: string;
  status: 'Visited' | 'Pending' | 'Offline';
  quote?: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface TravelExpense {
  id: string;
  advisor: string;
  date: string;
  category: 'Alimentación' | 'Hospedaje' | 'Transporte' | 'Peaje' | 'Mantenimiento' | 'Otros';
  docType: 'Factura' | 'Boleta' | 'Ticket';
  rucIssuer: string;
  companyName: string;
  series: string;
  number: string;
  amount: number;
  receiptImage?: string;
  sunatStatus: 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE';
  approvalStatus: 'Pendiente' | 'Aprobado' | 'Observado';
  notes?: string;
}

export interface MaintenanceOrder {
  id: string;
  asset: string;
  status: 'En Proceso' | 'Completado' | 'Pendiente';
  date: string;
  mechanic: string;
}

export interface TravelBudget {
  id: string;
  seller: string;
  assigned: number;
  spent: number;
  balance: number;
  status: 'Activo' | 'Crítico' | 'Agotado';
}

export interface PettyCashFund {
  id: string;
  name: string;
  assignedAmount: number;
  responsible: string;
  status: 'Activo' | 'Inactivo';
}

export interface PettyCashExpense {
  id: string;
  fundId?: string;
  fundName?: string;
  responsible: string;
  date: string;
  category: 'Alimentación' | 'Movilidad' | 'Combustible' | 'Peaje' | 'Útiles y Oficina' | 'Envíos y Mensajería' | 'Mantenimiento' | 'Otros';
  docType: 'Factura' | 'Boleta' | 'Ticket' | 'Recibo';
  rucIssuer: string;
  companyName: string;
  series: string;
  number: string;
  amount: number;
  igv?: number;
  subtotal?: number;
  currency?: 'PEN' | 'USD';
  receiptImage?: string;
  xmlFileName?: string;
  sunatStatus: 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE';
  sunatCondition?: 'HABIDO' | 'NO HABIDO';
  sunatState?: 'ACTIVO' | 'BAJA' | 'SUSPENDIDO';
  approvalStatus: 'Pendiente' | 'Aprobado' | 'Observado';
  notes?: string;
  createdAt?: string;
}

export type DiscountType = 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_ESPECIAL';
export type DiscountScope = 'PRODUCTO' | 'CATEGORIA' | 'ESCALA_MONTO' | 'SUBSIDIO_FLETE';

export interface DiscountRule {
  id: string;
  /** Ambito de la regla. Determina contra que coincide. */
  scope?: DiscountScope;
  role?: string;
  sku?: string;
  productName?: string;
  category: string;
  /** Familia / Sub-familia / Linea objetivo cuando scope = CATEGORIA. */
  categoriaId?: string | null;
  /** Region objetivo cuando scope = SUBSIDIO_FLETE. */
  region?: string | null;
  maxDiscount?: number;
  minAmount?: number;
  maxAmount?: number;
  minQty?: number;
  discountCash?: number; // % (PORCENTAJE) o S/ por unidad (MONTO_FIJO), para Contado
  discountCredit?: number; // idem, para Credito
  priceOfferCash?: number; // Precio final por unidad, Contado (PRECIO_ESPECIAL)
  priceOfferCredit?: number; // Precio final por unidad, Credito (PRECIO_ESPECIAL)
  discountType?: DiscountType;
  notes?: string;
  status: 'Activo' | 'Inactivo';
}

/** Precio autorizado que devuelve el servidor para una linea de cotizacion. */
export interface PrecioAutorizado {
  sku: string;
  nombre?: string;
  qty: number;
  precioBase: number;
  precioUnitarioBase: number;
  precioUnitario: number;
  descuentoUnitario: number;
  descuentoTotal: number;
  totalLinea: number;
  descuentoPorcentaje: number;
  reglaAplicada: DiscountRule | null;
  reglaSubsidio: DiscountRule | null;
  combinado: boolean;
  mensaje: string;
  familia?: string | null;
  subFamilia?: string | null;
  linea?: string | null;
}

export type SalesZone = 'Zona - Lima' | 'Provincia - Con Metas' | 'Provincia - Desde 1era Venta';
export type CalculationType = 'Por Condición' | 'Por Producto' | 'Periodo Vacacional';

export interface Commission {
  id: string;
  seller: string;
  zone: SalesZone;
  salesTotal: number;
  rate: number;
  commission: number;
  month: string;
  status: 'Pagado' | 'Pendiente' | 'Perdida';
  calculationType?: CalculationType;
  condition?: string;
  productCategory?: string;
  isDiferenciada?: boolean;
  notes?: string;
  createdAt?: string;
}

export interface BankAccount {
  id?: string;
  bankName: string; // ej. BCP, BBVA, Interbank
  currency: 'PEN' | 'USD';
  accountType?: string; // ej. Cta. Corriente, Cta. Ahorros
  accountNumber: string;
  cci: string;
  accountHolder?: string;
}

export interface CompanySettings {
  id?: string; // 'default'
  companyName: string; // Razón Social: CHOHO PERÚ S.A.C.
  tradeName?: string; // Nombre Comercial: CHOHO® PERÚ
  ruc: string; // RUC: 20608542193
  address: string; // Dirección fiscal
  phone: string; // Teléfono central o WhatsApp
  email: string; // Correo de ventas
  billingEmail?: string; // Correo facturación
  website?: string; // Sitio web
  slogan?: string; // Slogan de la marca
  logoUrl?: string; // URL o base64 del logotipo
  igvPercent: number; // Tasa IGV (ej. 18.00)
  exchangeRate: number; // Tipo de cambio USD a PEN (ej. 3.750)
  defaultCurrency: 'PEN' | 'USD'; // Moneda predeterminada
  defaultValidityDays: number; // Validez de cotizaciones (días)
  bankAccounts: BankAccount[]; // Cuentas de banco para pagos
}



export interface BranchStock {
  id?: number;
  branch_name: string;
  sku: string;
  stock: number;
  min_stock: number;
  location_rack?: string;
  product_name?: string;
  category?: string;
  base_price?: number;
  um?: string;
}

export interface KardexMovement {
  id: number;
  branch_name: string;
  sku: string;
  product_name?: string;
  movement_type: 'ENTRADA_COMPRA' | 'SALIDA_VENTA' | 'TRANSFERENCIA_SALIDA' | 'TRANSFERENCIA_ENTRADA' | 'AJUSTE_INVENTARIO';
  document_reference?: string;
  initial_stock: number;
  quantity: number;
  final_stock: number;
  unit_cost: number;
  operator: string;
  created_at: string;
}

export interface TransferItem {
  sku: string;
  name: string;
  quantity: number;
}

export interface BranchTransfer {
  id: string;
  origin_branch: string;
  destination_branch: string;
  guide_number?: string;
  status: 'SOLICITADO' | 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO';
  items: TransferItem[];
  requested_by: string;
  received_by?: string;
  created_at: string;
  received_at?: string;
}

export interface CompanyBankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  cci?: string;
  currency: 'PEN' | 'USD';
  account_type?: string;
  account_holder?: string;
  status: 'Activo' | 'Inactivo';
}

export interface ReconciledPayment {
  id: string;
  quoteId: string;
  amount: number;
  date: string;
  registeredBy: string;
  bank_id?: string;
  bank_name?: string;
  payment_method?: string;
  operation_number?: string;
  voucher_image?: string;
  reconciliation_status: 'PENDIENTE_VERIFICACION' | 'CONCILIADO' | 'OBSERVADO';
  verified_by?: string;
  verified_at?: string;
  clientName?: string;
  clientDoc?: string;
  totalInvoice?: number;
}
