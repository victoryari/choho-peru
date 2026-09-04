import { create } from 'zustand';
import { User, Product, Quote, QuoteItem, Telemetry, TravelExpense, RolePermission } from '../types';

export const getUserPermissions = (user: User | null, rolesList: RolePermission[] = []) => {
  if (!user) {
    return { dashboard: false, catalog: true, inventory: false, quotes: false, billing: false, telemetry: false, expenses: false, purchases: false, receivables: false, sync: false, admin: false };
  }
  const roleLower = (user.role || "").trim().toLowerCase();
  
  if (rolesList && rolesList.length > 0) {
    const dynamicRole = rolesList.find(r => r.name.trim().toLowerCase() === roleLower);
    if (dynamicRole && dynamicRole.permissions) {
      const p = dynamicRole.permissions;
      return {
        catalog: p.catalog ?? true,
        quotes: p.quotes ?? true,
        billing: p.billing ?? false,
        inventory: p.inventory ?? false,
        telemetry: p.telemetry ?? false,
        expenses: p.expenses ?? false,
        purchases: p.purchases ?? p.inventory ?? false, // Defaults to inventory if missing
        receivables: p.receivables ?? p.billing ?? false, // Defaults to billing if missing
        sync: true,
        admin: p.admin ?? false,
        dashboard: p.dashboard ?? (p.admin || roleLower.includes("admin") || roleLower.includes("finanza"))
      };
    }
  }

  if (roleLower === "admin general" || roleLower.includes("admin") || roleLower.includes("gerencia")) {
    return { dashboard: true, catalog: true, inventory: true, quotes: true, billing: true, telemetry: true, expenses: true, purchases: true, receivables: true, sync: true, admin: true };
  }
  if (roleLower === "jefe de finanzas" || roleLower.includes("finanza") || roleLower.includes("contab")) {
    return { dashboard: true, catalog: true, inventory: false, quotes: true, billing: true, telemetry: false, expenses: true, purchases: false, receivables: true, sync: true, admin: false };
  }
  if (roleLower === "jefe de almacén" || roleLower.includes("almacen") || roleLower.includes("logística")) {
    return { dashboard: false, catalog: true, inventory: true, quotes: false, billing: false, telemetry: false, expenses: false, purchases: true, receivables: false, sync: true, admin: false };
  }
  if (roleLower === "ventas" || roleLower.includes("ventas") || roleLower.includes("comercial")) {
    return { dashboard: false, catalog: true, inventory: false, quotes: true, billing: false, telemetry: true, expenses: true, purchases: false, receivables: false, sync: true, admin: false };
  }
  return { dashboard: false, catalog: true, inventory: false, quotes: true, billing: false, telemetry: true, expenses: true, purchases: false, receivables: false, sync: true, admin: false };
};

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  
  products: Product[];
  setProducts: (products: Product[]) => void;
  quotes: Quote[];
  setQuotes: (quotes: Quote[]) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  telemetry: Telemetry[];
  setTelemetry: (telemetry: Telemetry[]) => void;
  expenses: TravelExpense[];
  setExpenses: (expenses: TravelExpense[]) => void;
  rolesList: RolePermission[];
  setRolesList: (roles: RolePermission[]) => void;
  
  purchases: PurchaseOrder[];
  setPurchases: (purchases: PurchaseOrder[]) => void;
  receivables: any[];
  setReceivables: (receivables: any[]) => void;

  budgetItems: QuoteItem[];
  setBudgetItems: (items: QuoteItem[]) => void;
  offlinePendingQuotes: Quote[];
  setOfflinePendingQuotes: (quotes: Quote[]) => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (status: boolean) => void;
  
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: (localStorage.getItem("choho_theme") as 'light' | 'dark') || 'light',
  setTheme: (theme) => {
    localStorage.setItem("choho_theme", theme);
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem("choho_theme", newTheme);
    return { theme: newTheme };
  }),
  
  currentUser: (() => {
    try {
      const savedUser = localStorage.getItem("choho_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  })(),
  setCurrentUser: (user) => set({ currentUser: user }),
  
  isLoggedIn: Boolean(localStorage.getItem("choho_user") && localStorage.getItem("choho_token")),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  
  products: [],
  setProducts: (products) => set({ products }),
  quotes: [],
  setQuotes: (quotes) => set({ quotes }),
  users: [],
  setUsers: (users) => set({ users }),
  telemetry: [],
  setTelemetry: (telemetry) => set({ telemetry }),
  expenses: [],
  setExpenses: (expenses) => set({ expenses }),
  rolesList: [],
  setRolesList: (rolesList) => set({ rolesList }),
  
  purchases: [],
  setPurchases: (purchases) => set({ purchases }),
  receivables: [],
  setReceivables: (receivables) => set({ receivables }),
  
  budgetItems: [],
  setBudgetItems: (budgetItems) => set({ budgetItems }),
  offlinePendingQuotes: [],
  setOfflinePendingQuotes: (offlinePendingQuotes) => set({ offlinePendingQuotes }),
  isOfflineMode: !navigator.onLine,
  setIsOfflineMode: (isOfflineMode) => set({ isOfflineMode }),
  
  selectedProduct: null,
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
}));
