import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

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
  placedAt: string;
};

const ORDERS_PATH = join(process.cwd(), "data", "orders.json");

function readOrders(): Map<string, Order> {
  try {
    if (!existsSync(ORDERS_PATH)) return new Map();
    const raw = JSON.parse(readFileSync(ORDERS_PATH, "utf-8"));
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

function writeOrders(map: Map<string, Order>) {
  const obj = Object.fromEntries(map.entries());
  writeFileSync(ORDERS_PATH, JSON.stringify(obj, null, 2), "utf-8");
}

// Proxy that auto-saves to disk on every mutation
export const orders = new Proxy(readOrders(), {
  get(target, prop) {
    const value = (target as any)[prop];
    if (typeof value === "function") {
      return (...args: any[]) => {
        const result = (value as Function).apply(target, args);
        // Save after any mutating operation
        if (["set", "delete", "clear"].includes(prop as string)) {
          writeOrders(target);
        }
        return result;
      };
    }
    return value;
  },
});
