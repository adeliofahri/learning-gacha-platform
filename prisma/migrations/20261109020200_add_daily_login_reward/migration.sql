-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'DAILY_LOGIN_REWARD';

-- CreateTable
CREATE TABLE "DailyLoginReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLoginReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyLoginReward_dateKey_idx" ON "DailyLoginReward"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLoginReward_userId_dateKey_key" ON "DailyLoginReward"("userId", "dateKey");

-- AddForeignKey
ALTER TABLE "DailyLoginReward" ADD CONSTRAINT "DailyLoginReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
