-- Add transaction type for character deletion refunds.
ALTER TYPE "TransactionType" ADD VALUE 'CHARACTER_DELETE_REFUND';

-- Temporarily remove the foreign key to change its deletion behavior.
ALTER TABLE "GachaResult"
DROP CONSTRAINT "GachaResult_characterId_fkey";

-- Add snapshot columns as nullable first.
ALTER TABLE "GachaResult"
ADD COLUMN "characterName" TEXT,
ADD COLUMN "characterImageUrl" TEXT;

-- Allow the original character relation to become null.
ALTER TABLE "GachaResult"
ALTER COLUMN "characterId" DROP NOT NULL;

-- Backfill snapshots for all existing gacha results.
UPDATE "GachaResult" AS gr
SET
  "characterName" = c."name",
  "characterImageUrl" = c."imageUrl"
FROM "Character" AS c
WHERE gr."characterId" = c."id";

-- Ensure every historical result has its snapshot.
ALTER TABLE "GachaResult"
ALTER COLUMN "characterName" SET NOT NULL,
ALTER COLUMN "characterImageUrl" SET NOT NULL;

-- Restore the foreign key with SET NULL behavior.
ALTER TABLE "GachaResult"
ADD CONSTRAINT "GachaResult_characterId_fkey"
FOREIGN KEY ("characterId")
REFERENCES "Character"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
