-- CreateEnum
CREATE TYPE "RarityBorderType" AS ENUM ('PRESET', 'GRADIENT', 'IMAGE');

-- CreateTable
CREATE TABLE "RarityStyle" (
    "id" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "borderType" "RarityBorderType" NOT NULL DEFAULT 'PRESET',
    "borderConfig" JSONB,
    "borderImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RarityStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RarityStyle_rarity_key" ON "RarityStyle"("rarity");
