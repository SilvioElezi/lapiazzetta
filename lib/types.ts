export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  client_name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  items: OrderItem[];
  total: number;
  status: "new" | "ready";
  placed_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  ingredients: string;
  price: number;
  popular: boolean;
  spicy: boolean;
  vegetarian: boolean;
  description?: string;
  active: boolean;
};

export type MenuCategory = {
  id?: number;
  category: string;
  emoji: string;
  sort_order: number;
  items: MenuItem[];
};
