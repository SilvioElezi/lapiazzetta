export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type SizeOption    = { name: string; extra: number };
export type IngredientOpt = { name: string; default_selected: boolean };
export type ExtraOption   = { name: string; extra: number };

export type ProductOptions = {
  sizes?:       { enabled: boolean; items: SizeOption[] };
  ingredients?: { enabled: boolean; items: IngredientOpt[] };
  extras?:      { enabled: boolean; items: ExtraOption[] };
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
  table_name?: string;
  order_type?: "delivery" | "kiosk";
};

export type DeliveryShift = {
  id: string;
  business_id: string;
  staff_id: string;
  staff_name: string;
  initial_float: number;
  total_collected: number;
  deliveries_count: number;
  status: "active" | "pending_handover" | "closed";
  started_at: string;
  closed_at?: string;
  confirmed_at?: string;
  confirmed_by?: string;
};

export type KioskTable = {
  id: string;
  business_id: string;
  name: string;
  token: string;
  active: boolean;
  created_at: string;
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
  image_url?: string;
  active: boolean;
  options?: ProductOptions;
  show_cassa?: boolean;
  show_online?: boolean;
  show_kiosk?: boolean;
};

export type MenuCategory = {
  id?: number;
  category: string;
  emoji: string;
  sort_order: number;
  items: MenuItem[];
  main_category?: string;
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
  from2?: string;
  to2?: string;
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
