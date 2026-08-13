/**
 * Category Seeder
 * Seeds the 7 top-level product categories and their subcategories.
 *
 * Usage:
 *   node seeds/categorySeeder.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("../utils/config");
const Category = require("../models/CategoryModel");

const connectDB = async () => {
  const dbName = "gosolar_dev";
  await mongoose.connect(config.MONGO_URI, { dbName });
  console.log(`✅ Connected to MongoDB (${dbName})`);
};

// ─── Category Definitions ───────────────────────────────────────────────────

const categories = [
  {
    name: "Inverters",
    slug: "inverters",
    sortOrder: 1,
    description:
      "Power inverters for home and industrial solar systems — hybrid, off-grid, and grid-tied.",
    subcategories: [
      { name: "Home Inverters (1–5kVA)", slug: "home-inverters", sortOrder: 1 },
      { name: "Industrial Inverters (5kVA+)", slug: "industrial-inverters", sortOrder: 2 },
      { name: "Hybrid Inverters", slug: "hybrid-inverters", sortOrder: 3 },
      { name: "Off-Grid Inverters", slug: "off-grid-inverters", sortOrder: 4 },
      { name: "On-Grid / Grid-Tie Inverters", slug: "on-grid-inverters", sortOrder: 5 },
    ],
  },
  {
    name: "Batteries",
    slug: "batteries",
    sortOrder: 2,
    description:
      "Deep cycle batteries for solar storage — lithium, gel, and lead-acid options.",
    subcategories: [
      { name: "Lithium Batteries (LiFePO4)", slug: "lithium-batteries", sortOrder: 1 },
      { name: "Gel Batteries", slug: "gel-batteries", sortOrder: 2 },
      { name: "Lead Acid Batteries", slug: "lead-acid-batteries", sortOrder: 3 },
      { name: "12V / 24V Batteries", slug: "low-voltage-batteries", sortOrder: 4 },
      { name: "48V Batteries", slug: "high-voltage-batteries", sortOrder: 5 },
    ],
  },
  {
    name: "Solar Panels",
    slug: "solar-panels",
    sortOrder: 3,
    description:
      "High-efficiency photovoltaic panels for residential and commercial solar installations.",
    subcategories: [
      { name: "Monocrystalline Panels", slug: "monocrystalline-panels", sortOrder: 1 },
      { name: "Polycrystalline Panels", slug: "polycrystalline-panels", sortOrder: 2 },
      { name: "Bifacial Panels", slug: "bifacial-panels", sortOrder: 3 },
    ],
  },
  {
    name: "Solar Generators",
    slug: "solar-generators",
    sortOrder: 4,
    description:
      "All-in-one portable solar power stations with built-in battery, inverter, and solar input.",
    subcategories: [
      { name: "Small (Under 500Wh)", slug: "solar-generators-small", sortOrder: 1 },
      { name: "Medium (500Wh – 2kWh)", slug: "solar-generators-medium", sortOrder: 2 },
      { name: "Large (2kWh+)", slug: "solar-generators-large", sortOrder: 3 },
    ],
  },
  {
    name: "Solar Lights",
    slug: "solar-lights",
    sortOrder: 5,
    description:
      "Solar-powered lighting solutions for streets, gardens, security, and commercial areas.",
    subcategories: [
      { name: "Solar Flood Lights", slug: "solar-flood-lights", sortOrder: 1 },
      { name: "Solar Street Lights", slug: "solar-street-lights", sortOrder: 2 },
      { name: "Solar Garden Lights", slug: "solar-garden-lights", sortOrder: 3 },
      { name: "Solar Security Lights", slug: "solar-security-lights", sortOrder: 4 },
      { name: "Solar Indoor Lights", slug: "solar-indoor-lights", sortOrder: 5 },
    ],
  },
  {
    name: "Solar Appliances",
    slug: "solar-appliances",
    sortOrder: 6,
    description:
      "DC and solar-powered home appliances optimized for off-grid energy efficiency.",
    subcategories: [
      { name: "Solar Fans", slug: "solar-fans", sortOrder: 1 },
      { name: "Solar Fridges & Freezers", slug: "solar-fridges", sortOrder: 2 },
      { name: "Solar Air Conditioners", slug: "solar-air-conditioners", sortOrder: 3 },
      { name: "Solar TVs", slug: "solar-tvs", sortOrder: 4 },
      { name: "Solar Water Pumps", slug: "solar-water-pumps", sortOrder: 5 },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    sortOrder: 7,
    description:
      "Essential components and hardware for solar system installation and maintenance.",
    subcategories: [
      { name: "Charge Controllers", slug: "charge-controllers", sortOrder: 1 },
      { name: "Solar Cables & Connectors", slug: "solar-cables-connectors", sortOrder: 2 },
      { name: "Mounting & Structure", slug: "mounting-structure", sortOrder: 3 },
      { name: "Fuses & Circuit Breakers", slug: "fuses-circuit-breakers", sortOrder: 4 },
      { name: "Inverter Accessories", slug: "inverter-accessories", sortOrder: 5 },
    ],
  },
];

// ─── Seeder Function ─────────────────────────────────────────────────────────

const seedCategories = async () => {
  try {
    await connectDB();

    let created = 0;
    let skipped = 0;

    for (const cat of categories) {
      const { subcategories, ...parentData } = cat;

      // Upsert top-level category
      let parent = await Category.findOne({ slug: parentData.slug });
      if (!parent) {
        parent = await Category.create({ ...parentData, parent: null });
        console.log(`  ✅ Created: ${parent.name}`);
        created++;
      } else {
        console.log(`  ⏭️  Skipped (exists): ${parent.name}`);
        skipped++;
      }

      // Upsert subcategories
      for (const sub of subcategories) {
        const existingSub = await Category.findOne({ slug: sub.slug });
        if (!existingSub) {
          await Category.create({ ...sub, parent: parent._id });
          console.log(`      ✅ Subcategory: ${sub.name}`);
          created++;
        } else {
          console.log(`      ⏭️  Skipped (exists): ${sub.name}`);
          skipped++;
        }
      }
    }

    console.log(`\n🎉 Seeding complete — Created: ${created}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder error:", error.message);
    process.exit(1);
  }
};

seedCategories();
