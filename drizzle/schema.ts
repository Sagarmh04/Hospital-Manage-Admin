import { pgTable, text, timestamp, boolean, integer, uuid, pgEnum, json, real, uniqueIndex, index } from "drizzle-orm/pg-core";

// Enums
export const permissionGroupCodeEnum = pgEnum("PermissionGroupCode", [
  "PATIENT_ACCESS",
  "DOCUMENTATION",
  "ORDERS",
  "MEDICATION",
  "APPROVALS",
]);

export const permissionGroupModeEnum = pgEnum("PermissionGroupMode", [
  "NONE",
  "PARTIAL",
  "FULL",
  "DRAFT_ONLY",
  "OWN_NOTES",
  "EXECUTE_ONLY",
  "EMERGENCY_ONLY",
  "LIMITED",
]);

export const workflowFlagTypeEnum = pgEnum("WorkflowFlagType", [
  "BOOLEAN",
  "ENUM",
  "NUMBER",
]);

// Core Auth / User Tables
export const users = pgTable("User", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  role: text("role").default("ADMIN").notNull(),
  status: text("status").default("active").notNull(),
  passwordHash: text("passwordHash").notNull(),
  passwordChangedAt: timestamp("passwordChangedAt", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("User_status_idx").on(table.status),
}));

export const sessions = pgTable("Session", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("userId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  browser: text("browser"),
  os: text("os"),
  deviceType: text("deviceType"),
  lastActivityAt: timestamp("lastActivityAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("Session_userId_idx").on(table.userId),
  expiresAtIdx: index("Session_expiresAt_idx").on(table.expiresAt),
}));

export const sessionLogs = pgTable("SessionLog", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  sessionId: text("sessionId").notNull(),
  userId: text("userId").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  revokedAt: timestamp("revokedAt", { mode: "date" }),
  expiredAt: timestamp("expiredAt", { mode: "date" }),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  browser: text("browser"),
  os: text("os"),
  deviceType: text("deviceType"),
}, (table) => ({
  sessionIdIdx: index("SessionLog_sessionId_idx").on(table.sessionId),
  userIdIdx: index("SessionLog_userId_idx").on(table.userId),
  expiredAtIdx: index("SessionLog_expiredAt_idx").on(table.expiredAt),
  revokedAtIdx: index("SessionLog_revokedAt_idx").on(table.revokedAt),
}));

export const authLogs = pgTable("AuthLog", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("userId").notNull(),
  sessionId: text("sessionId"),
  actingSessionId: text("actingSessionId"),
  action: text("action").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  browser: text("browser"),
  os: text("os"),
  deviceType: text("deviceType"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  details: json("details"),
}, (table) => ({
  userIdIdx: index("AuthLog_userId_idx").on(table.userId),
  sessionIdIdx: index("AuthLog_sessionId_idx").on(table.sessionId),
  actingSessionIdIdx: index("AuthLog_actingSessionId_idx").on(table.actingSessionId),
  actionIdx: index("AuthLog_action_idx").on(table.action),
  timestampIdx: index("AuthLog_timestamp_idx").on(table.timestamp),
}));

export const otpRequests = pgTable("OtpRequest", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("userId").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  otpHash: text("otpHash").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastSentAt: timestamp("lastSentAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  expiresAtIdx: index("OtpRequest_expiresAt_idx").on(table.expiresAt),
}));

