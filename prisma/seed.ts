// prisma/seed.ts

import { PrismaClient, PermissionGroupCode, PermissionGroupMode, WorkflowFlagType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================
  // 1. Base Departments
  // ============================================================
  const departments = [
    { code: "OPD", name: "Outpatient Department (Clinic)" },
    { code: "CASUALTY", name: "Casualty / Emergency" },
    { code: "LAB", name: "Laboratory" },
    { code: "PHARMACY", name: "Pharmacy" },
    { code: "RADIOLOGY", name: "Radiology" },
    { code: "OT", name: "Operation Theatre" },
    { code: "IPD", name: "Inpatient Department" },
    { code: "RECEPTION", name: "Reception & Registration" }
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, isActive: true },
      create: dept,
    });
  }

  console.log("✔ Departments seeded.");

  // ============================================================
  // 2. Permission Groups (Group A–E)
  // ============================================================
  const permissionGroups = [
    {
      code: PermissionGroupCode.PATIENT_ACCESS,
      description: "Access to patient demographics & medical history",
    },
    {
      code: PermissionGroupCode.DOCUMENTATION,
      description: "Clinical notes, OPD notes, vitals entry",
    },
    {
      code: PermissionGroupCode.ORDERS,
      description: "Lab orders, radiology orders, procedures",
    },
    {
      code: PermissionGroupCode.MEDICATION,
      description: "Prescription creation and medication logic",
    },
    {
      code: PermissionGroupCode.APPROVALS,
      description: "High-level approvals for sensitive actions",
    },
  ];

  for (const group of permissionGroups) {
    await prisma.permissionGroup.upsert({
      where: { code: group.code },
      update: {},
      create: group,
    });
  }

  console.log("✔ Permission Groups seeded.");

  // ============================================================
  // 3. Workflow Flags
  // ============================================================
  const workflowFlags = [
    {
      code: "canBreakGlass",
      description: "Emergency override to access any patient file",
      flagType: WorkflowFlagType.BOOLEAN,
    },
    {
      code: "canEmergencyPrescribe",
      description: "Doctor can prescribe emergency medicines",
      flagType: WorkflowFlagType.BOOLEAN,
    },
    {
      code: "canDoTriage",
      description: "Can perform triage in casualty",
      flagType: WorkflowFlagType.BOOLEAN,
    }
  ];

  for (const flag of workflowFlags) {
    await prisma.workflowFlag.upsert({
      where: { code: flag.code },
      update: {},
      create: flag,
    });
  }

  console.log("✔ Workflow Flags seeded.");

  // ============================================================
  // 4. Designations (roles)
  // ============================================================
  const designations = [
    { name: "Consultant", category: "clinical", description: "Senior doctor with full privileges" },
    { name: "Resident", category: "clinical", description: "Junior doctor requiring approvals" },
    { name: "DutyDoctor", category: "clinical", description: "Doctor assigned to Casualty / ER" },
    { name: "Nurse", category: "nursing", description: "Nursing staff with execution rights" },
    { name: "Receptionist", category: "support", description: "Handles registration and bookings" },
  ];

  for (const desig of designations) {
    await prisma.designation.upsert({
      where: { name: desig.name },
      update: {},
      create: desig,
    });
  }

  console.log("✔ Designations seeded.");

  // ============================================================
  // 5. Designation Permission Group Mappings
  // ============================================================

  // Helper: get IDs
  const consultant = await prisma.designation.findUnique({ where: { name: "Consultant" } });
  const resident = await prisma.designation.findUnique({ where: { name: "Resident" } });
  const dutyDoctor = await prisma.designation.findUnique({ where: { name: "DutyDoctor" } });
  const nurse = await prisma.designation.findUnique({ where: { name: "Nurse" } });
  const receptionist = await prisma.designation.findUnique({ where: { name: "Receptionist" } });

  const pg = async (code: PermissionGroupCode) =>
    prisma.permissionGroup.findUnique({ where: { code } }).then((g) => g!.id);

  // Consultant → All Full
  const consultantMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.FULL }
  ];

  // Resident → Partial documentation & no approvals
  const residentMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.DRAFT_ONLY },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.DRAFT_ONLY },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE }
  ];

  // Duty Doctor → Emergency permissions
  const dutyMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.EMERGENCY_ONLY },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE }
  ];

  // Nurse → Execute Only
  const nurseMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.PARTIAL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.OWN_NOTES },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.EXECUTE_ONLY },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE }
  ];

  // Receptionist → Limited access
  const recMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.LIMITED },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE }
  ];

  async function map(designationId: string, arr: any[]) {
    for (const m of arr) {
      const groupId = await pg(m.group);

      await prisma.designationPermissionGroup.upsert({
        where: {
          designationId_permissionGroupId: {
            designationId,
            permissionGroupId: groupId,
          },
        },
        update: { mode: m.mode },
        create: {
          designationId,
          permissionGroupId: groupId,
          mode: m.mode,
        },
      });
    }
  }

  await map(consultant!.id, consultantMappings);
  await map(resident!.id, residentMappings);
  await map(dutyDoctor!.id, dutyMappings);
  await map(nurse!.id, nurseMappings);
  await map(receptionist!.id, recMappings);

  console.log("✔ Designation permission mappings seeded.");

  // ============================================================
  // 6. Seed Admin User
  // ============================================================

  const adminEmail = "admin@hospitalmanage.com";
  const adminPassword = "Admin@123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "System Admin",
      role: "SUPER_ADMIN",
    },
  });

  await prisma.userPassword.upsert({
    where: { userId: adminUser.id },
    update: { passwordHash },
    create: {
      userId: adminUser.id,
      passwordHash,
    },
  });

  console.log("✔ Admin user seeded.");
  console.log("🌱 SEED COMPLETED SUCCESSFULLY.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
