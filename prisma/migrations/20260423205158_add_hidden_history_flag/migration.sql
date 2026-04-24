-- AlterTable
ALTER TABLE "ReferenceHistory" ADD COLUMN     "hiddenByUserAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReferenceHistory_userId_hiddenByUserAt_openedAt_idx" ON "ReferenceHistory"("userId", "hiddenByUserAt", "openedAt");
