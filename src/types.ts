export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  branch: string;
  department: string;
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  permissions: {
    catalog: boolean;
    quotes: boolean;
    billing: boolean;
    inventory: boolean;
    telemetry: boolean;
    admin: boolean;
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
  total: number;
  subtotal: number;
  igv: number;
  date: string;
  status: 'Pendiente' | 'Aceptada' | 'Rechazada';
  items: QuoteItem[];
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
}
