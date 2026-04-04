-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "priority" "TodoPriority" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "Todo_userId_priority_idx" ON "Todo"("userId", "priority");

-- CreateIndex
CREATE INDEX "Todo_userId_dueDate_idx" ON "Todo"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Todo_userId_completedAt_idx" ON "Todo"("userId", "completedAt");
