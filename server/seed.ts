import { db } from "./db";
import { users, leads, sellerPools } from "../shared/schema";

async function seed() {
  console.log("🌱 Starting seed...");

  // Create demo users
  const manager = await db.insert(users).values({
    email: "manager@leadflow.se",
    firstName: "Anna",
    lastName: "Managersson",
    role: "MANAGER",
    anlaggning: "Falkenberg",
  }).returning();
  console.log("✓ Created manager:", manager[0].email);

  const sellers = await db.insert(users).values([
    {
      email: "erik.falkenberg@leadflow.se",
      firstName: "Erik",
      lastName: "Eriksson",
      role: "SALJARE",
      anlaggning: "Falkenberg",
    },
    {
      email: "lisa.falkenberg@leadflow.se",
      firstName: "Lisa",
      lastName: "Karlsson",
      role: "SALJARE",
      anlaggning: "Falkenberg",
    },
    {
      email: "per.goteborg@leadflow.se",
      firstName: "Per",
      lastName: "Persson",
      role: "SALJARE",
      anlaggning: "Göteborg",
    },
    {
      email: "maria.goteborg@leadflow.se",
      firstName: "Maria",
      lastName: "Andersson",
      role: "SALJARE",
      anlaggning: "Göteborg",
    },
    {
      email: "johan.trollhattan@leadflow.se",
      firstName: "Johan",
      lastName: "Johansson",
      role: "SALJARE",
      anlaggning: "Trollhättan",
    },
  ]).returning();
  console.log(`✓ Created ${sellers.length} sellers`);

  // Create seller pools
  const pools = await db.insert(sellerPools).values([
    { userId: sellers[0].id, anlaggning: "Falkenberg", isEnabled: true, sortOrder: 1 },
    { userId: sellers[1].id, anlaggning: "Falkenberg", isEnabled: true, sortOrder: 2 },
    { userId: sellers[2].id, anlaggning: "Göteborg", isEnabled: true, sortOrder: 1 },
    { userId: sellers[3].id, anlaggning: "Göteborg", isEnabled: true, sortOrder: 2 },
    { userId: sellers[4].id, anlaggning: "Trollhättan", isEnabled: true, sortOrder: 1 },
  ]).returning();
  console.log(`✓ Created ${pools.length} seller pools`);

  // Create demo leads
  const demoLeads = [
    {
      source: "BYTBIL" as const,
      anlaggning: "Falkenberg" as const,
      contactName: "Anders Svensson",
      contactEmail: "anders.svensson@example.com",
      contactPhone: "070-123 45 67",
      vehicleTitle: "Adria Altea 542 DT - 2023",
      vehicleLink: "https://bytbil.com/listing/123",
      listingId: "bytbil-123",
      status: "NY_INTRESSEANMALAN" as const,
      message: "Intresserad av att få mer information om husvagnen.",
    },
    {
      source: "BLOCKET" as const,
      anlaggning: "Falkenberg" as const,
      contactName: "Karin Berg",
      contactEmail: "karin.berg@example.com",
      vehicleTitle: "Kabe Royal 560 XL - 2022",
      listingId: "blocket-456",
      status: "NY_INTRESSEANMALAN" as const,
      assignedToId: sellers[0].id,
    },
    {
      source: "BYTBIL" as const,
      anlaggning: "Göteborg" as const,
      contactName: "Lars Nilsson",
      contactEmail: "lars.nilsson@example.com",
      contactPhone: "073-987 65 43",
      vehicleTitle: "Hobby Prestige 720 - 2021",
      vehicleLink: "https://bytbil.com/listing/789",
      listingId: "bytbil-789",
      status: "KUND_KONTAKTAD" as const,
      assignedToId: sellers[2].id,
      firstContactAt: new Date(),
    },
    {
      source: "BLOCKET" as const,
      anlaggning: "Göteborg" as const,
      contactName: "Eva Lindström",
      contactPhone: "072-456 78 90",
      vehicleTitle: "Dethleffs Globebus T7 - 2023",
      listingId: "blocket-101",
      status: "VUNNEN" as const,
      assignedToId: sellers[3].id,
      firstContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      closedAt: new Date(),
    },
    {
      source: "MANUELL" as const,
      anlaggning: "Trollhättan" as const,
      contactName: "Gustav Holm",
      contactEmail: "gustav.holm@example.com",
      contactPhone: "070-111 22 33",
      vehicleTitle: "Bürstner Lyseo TD 734 - 2020",
      status: "FORLORAD" as const,
      assignedToId: sellers[4].id,
      firstContactAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      message: "För dyrt, hittade annat alternativ.",
    },
    {
      source: "BYTBIL" as const,
      anlaggning: "Falkenberg" as const,
      contactName: "Sofie Lundqvist",
      contactEmail: "sofie.lundqvist@example.com",
      vehicleTitle: "Fendt Bianco 465 SFB - 2024",
      vehicleLink: "https://bytbil.com/listing/202",
      listingId: "bytbil-202",
      status: "KUND_KONTAKTAD" as const,
      assignedToId: sellers[1].id,
      firstContactAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const createdLeads = await db.insert(leads).values(demoLeads).returning();
  console.log(`✓ Created ${createdLeads.length} demo leads`);

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`  - 1 manager (${manager[0].email})`);
  console.log(`  - ${sellers.length} sellers`);
  console.log(`  - ${pools.length} seller pools`);
  console.log(`  - ${createdLeads.length} leads`);
  console.log("\n🔐 Login credentials:");
  console.log("  Manager: manager@leadflow.se");
  console.log("  Seller (Falkenberg): erik.falkenberg@leadflow.se");
  console.log("  Seller (Göteborg): per.goteborg@leadflow.se");
  console.log("  Seller (Trollhättan): johan.trollhattan@leadflow.se");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
