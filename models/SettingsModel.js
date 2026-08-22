const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // Shop & Shipping
    baseShippingFee: { type: Number, default: 15000 },
    freeShippingThreshold: { type: Number, default: 2500000 },

    // Contact details
    supportPhone: { type: String, default: "+234-800-GOSOLAR" },
    supportEmail: { type: String, default: "support@gosolar.ng" },
    officeAddress: { type: String, default: "Plot 12, Solar Way, Lekki, Lagos, Nigeria" },
    whatsappNumber: { type: String, default: "234800GOSOLAR" },
    whatsappMessage: { type: String, default: "Hello GoSolar support team, I would like to enquire about a solar system." },

    // Bank Details
    bankName: { type: String, default: "Access Bank" },
    accountNumber: { type: String, default: "1234567890" },
    accountName: { type: String, default: "GoSolar Energy Limited" },

    // Appliance Wattages (Energy Calculator Constants)
    applianceWattages: {
      type: Map,
      of: Number,
      default: {
        bulb: 15,
        fan: 75,
        tv: 100,
        fridge: 350,
        freezer: 400,
        ac_1hp: 900,
        ac_1_5hp: 1350,
        ac_2hp: 1800,
        computer: 150,
        pump: 750,
        microwave: 1200,
        washing_machine: 500,
      },
    },
  },
  { timestamps: true }
);

const SettingsModel =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

module.exports = SettingsModel;
