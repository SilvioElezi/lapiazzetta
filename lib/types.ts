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

export type StaffRole = "reception" | "delivery" | "admin";

export type StaffUser = {
  id: number;
  username: string;
  role: StaffRole;
  name: string;
  businesses?: { id: string; slug: string; name: string }[];
};

export type DayHours = {
  open: boolean;
  from: string;
  to: string;
};

export type WeekHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

export type Settings = {
  online_orders: boolean;
  hours: WeekHours;
  delivery_fee?: number;
};

export type Business = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radius_km: number;
  subscription_expires_at?: string;
};
