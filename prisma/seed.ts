// prisma/seed.ts

import bcrypt from "bcryptjs";
import {
  PrismaClient,
  PermissionGroupCode,
  PermissionGroupMode,
  WorkflowFlagType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================
  // 1. Departments
  // ============================================================
  const departments = [
    { code: "OPD", name: "Outpatient Department (Clinic)" },
    { code: "CASUALTY", name: "Casualty / Emergency" },
    { code: "LAB", name: "Laboratory" },
    { code: "PHARMACY", name: "Pharmacy" },
    { code: "RADIOLOGY", name: "Radiology" },
    { code: "OT", name: "Operation Theatre" },
    { code: "IPD", name: "Inpatient Department" },
    { code: "RECEPTION", name: "Reception & Registration" },
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
  // 2. Permission Groups (A–E)
  // ============================================================
  const permissionGroups = [
    {
      code: PermissionGroupCode.PATIENT_ACCESS,
      description: "Access to patient demographics & medical history",
    },
    {
      code: PermissionGroupCode.DOCUMENTATION,
      description: "Clinical documentation, notes, vitals, etc.",
    },
    {
      code: PermissionGroupCode.ORDERS,
      description: "Lab orders, imaging orders, procedures",
    },
    {
      code: PermissionGroupCode.MEDICATION,
      description: "Prescription writing & medication management",
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
      description: "Doctor can prescribe emergency-only medications",
      flagType: WorkflowFlagType.BOOLEAN,
    },
    {
      code: "canDoTriage",
      description: "Can perform triage assessment in casualty",
      flagType: WorkflowFlagType.BOOLEAN,
    },
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
  // 4. Designations
  // ============================================================
  const designations = [
    {
      name: "Consultant",
      category: "clinical",
      description: "Senior doctor with full privileges",
    },
    {
      name: "Resident",
      category: "clinical",
      description: "Junior doctor requiring supervision",
    },
    {
      name: "DutyDoctor",
      category: "clinical",
      description: "Casualty/ER duty doctor",
    },
    {
      name: "Nurse",
      category: "nursing",
      description: "Nursing staff with execution rights",
    },
    {
      name: "Receptionist",
      category: "support",
      description: "Front-desk, registration, and bookings",
    },
  ];

  for (const d of designations) {
    await prisma.designation.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }

  console.log("✔ Designations seeded.");

  // ============================================================
  // 5. Designation → PermissionGroup Mappings
  // ============================================================

  // Fetch IDs
  const consultant = await prisma.designation.findUnique({
    where: { name: "Consultant" },
  });
  const resident = await prisma.designation.findUnique({
    where: { name: "Resident" },
  });
  const dutyDoctor = await prisma.designation.findUnique({
    where: { name: "DutyDoctor" },
  });
  const nurse = await prisma.designation.findUnique({
    where: { name: "Nurse" },
  });
  const receptionist = await prisma.designation.findUnique({
    where: { name: "Receptionist" },
  });

  const pg = async (code: PermissionGroupCode) =>
    prisma.permissionGroup.findUnique({ where: { code } }).then((r) => r!.id);

  // Consultant → Full Access
  const consultantMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.FULL },
  ];

  // Resident
  const residentMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.DRAFT_ONLY },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.DRAFT_ONLY },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE },
  ];

  // Duty Doctor
  const dutyMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.FULL },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.EMERGENCY_ONLY },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE },
  ];

  // Nurse
  const nurseMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.PARTIAL },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.OWN_NOTES },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.EXECUTE_ONLY },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE },
  ];

  // Receptionist
  const recMappings = [
    { group: PermissionGroupCode.PATIENT_ACCESS, mode: PermissionGroupMode.LIMITED },
    { group: PermissionGroupCode.DOCUMENTATION, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.ORDERS, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.MEDICATION, mode: PermissionGroupMode.NONE },
    { group: PermissionGroupCode.APPROVALS, mode: PermissionGroupMode.NONE },
  ];

  async function mapDesignation(designationId: string, mappings: any[]) {
    for (const m of mappings) {
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

  await mapDesignation(consultant!.id, consultantMappings);
  await mapDesignation(resident!.id, residentMappings);
  await mapDesignation(dutyDoctor!.id, dutyMappings);
  await mapDesignation(nurse!.id, nurseMappings);
  await mapDesignation(receptionist!.id, recMappings);

  console.log("✔ Permission mappings seeded.");

  // ============================================================
  // 6. SUPER ADMIN USER (New Auth Model)
  // ============================================================

  const adminEmail = "admin@hospitalmanage.com";
  const adminPassword = "Admin@123";

  const hash = await bcrypt.hash(adminPassword, 10);

  // IMPORTANT: No UserPassword table now
  await prisma.user.create({
    data: {
      id: "usr_super_admin_1",
      email: adminEmail,
      name: "Super Admin",
      phone: null,
      role: "SUPER_ADMIN",
      status: "active",
      passwordHash: hash,
      passwordChangedAt: new Date(),
    },
  });

  console.log("✔ SUPER ADMIN user created.");

  console.log("🌱 SEED COMPLETED SUCCESSFULLY.");
}

// ============================================================

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
