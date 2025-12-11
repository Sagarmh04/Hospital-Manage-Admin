-- CreateEnum
CREATE TYPE "PermissionGroupCode" AS ENUM ('PATIENT_ACCESS', 'DOCUMENTATION', 'ORDERS', 'MEDICATION', 'APPROVALS');

-- CreateEnum
CREATE TYPE "PermissionGroupMode" AS ENUM ('NONE', 'PARTIAL', 'FULL', 'DRAFT_ONLY', 'OWN_NOTES', 'EXECUTE_ONLY', 'EMERGENCY_ONLY', 'LIMITED');

-- CreateEnum
CREATE TYPE "WorkflowFlagType" AS ENUM ('BOOLEAN', 'ENUM', 'NUMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'active',
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "actingSessionId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "AuthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" SERIAL NOT NULL,
    "code" "PermissionGroupCode" NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowFlag" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "flagType" "WorkflowFlagType" NOT NULL DEFAULT 'BOOLEAN',
    "enumValues" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignationPermissionGroup" (
    "id" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "permissionGroupId" INTEGER NOT NULL,
    "mode" "PermissionGroupMode" NOT NULL,

    CONSTRAINT "DesignationPermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignationWorkflowFlag" (
    "id" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "valueBool" BOOLEAN,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,

    CONSTRAINT "DesignationWorkflowFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionGroupOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "groupCode" "PermissionGroupCode" NOT NULL,
    "modeOverride" "PermissionGroupMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissionGroupOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWorkflowFlagOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "valueBool" BOOLEAN,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkflowFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCapabilities" (
    "userId" TEXT NOT NULL,
    "isDoctor" BOOLEAN NOT NULL DEFAULT false,
    "isNurse" BOOLEAN NOT NULL DEFAULT false,
    "isReceptionist" BOOLEAN NOT NULL DEFAULT false,
    "isOPDBookable" BOOLEAN NOT NULL DEFAULT false,
    "isCasualtyBookable" BOOLEAN NOT NULL DEFAULT false,
    "canRegisterPatient" BOOLEAN NOT NULL DEFAULT false,
    "canPlaceLabOrder" BOOLEAN NOT NULL DEFAULT false,
    "canApproveLabResult" BOOLEAN NOT NULL DEFAULT false,
    "canDispensePharmacy" BOOLEAN NOT NULL DEFAULT false,
    "canDoTriage" BOOLEAN NOT NULL DEFAULT false,
    "canBreakGlass" BOOLEAN NOT NULL DEFAULT false,
    "canEmergencyPrescribe" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCapabilities_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "SessionLog_sessionId_idx" ON "SessionLog"("sessionId");

-- CreateIndex
CREATE INDEX "SessionLog_userId_idx" ON "SessionLog"("userId");

-- CreateIndex
CREATE INDEX "SessionLog_expiredAt_idx" ON "SessionLog"("expiredAt");

-- CreateIndex
CREATE INDEX "SessionLog_revokedAt_idx" ON "SessionLog"("revokedAt");

-- CreateIndex
CREATE INDEX "AuthLog_userId_idx" ON "AuthLog"("userId");

-- CreateIndex
CREATE INDEX "AuthLog_sessionId_idx" ON "AuthLog"("sessionId");

-- CreateIndex
CREATE INDEX "AuthLog_actingSessionId_idx" ON "AuthLog"("actingSessionId");

-- CreateIndex
CREATE INDEX "AuthLog_action_idx" ON "AuthLog"("action");

-- CreateIndex
CREATE INDEX "AuthLog_timestamp_idx" ON "AuthLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "OtpRequest_userId_key" ON "OtpRequest"("userId");

-- CreateIndex
CREATE INDEX "OtpRequest_expiresAt_idx" ON "OtpRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_name_key" ON "Designation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_code_key" ON "PermissionGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowFlag_code_key" ON "WorkflowFlag"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DesignationPermissionGroup_designationId_permissionGroupId_key" ON "DesignationPermissionGroup"("designationId", "permissionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignationWorkflowFlag_designationId_flagId_key" ON "DesignationWorkflowFlag"("designationId", "flagId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAssignment_userId_departmentId_designationId_key" ON "UserAssignment"("userId", "departmentId", "designationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionGroupOverride_userId_departmentId_groupCode_key" ON "UserPermissionGroupOverride"("userId", "departmentId", "groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkflowFlagOverride_userId_flagId_key" ON "UserWorkflowFlagOverride"("userId", "flagId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpRequest" ADD CONSTRAINT "OtpRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationPermissionGroup" ADD CONSTRAINT "DesignationPermissionGroup_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationPermissionGroup" ADD CONSTRAINT "DesignationPermissionGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationWorkflowFlag" ADD CONSTRAINT "DesignationWorkflowFlag_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationWorkflowFlag" ADD CONSTRAINT "DesignationWorkflowFlag_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "WorkflowFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroupOverride" ADD CONSTRAINT "UserPermissionGroupOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroupOverride" ADD CONSTRAINT "UserPermissionGroupOverride_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkflowFlagOverride" ADD CONSTRAINT "UserWorkflowFlagOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWorkflowFlagOverride" ADD CONSTRAINT "UserWorkflowFlagOverride_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "WorkflowFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCapabilities" ADD CONSTRAINT "UserCapabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
