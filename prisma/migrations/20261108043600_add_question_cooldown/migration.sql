-- CreateTable
CREATE TABLE "QuestionCooldown" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionCooldown_expiresAt_idx" ON "QuestionCooldown"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCooldown_userId_questionId_key" ON "QuestionCooldown"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "QuestionCooldown" ADD CONSTRAINT "QuestionCooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCooldown" ADD CONSTRAINT "QuestionCooldown_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
