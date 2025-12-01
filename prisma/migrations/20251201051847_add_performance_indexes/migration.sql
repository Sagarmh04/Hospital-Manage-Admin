/*
  Warnings:

  - You are about to drop the column `revoked` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "revoked";

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "SessionLog_expiredAt_idx" ON "SessionLog"("expiredAt");

-- CreateIndex
CREATE INDEX "SessionLog_revokedAt_idx" ON "SessionLog"("revokedAt");
