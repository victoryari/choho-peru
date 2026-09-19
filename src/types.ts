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

export interface Product {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  stock: number;
  description: string;
  tags: string[];
  img?: string;
  images?: string[];
}

export interface QuoteItem {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface Quote {
  id: string;
  clientName: string;
  clientDoc: string; // RUC or DNI
  advisor: string;
  assignedTo?: string;
  total: number;
  subtotal: number;
  igv: number;
  date: string;
  status: 'Pendiente' | 'Aceptada' | 'Rechazada';
  items: QuoteItem[];
  
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

export interface DiscountRule {
  id: string;
  role?: string;
  sku?: string;
  productName?: string;
  category: string;
  maxDiscount?: number;
  minAmount?: number;
  maxAmount?: number;
  minQty?: number;
  discountCash?: number; // % o S/ contado
  discountCredit?: number; // % o S/ crédito
  priceOfferCash?: number; // Precio oferta contado
  priceOfferCredit?: number; // Precio oferta crédito
  discountType?: 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_ESPECIAL';
  notes?: string;
  status: 'Activo' | 'Inactivo';
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
  status: 'Pagado' | 'Pendiente';
  calculationType?: CalculationType;
  condition?: string;
  productCategory?: string;
  isDiferenciada?: boolean;
  notes?: string;
  createdAt?: string;
}

