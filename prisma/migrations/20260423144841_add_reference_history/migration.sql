-- CreateTable
CREATE TABLE "PresentationReferenceHistory" (
    "id" TEXT NOT NULL,
    "presentationSessionId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "version" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresentationReferenceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PresentationReferenceHistory_presentationSessionId_openedAt_idx" ON "PresentationReferenceHistory"("presentationSessionId", "openedAt");

-- AddForeignKey
ALTER TABLE "PresentationReferenceHistory" ADD CONSTRAINT "PresentationReferenceHistory_presentationSessionId_fkey" FOREIGN KEY ("presentationSessionId") REFERENCES "PresentationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
