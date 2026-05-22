ALTER TABLE "TemplateDraft"
ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Draft 1';

ALTER TABLE "TemplateDraft"
ALTER COLUMN "name" DROP DEFAULT;

DROP INDEX "TemplateDraft_userId_templateKey_key";

CREATE INDEX "TemplateDraft_userId_templateKey_updatedAt_idx"
ON "TemplateDraft"("userId", "templateKey", "updatedAt");