// Departments & Designations
export const departments = pgTable("Department", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const designations = pgTable("Designation", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  name: text("name").unique().notNull(),
  category: text("category").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// Permission Groups & Workflow Flags
export const permissionGroups = pgTable("PermissionGroup", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: permissionGroupCodeEnum("code").unique().notNull(),
  description: text("description").notNull(),
});

export const workflowFlags = pgTable("WorkflowFlag", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  code: text("code").unique().notNull(),
  description: text("description").notNull(),
  flagType: workflowFlagTypeEnum("flagType").default("BOOLEAN").notNull(),
  enumValues: text("enumValues").array(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const designationPermissionGroups = pgTable("DesignationPermissionGroup", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  designationId: text("designationId").notNull().references(() => designations.id),
  permissionGroupId: integer("permissionGroupId").notNull().references(() => permissionGroups.id),
  mode: permissionGroupModeEnum("mode").notNull(),
}, (table) => ({
  uniqueDesignationPermission: uniqueIndex("DesignationPermissionGroup_designationId_permissionGroupId_key")
    .on(table.designationId, table.permissionGroupId),
}));

export const designationWorkflowFlags = pgTable("DesignationWorkflowFlag", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  designationId: text("designationId").notNull().references(() => designations.id),
  flagId: text("flagId").notNull().references(() => workflowFlags.id),
  valueBool: boolean("valueBool"),
  valueText: text("valueText"),
  valueNumber: real("valueNumber"),
}, (table) => ({
  uniqueDesignationFlag: uniqueIndex("DesignationWorkflowFlag_designationId_flagId_key")
    .on(table.designationId, table.flagId),
}));

// User Assignments & Overrides
export const userAssignments = pgTable("UserAssignment", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("userId").notNull().references(() => users.id),
  departmentId: text("departmentId").notNull().references(() => departments.id),
  designationId: text("designationId").notNull().references(() => designations.id),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserDeptDesignation: uniqueIndex("UserAssignment_userId_departmentId_designationId_key")
    .on(table.userId, table.departmentId, table.designationId),
}));

export const userPermissionGroupOverrides = pgTable("UserPermissionGroupOverride", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("userId").notNull().references(() => users.id),
  departmentId: text("departmentId").references(() => departments.id),
  groupCode: permissionGroupCodeEnum("groupCode").notNull(),
  modeOverride: permissionGroupModeEnum("modeOverride"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserDeptGroupCode: uniqueIndex("UserPermissionGroupOverride_userId_departmentId_groupCode_key")
    .on(table.userId, table.departmentId, table.groupCode),
}));

export const userWorkflowFlagOverrides = pgTable("UserWorkflowFlagOverride", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: text("userId").notNull().references(() => users.id),
  flagId: text("flagId").notNull().references(() => workflowFlags.id),
  valueBool: boolean("valueBool"),
  valueText: text("valueText"),
  valueNumber: real("valueNumber"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserFlag: uniqueIndex("UserWorkflowFlagOverride_userId_flagId_key")
    .on(table.userId, table.flagId),
}));

// Flattened Capabilities
export const userCapabilities = pgTable("UserCapabilities", {
  userId: text("userId").primaryKey().notNull().references(() => users.id),
  isDoctor: boolean("isDoctor").default(false).notNull(),
  isNurse: boolean("isNurse").default(false).notNull(),
  isReceptionist: boolean("isReceptionist").default(false).notNull(),
  isOPDBookable: boolean("isOPDBookable").default(false).notNull(),
  isCasualtyBookable: boolean("isCasualtyBookable").default(false).notNull(),
  canRegisterPatient: boolean("canRegisterPatient").default(false).notNull(),
  canPlaceLabOrder: boolean("canPlaceLabOrder").default(false).notNull(),
  canApproveLabResult: boolean("canApproveLabResult").default(false).notNull(),
  canDispensePharmacy: boolean("canDispensePharmacy").default(false).notNull(),
  canDoTriage: boolean("canDoTriage").default(false).notNull(),
  canBreakGlass: boolean("canBreakGlass").default(false).notNull(),
  canEmergencyPrescribe: boolean("canEmergencyPrescribe").default(false).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionLog = typeof sessionLogs.$inferSelect;
export type NewSessionLog = typeof sessionLogs.$inferInsert;
export type AuthLog = typeof authLogs.$inferSelect;
export type NewAuthLog = typeof authLogs.$inferInsert;
export type OtpRequest = typeof otpRequests.$inferSelect;
export type NewOtpRequest = typeof otpRequests.$inferInsert;
