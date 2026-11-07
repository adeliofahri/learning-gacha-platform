# Database Design

PostgreSQL 16 + Prisma ORM. Skema lengkap: `prisma/schema.prisma`. Migrasi: `prisma/migrations/`.

## ERD (ringkas)

```
User 1─1 Wallet                      User 1─* WalletTransaction
User 1─* Session                     User 1─* AuditLog (actor)
User *─1 Character (avatar, opsional)

Subject 1─* Topic
Subject 1─* Question *─1 Topic?
Question 1─* QuestionOption          (pilihan ganda, tepat satu isCorrect)
Question 1─* QuestionAcceptedAnswer  (variasi jawaban acuan isian, hanya untuk admin)
Package  1─* PackageQuestion *─1 Question   (PK komposit packageId+questionId → tidak ada duplikat)
User 1─* Attempt *─1 Question        (snapshot konten + versi soal saat attempt dibuat)
User 1─* QuestionSolve *─1 Question  (UNIQUE userId+questionId → bounty sekali)
User 1─* PackageProgress *─1 Package (aktivitas terakhir per paket)
DifficultyConfig (EASY/MEDIUM/HARD/EXPERT → bounty default)

Character 1─* InventoryItem *─1 User (UNIQUE userId+characterId)
DuplicateShardConfig (rarity 1..6 → shard)

Banner 1─* BannerCharacter *─1 Character (weight, isFeatured)
Banner 1─* StepUpStage (stage 1..5, price, pullCount)
Banner 1─* StepUpProgress *─1 User  (PK userId+bannerId)
Banner 1─* GachaPull *─1 User       (UNIQUE userId+idempotencyKey)
GachaPull 1─* GachaResult *─1 Character  (rarity snapshot, isNew, shardsAwarded)

Event 1─* EventClaim *─1 User       (UNIQUE eventId+userId)
RateLimit (key, windowStart, count)
```

## Tabel utama

| Tabel | Catatan penting |
|---|---|
| `User` | `role` ADMIN/STUDENT, `status` ACTIVE/SUSPENDED, `isPublic` default **false** (privacy-by-default), `avatarCharacterId` hanya karakter milik user (diverifikasi server). |
| `Session` | Token acak 32 byte; DB hanya menyimpan HMAC-SHA256 (`tokenHash`). |
| `Wallet` | `coins`, `shards` dengan **CHECK (coins >= 0, shards >= 0)** di SQL migration. |
| `WalletTransaction` | `currency` COIN/SHARD, `amount` bertanda (+ tambah, − kurang), `type`, `referenceType/referenceId`, `balanceAfter`, `metadata` non-sensitif. |
| `Question` | `type`, `difficulty`, `bounty`, `status` DRAFT/PUBLISHED/ARCHIVED, `version` (naik saat konten diubah). Tidak pernah di-hard-delete bila sudah punya attempt. |
| `Attempt` | `questionVersion`, `snapshot` JSON (konten, opsi, jawaban terpilih), `status` CORRECT/INCORRECT/PENDING_REVIEW/APPROVED/REJECTED, `isPractice`, reviewer/feedback. UNIQUE (userId, idempotencyKey). |
| `QuestionSolve` | UNIQUE (userId, questionId) — dasar anti-duplikasi bounty; status SOLVED global per user-question. |
| `Character` | `rarity` **CHECK 1..6**, `category` PERMANENT/LIMITED, `status` ACTIVE/ARCHIVED. |
| `InventoryItem` | `quantity` (1 = dimiliki), `duplicateCount`, `shardsFromDuplicates`, `firstObtainedAt`, `lastObtainedAt`. |
| `Banner` | `type` PERMANENT/LIMITED, `status` DRAFT/ACTIVE/ARCHIVED (ENDED diturunkan dari `endsAt`), `singlePrice` (ten-pull = 9×single), `stepUpEnabled`, `stepUpGuaranteeFeatured`, `isDemoRate`. |
| `GachaPull` / `GachaResult` | user, banner, pull_type, price, stepNumber, idempotencyKey, hasil + rarity snapshot, flag `isGuaranteed`. |
| `Event` / `EventClaim` | Rentang waktu, `coinReward`, `minSolved`, `maxClaims` global; UNIQUE (eventId, userId). |
| `AuditLog` | actor, action, targetType, targetId, metadata, createdAt. |

## Status soal per siswa (diturunkan, bukan disimpan)

```
SOLVED          jika ada QuestionSolve
PENDING_REVIEW  jika ada Attempt berstatus PENDING_REVIEW
ATTEMPTED       jika ada Attempt lain
UNSOLVED        selain itu
```

## Constraint keamanan ekonomi

- `Wallet_coins_nonnegative`, `Wallet_shards_nonnegative` (CHECK).
- `Character_rarity_range` (CHECK 1..6), `BannerCharacter_weight_positive` (CHECK > 0).
- Pengurangan saldo memakai `UPDATE ... WHERE coins >= amount` (atomic conditional update).
- Unique constraint untuk reward sekali: `QuestionSolve(userId,questionId)`, `EventClaim(eventId,userId)`,
  idempotency: `Attempt(userId,idempotencyKey)`, `GachaPull(userId,idempotencyKey)`.
- Inventory: `INSERT ... ON CONFLICT (userId, characterId) DO UPDATE ... RETURNING (xmax = 0)` untuk menentukan karakter baru vs duplikat secara atomik.
