-- CreateTable
CREATE TABLE "QuestionUnlockConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "shardCost" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionUnlockConfig_pkey" PRIMARY KEY ("id")
);
