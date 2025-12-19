import { db } from "./lib/drizzle";
import { users } from "./drizzle/schema";
import bcrypt from "bcryptjs";

async function seedAdminUsers() {
  console.log("🌱 Starting admin users seed...\n");

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    console.log("✅ Password hashed successfully");

    const adminUsers = [
      {
        id: `admin_shankar_${Date.now()}`, // Using CUID-like format
        email: "sagarhalyal3@gmail.com",
        name: "Shankar",
        phone: null,
        role: "SUPER_ADMIN",
        status: "active",
        passwordHash,
        passwordChangedAt: new Date(),
        isWhatsappActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `admin_pratham_${Date.now() + 1}`,
        email: "utttarkarpratham@gmail.com",
        name: "Pratham",
        phone: null,
        role: "SUPER_ADMIN",
        status: "active",
        passwordHash,
        passwordChangedAt: new Date(),
        isWhatsappActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    console.log("\n📝 Inserting admin users...");

    for (const user of adminUsers) {
      try {
        await db.insert(users).values(user);
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      } catch (error: any) {
        if (error.code === "23505") {
          console.log(`⚠️  User ${user.email} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n✨ Seed completed successfully!");
    console.log("\n📋 Login credentials:");
    console.log("   Email: sagarhalyal3@gmail.com | Password: Admin@123");
    console.log("   Email: utttarkarpratham@gmail.com | Password: Admin@123");
    console.log("\n🔐 Both users have SUPER_ADMIN role and WhatsApp active");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

seedAdminUsers();
