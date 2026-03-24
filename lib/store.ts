import type { Order } from "./types";
export type { Order };

// Detect if we're on Vercel (read-only filesystem)
const IS_VERCEL = !!process.env.VERCEL;

// ── Local/VPS: JSON file ──────────────────────────────────
let fileStore: Map<string, Order> | null = null;

function getFileStore(): Map<string, Order> {
  if (fileStore) return fileStore;
  const { readFileSync, writeFileSync, existsSync } = require("fs");
  const { join } = require("path");
  const path = join(process.cwd(), "data", "orders.json");
  try {
    if (!existsSync(path)) { writeFileSync(path, "{}", "utf-8"); }
    fileStore = new Map(Object.entries(JSON.parse(readFileSync(path, "utf-8"))));
  } catch { fileStore = new Map(); }
  return fileStore;
}

function saveFile(map: Map<string, Order>) {
  const { writeFileSync } = require("fs");
  const { join } = require("path");
  const path = join(process.cwd(), "data", "orders.json");
  writeFileSync(path, JSON.stringify(Object.fromEntries(map), null, 2), "utf-8");
}

// ── Vercel KV ─────────────────────────────────────────────
async function kvGet(id: string): Promise<Order | null> {
  const { kv } = await import("@vercel/kv");
  return kv.hget("orders", id);
}
async function kvSet(id: string, order: Order) {
  const { kv } = await import("@vercel/kv");
  await kv.hset("orders", { [id]: order });
}
async function kvDelete(id: string) {
  const { kv } = await import("@vercel/kv");
  await kv.hdel("orders", id);
}
async function kvAll(): Promise<Order[]> {
  const { kv } = await import("@vercel/kv");
  const all = await kv.hgetall("orders");
  if (!all) return [];
  return Object.values(all) as Order[];
}

// ── Unified API ───────────────────────────────────────────
export const orders = {
  async get(id: string): Promise<Order | undefined> {
    if (IS_VERCEL) return (await kvGet(id)) ?? undefined;
    return getFileStore().get(id);
  },
  async set(id: string, order: Order) {
    if (IS_VERCEL) { await kvSet(id, order); return; }
    const m = getFileStore(); m.set(id, order); saveFile(m);
  },
  async delete(id: string) {
    if (IS_VERCEL) { await kvDelete(id); return; }
    const m = getFileStore(); m.delete(id); saveFile(m);
  },
  async values(): Promise<Order[]> {
    if (IS_VERCEL) return kvAll();
    return Array.from(getFileStore().values());
  },
};
