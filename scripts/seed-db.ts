import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a store
  const store = await prisma.store.upsert({
    where: { id: "cmh4jy46p0000rgk2xx6ud5fx" },
    update: {},
    create: {
      id: "cmh4jy46p0000rgk2xx6ud5fx",
      name: "QT Office Main Store",
      address: "123 Business St, City, State 12345",
      phone: "(555) 123-4567",
    },
  });

  console.log("✅ Store created:", store.name);

  // Create demo users with different roles
  const users = [
    {
      id: "cmh4jy99u0002rgk2joxgi0vc",
      username: "admin",
      email: "admin@quicktrackinc.com",
      password: "admin1234",
      role: "ADMIN",
      storeId: store.id,
    },
    {
      id: "cmh4jy99u0003rgk2joxgi0vd",
      username: "manager",
      email: "manager@qtoffice.com",
      password: "manager123",
      role: "MANAGER",
      storeId: store.id,
    },
    {
      id: "cmh4jy99u0004rgk2joxgi0ve",
      username: "user",
      email: "user@qtoffice.com",
      password: "user123",
      role: "USER",
      storeId: store.id,
    },
  ];

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role,
        storeId: userData.storeId,
      },
    });

    console.log(`✅ User created: ${user.username} (${user.role})`);
  }

  // Create a demo bank
  const bank = await prisma.bank.upsert({
    where: { id: "cmh4jy99u0005rgk2joxgi0vf" },
    update: {},
    create: {
      id: "cmh4jy99u0005rgk2joxgi0vf",
      bankName: "First National Bank",
      accountNumber: "1234567890",
      routingNumber: "021000021",
      storeId: store.id,
      balance: "50000.00",
    },
  });

  console.log("✅ Bank created:", bank.bankName);

  // Create demo vendors
  const vendors = [
    {
      id: "cmh4jy99u0006rgk2joxgi0vg",
      vendorName: "Office Supplies Inc",
      vendorType: "Merchandise" as const,
      description: "Office supplies and equipment",
      contact: "contact@officesupplies.com",
      storeId: store.id,
    },
    {
      id: "cmh4jy99u0007rgk2joxgi0vh",
      vendorName: "Cleaning Services LLC",
      vendorType: "Expense" as const,
      description: "Professional cleaning services",
      contact: "info@cleaningservices.com",
      storeId: store.id,
    },
    {
      id: "cmh4jy99u0008rgk2joxgi0vi",
      vendorName: "John Smith",
      vendorType: "Employee" as const,
      description: "Software Developer",
      contact: "john.smith@company.com",
      storeId: store.id,
    },
  ];

  for (const vendorData of vendors) {
    const vendor = await prisma.vendor.upsert({
      where: { id: vendorData.id },
      update: {},
      create: vendorData,
    });

    console.log(`✅ Vendor created: ${vendor.vendorName} (${vendor.vendorType})`);
  }

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


