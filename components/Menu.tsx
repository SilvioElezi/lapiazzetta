"use client";
import { menu } from "../data/menu";
import ProductCard from "./ProductCard";

export default function Menu() {
  return (
    <section className="p-6">
      {menu.map((cat, i) => (
        <div key={i} className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            {cat.category}
          </h2>

          <div className="grid gap-4">
            {cat.items.map((item, idx) => (
              <ProductCard key={idx} item={item} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
