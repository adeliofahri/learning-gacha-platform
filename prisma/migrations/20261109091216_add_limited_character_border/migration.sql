-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "limitedBorderConfig" JSONB,
ADD COLUMN     "limitedBorderImageUrl" TEXT,
ADD COLUMN     "limitedBorderType" "RarityBorderType" NOT NULL DEFAULT 'PRESET';
