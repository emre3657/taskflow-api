-- CreateIndex
CREATE INDEX "Todo_userId_completed_title_idx" ON "Todo"("userId", "completed", "title");
