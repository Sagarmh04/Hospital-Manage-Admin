-- CreateIndex
CREATE INDEX "AuthLog_userId_idx" ON "AuthLog"("userId");

-- CreateIndex
CREATE INDEX "AuthLog_sessionId_idx" ON "AuthLog"("sessionId");

-- CreateIndex
CREATE INDEX "AuthLog_actingSessionId_idx" ON "AuthLog"("actingSessionId");

-- CreateIndex
CREATE INDEX "AuthLog_action_idx" ON "AuthLog"("action");

-- CreateIndex
CREATE INDEX "SessionLog_sessionId_idx" ON "SessionLog"("sessionId");

-- CreateIndex
CREATE INDEX "SessionLog_userId_idx" ON "SessionLog"("userId");
