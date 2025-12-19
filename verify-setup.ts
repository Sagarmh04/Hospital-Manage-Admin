import { db } from "./lib/drizzle";
import { users } from "./drizzle/schema";

async function verifySetup() {
  console.log("🔍 Verifying database setup...\n");

  try {
    const allUsers = await db.select().from(users);
    
    console.log(`✅ Found ${allUsers.length} users in database:\n`);
    
    allUsers.forEach(user => {
      console.log(`  📧 ${user.email}`);
      console.log(`     Name: ${user.name}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     WhatsApp: ${user.isWhatsappActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`     Status: ${user.status}\n`);
    });

    console.log("✨ Database setup verified successfully!");
    console.log("\n🚀 You can now start the dev server with: bun run dev");
    console.log("\n📝 Test Login:");
    console.log("   1. Go to http://localhost:3000/login");
    console.log("   2. Enable Dev Mode toggle");
    console.log("   3. Use: sagarhalyal3@gmail.com | Password: Admin@123");
    console.log("   4. The OTP will be displayed: 123456");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifySetup();
