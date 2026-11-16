-- Contribution system and durable historical records.
CREATE TYPE "ContributionType" AS ENUM ('QUESTION', 'CHARACTER');
CREATE TYPE "ContributionSubmissionStatus" AS ENUM ('PENDING');
ALTER TYPE "TransactionType" ADD VALUE 'CONTRIBUTION_REWARD';

ALTER TABLE "User"
  ADD COLUMN "contributionPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ALTER COLUMN "isPublic" SET DEFAULT true;
UPDATE "User" SET "isPublic" = true;

ALTER TABLE "Character" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Character"
  ADD CONSTRAINT "Character_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Character_createdById_createdAt_idx"
  ON "Character"("createdById", "createdAt");
CREATE INDEX "Question_createdById_status_createdAt_idx"
  ON "Question"("createdById", "status", "createdAt");
UPDATE "Character"
SET "createdById" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "createdById" IS NULL
  AND EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN');

ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_questionId_fkey";
ALTER TABLE "Attempt" ALTER COLUMN "questionId" DROP NOT NULL;
ALTER TABLE "Attempt"
  ADD CONSTRAINT "Attempt_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuestionSolve" DROP CONSTRAINT "QuestionSolve_questionId_fkey";
ALTER TABLE "QuestionSolve" ALTER COLUMN "questionId" DROP NOT NULL;
ALTER TABLE "QuestionSolve"
  ADD CONSTRAINT "QuestionSolve_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContributionSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ContributionType" NOT NULL,
  "content" JSONB NOT NULL,
  "status" "ContributionSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContributionSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContributionSubmission_status_createdAt_idx"
  ON "ContributionSubmission"("status", "createdAt");
CREATE INDEX "ContributionSubmission_userId_type_createdAt_idx"
  ON "ContributionSubmission"("userId", "type", "createdAt");
ALTER TABLE "ContributionSubmission"
  ADD CONSTRAINT "ContributionSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ContributionQuota" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "type" "ContributionType" NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ContributionQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContributionQuota_userId_weekStart_type_key"
  ON "ContributionQuota"("userId", "weekStart", "type");
CREATE INDEX "ContributionQuota_weekStart_type_idx"
  ON "ContributionQuota"("weekStart", "type");
ALTER TABLE "ContributionQuota"
  ADD CONSTRAINT "ContributionQuota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ContributionReward" (
  "id" TEXT NOT NULL,
  "sourceSubmissionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ContributionType" NOT NULL,
  "contentId" TEXT NOT NULL,
  "coinAmount" INTEGER NOT NULL,
  "pointsAmount" INTEGER NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContributionReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContributionReward_sourceSubmissionId_key"
  ON "ContributionReward"("sourceSubmissionId");
CREATE INDEX "ContributionReward_userId_approvedAt_idx"
  ON "ContributionReward"("userId", "approvedAt");
ALTER TABLE "ContributionReward"
  ADD CONSTRAINT "ContributionReward_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
