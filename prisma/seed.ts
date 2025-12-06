// prisma/seed.ts
import { PrismaClient, PermissionGroupCode, WorkflowFlagType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Departments
  const departments = [
    { code: 'OPD', name: 'OPD / Clinic' },
    { code: 'CASUALTY', name: 'Casualty / Emergency' },
    { code: 'LAB', name: 'Laboratory' },
    { code: 'PHARMACY', name: 'Pharmacy' },
    { code: 'IPD', name: 'Inpatient / Wards' },
    { code: 'ICU', name: 'ICU' },
    { code: 'OT', name: 'Operation Theatre' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }

  // 2. Permission Groups
  const permissionGroups = [
    { code: PermissionGroupCode.PATIENT_ACCESS, description: 'View patient data' },
    { code: PermissionGroupCode.DOCUMENTATION, description: 'Clinical documentation' },
    { code: PermissionGroupCode.ORDERS, description: 'Lab/radiology/nursing orders' },
    { code: PermissionGroupCode.MEDICATION, description: 'Prescriptions and meds' },
    { code: PermissionGroupCode.APPROVALS, description: 'Approvals & overrides' },
  ];

  for (const pg of permissionGroups) {
    await prisma.permissionGroup.upsert({
      where: { code: pg.code },
      update: {},
      create: pg,
    });
  }

  // 3. Workflow Flags (partial list; extend later)
  const workflowFlags = [
    { code: 'requires_note_approval', description: 'Notes need approval', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_finalize_note', description: 'Can finalize/lock notes', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'is_opd_bookable', description: 'Can be booked via OPD', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'is_internal_referral_only', description: 'Only internal referrals allowed', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'is_emergency_authorized', description: 'Can act in emergency', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_do_triage', description: 'Can perform casualty triage', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_handle_mlc', description: 'Can init medico-legal case', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_register_patients', description: 'Can create UHID', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_update_demographics', description: 'Can edit patient demographics', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_merge_records', description: 'Can merge duplicate patients', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_soft_delete', description: 'Can soft-delete patient', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_print_records', description: 'Can print/download records', flagType: WorkflowFlagType.BOOLEAN },
    { code: 'can_break_glass', description: 'Emergency break-glass access', flagType: WorkflowFlagType.BOOLEAN },
  ];

  for (const flag of workflowFlags) {
    await prisma.workflowFlag.upsert({
      where: { code: flag.code },
      update: {},
      create: flag,
    });
  }

  // 4. Designations (example subset)
  const designations = [
    { name: 'Senior Consultant', category: 'clinical', description: 'Full override authority' },
    { name: 'Consultant', category: 'clinical', description: 'Specialist doctor' },
    { name: 'Resident Doctor', category: 'clinical', description: 'Supervised doctor' },
    { name: 'Duty Doctor', category: 'clinical', description: 'Emergency doctor (CMO/RMO)' },
    { name: 'Casualty Doctor', category: 'clinical', description: 'Casualty doctor' },
    { name: 'OPD Nurse', category: 'nursing', description: 'Nurse in OPD' },
    { name: 'Casualty Nurse', category: 'nursing', description: 'Nurse in Casualty' },
    { name: 'Receptionist', category: 'support', description: 'Front desk' },
    { name: 'OPD Manager', category: 'admin', description: 'Manages OPD operations' },
    { name: 'OPD Admin', category: 'admin', description: 'Admin for OPD' },
  ];

  for (const desig of designations) {
    await prisma.designation.upsert({
      where: { name: desig.name },
      update: {},
      create: desig,
    });
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
