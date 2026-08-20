/**
 * Category Seeder & Migration Script
 *
 * 1. Seeds the new nested categories & subcategories structure.
 * 2. Maps every existing product to the new appropriate subcategory.
 * 3. Deletes the legacy categories that are no longer part of the taxonomy.
 *
 * Usage:
 *   node seeds/categorySeeder.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("../utils/config");
const Category = require("../models/CategoryModel");
const Product = require("../models/ProductModel");

const connectDB = async () => {
  let dbName = "";
  if (process.env.NODE_ENV === "development") {
    dbName = "gosolar_dev";
    console.log("connecting to go_solar development DB...");
  } else {
    dbName = "gosolar_prod";
    console.log("connecting to go_solar production DB...");
  }
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
      {
        name: "Industrial Inverters (5kVA+)",
        slug: "industrial-inverters",
        sortOrder: 2,
      },
      { name: "Hybrid Inverters", slug: "hybrid-inverters", sortOrder: 3 },
      { name: "Off-Grid Inverters", slug: "off-grid-inverters", sortOrder: 4 },
      {
        name: "On-Grid / Grid-Tie Inverters",
        slug: "on-grid-inverters",
        sortOrder: 5,
      },
    ],
  },
  {
    name: "Batteries",
    slug: "batteries",
    sortOrder: 2,
    description:
      "Deep cycle batteries for solar storage — lithium, gel, and lead-acid options.",
    subcategories: [
      {
        name: "Lithium Batteries (LiFePO4)",
        slug: "lithium-batteries",
        sortOrder: 1,
      },
      { name: "Gel Batteries", slug: "gel-batteries", sortOrder: 2 },
      {
        name: "Lead Acid Batteries",
        slug: "lead-acid-batteries",
        sortOrder: 3,
      },
      {
        name: "12V / 24V Batteries",
        slug: "low-voltage-batteries",
        sortOrder: 4,
      },
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
      {
        name: "Monocrystalline Panels",
        slug: "monocrystalline-panels",
        sortOrder: 1,
      },
      {
        name: "Polycrystalline Panels",
        slug: "polycrystalline-panels",
        sortOrder: 2,
      },
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
      {
        name: "Small (Under 500Wh)",
        slug: "solar-generators-small",
        sortOrder: 1,
      },
      {
        name: "Medium (500Wh – 2kWh)",
        slug: "solar-generators-medium",
        sortOrder: 2,
      },
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
      {
        name: "Solar Street Lights",
        slug: "solar-street-lights",
        sortOrder: 2,
      },
      {
        name: "Solar Garden Lights",
        slug: "solar-garden-lights",
        sortOrder: 3,
      },
      {
        name: "Solar Security Lights",
        slug: "solar-security-lights",
        sortOrder: 4,
      },
      {
        name: "Solar Indoor Lights",
        slug: "solar-indoor-lights",
        sortOrder: 5,
      },
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
      {
        name: "Solar Air Conditioners",
        slug: "solar-air-conditioners",
        sortOrder: 3,
      },
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
      {
        name: "Solar Cables & Connectors",
        slug: "solar-cables-connectors",
        sortOrder: 2,
      },
      {
        name: "Mounting & Structure",
        slug: "mounting-structure",
        sortOrder: 3,
      },
      {
        name: "Fuses & Circuit Breakers",
        slug: "fuses-circuit-breakers",
        sortOrder: 4,
      },
      {
        name: "Inverter Accessories",
        slug: "inverter-accessories",
        sortOrder: 5,
      },
    ],
  },
];

const seedAndMigrate = async () => {
  try {
    await connectDB();

    console.log("\n1. Caching existing product category mappings...");
    const products = await Product.find({ isDeleted: { $in: [true, false] } });
    const productMappings = [];

    for (const product of products) {
      const oldCat = await Category.findById(product.category);
      productMappings.push({
        productId: product._id,
        productName: product.name,
        oldCatSlug: oldCat ? oldCat.slug : null,
      });
    }
    console.log(`   Cached ${productMappings.length} products.`);

    console.log("\n2. Clearing all existing categories to ensure order insertion...");
    const clearResult = await Category.deleteMany({});
    console.log(`   Deleted ${clearResult.deletedCount} existing categories.`);

    console.log("\n3. Seeding categories in defined array order...");
    const newSlugs = [];

    for (const cat of categories) {
      const { subcategories, ...parentData } = cat;
      newSlugs.push(parentData.slug);

      const parent = await Category.create({ ...parentData, parent: null });
      console.log(`   ✅ Created Parent Category: ${parent.name}`);

      for (const sub of subcategories) {
        newSlugs.push(sub.slug);
        const subDoc = await Category.create({ ...sub, parent: parent._id });
        console.log(`      ✅ Created Subcategory: ${subDoc.name}`);
      }
    }

    console.log("\n4. Migrating products to newly seeded category ObjectIds...");
    let migratedCount = 0;

    for (const mapping of productMappings) {
      const product = await Product.findById(mapping.productId);
      if (!product) continue;

      let newSubSlug = "";
      const nameLower = mapping.productName.toLowerCase();
      const oldCatSlug = mapping.oldCatSlug;

      // Determine mapping based on product names and old categories
      if (
        oldCatSlug === "solar-batteries" ||
        oldCatSlug === "batteries" ||
        nameLower.includes("battery") ||
        nameLower.includes("tubular") ||
        nameLower.includes("gel") ||
        nameLower.includes("smf")
      ) {
        if (nameLower.includes("lithium")) {
          newSubSlug = "lithium-batteries";
        } else if (nameLower.includes("gel")) {
          newSubSlug = "gel-batteries";
        } else {
          newSubSlug = "lead-acid-batteries";
        }
      } else if (
        oldCatSlug === "solar-inverters" ||
        oldCatSlug === "inverters" ||
        oldCatSlug === "solar-power-tools" ||
        nameLower.includes("inverter")
      ) {
        if (nameLower.includes("hybrid")) {
          newSubSlug = "hybrid-inverters";
        } else if (nameLower.includes("off-grid")) {
          newSubSlug = "off-grid-inverters";
        } else {
          newSubSlug = "home-inverters";
        }
      } else if (
        oldCatSlug === "solar-lighting" ||
        oldCatSlug === "solar-lights" ||
        nameLower.includes("light") ||
        nameLower.includes("street") ||
        nameLower.includes("flood")
      ) {
        if (nameLower.includes("street")) {
          newSubSlug = "solar-street-lights";
        } else if (nameLower.includes("flood")) {
          newSubSlug = "solar-flood-lights";
        } else {
          newSubSlug = "solar-flood-lights";
        }
      } else if (oldCatSlug === "solar-kits" || nameLower.includes("kit")) {
        newSubSlug = "solar-generators-small";
      } else if (
        oldCatSlug === "green-energy-solutions" ||
        oldCatSlug === "solar-appliances" ||
        nameLower.includes("fan") ||
        nameLower.includes("generator") ||
        nameLower.includes("package")
      ) {
        if (nameLower.includes("fan")) {
          newSubSlug = "solar-fans";
        } else if (nameLower.includes("generator")) {
          if (nameLower.includes("1000w")) {
            newSubSlug = "solar-generators-medium";
          } else {
            newSubSlug = "solar-generators-small";
          }
        } else if (nameLower.includes("package")) {
          newSubSlug = "industrial-inverters";
        } else {
          newSubSlug = "solar-fans";
        }
      } else if (
        oldCatSlug === "solar-accessories" ||
        oldCatSlug === "accessories"
      ) {
        newSubSlug = "charge-controllers";
      } else {
        newSubSlug = "charge-controllers";
      }

      if (newSubSlug) {
        const targetSub = await Category.findOne({ slug: newSubSlug });
        if (targetSub) {
          product.category = targetSub._id;
          await product.save();
          console.log(
            `   ✅ Migrated product "${product.name}" -> Subcategory "${targetSub.name}" (${newSubSlug})`,
          );
          migratedCount++;
        } else {
          console.error(
            `   ❌ Target subcategory "${newSubSlug}" not found for product "${product.name}".`,
          );
        }
      }
    }

    console.log(`\n🎉 Migrated ${migratedCount} products successfully.`);
    console.log("\n✅ Seeding and migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder/Migration error:", error.message);
    process.exit(1);
  }
};

seedAndMigrate();
