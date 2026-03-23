export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  clientName: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  items: OrderItem[];
  total: number;
  status: "new" | "ready";
  placedAt: string; // ISO string
};

// Global in-memory store — survives hot reloads in dev, resets on server restart
// No DB needed: orders are ephemeral by design
const globalStore = global as typeof global & { orders?: Map<string, Order> };
if (!globalStore.orders) globalStore.orders = new Map();

export const orders = globalStore.orders;
