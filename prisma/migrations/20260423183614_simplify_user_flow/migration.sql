/*
  Warnings:

  - You are about to drop the `DisplayLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PresentationReferenceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PresentationSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DisplayLink" DROP CONSTRAINT "DisplayLink_presentationSessionId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationReferenceHistory" DROP CONSTRAINT "PresentationReferenceHistory_presentationSessionId_fkey";

-- DropForeignKey
ALTER TABLE "PresentationSession" DROP CONSTRAINT "PresentationSession_ownerUserId_fkey";

-- DropTable
DROP TABLE "DisplayLink";

-- DropTable
DROP TABLE "PresentationReferenceHistory";

-- DropTable
DROP TABLE "PresentationSession";

-- DropEnum
DROP TYPE "DisplayLinkMode";

-- DropEnum
DROP TYPE "PresentationSessionStatus";

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredVersion" TEXT,
    "themeSettingsJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT,
    "reference" TEXT NOT NULL,
    "version" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "ReferenceHistory_userId_openedAt_idx" ON "ReferenceHistory"("userId", "openedAt");

-- CreateIndex
CREATE INDEX "ReferenceHistory_sessionKey_openedAt_idx" ON "ReferenceHistory"("sessionKey", "openedAt");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceHistory" ADD CONSTRAINT "ReferenceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
