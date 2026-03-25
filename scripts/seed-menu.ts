// Run once to seed the menu into Supabase:
// npx tsx scripts/seed-menu.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log("Reading menu.json...");
  const raw = readFileSync(join(process.cwd(), "data", "menu.json"), "utf-8");
  const categories = JSON.parse(raw);

  console.log(`Seeding ${categories.length} categories...`);

  // Clear existing menu
  await supabase.from("menu").delete().neq("id", 0);

  // Insert each category
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const { error } = await supabase.from("menu").insert({
      category: cat.category,
      emoji: cat.emoji,
      sort_order: i,
      items: cat.items,
    });
    if (error) {
      console.error(`Error inserting ${cat.category}:`, error.message);
    } else {
      console.log(`  ✓ ${cat.emoji} ${cat.category} (${cat.items.length} items)`);
    }
  }

  console.log("\n✅ Menu seeded successfully!");
  console.log("You can now delete data/menu.json or keep it as a backup.");
}

seed();
