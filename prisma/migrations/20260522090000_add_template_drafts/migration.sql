CREATE TABLE "TemplateDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateDraft_userId_templateKey_key" ON "TemplateDraft"("userId", "templateKey");
CREATE INDEX "TemplateDraft_templateKey_idx" ON "TemplateDraft"("templateKey");

ALTER TABLE "TemplateDraft"
ADD CONSTRAINT "TemplateDraft_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
