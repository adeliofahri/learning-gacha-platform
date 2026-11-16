# Contribution System

## Student submissions
- Student accounts can submit Questions and Characters from `/contribute`.
- Question submissions contain only authored question content. Subject/topic and difficulty are assigned by an admin during review.
- The existing admin Question and Character editors are reused for both student submissions and admin review. The question editor retains LaTeX preview and image upload; the character editor retains artwork, rarity, category, border, and border-image controls.
- Images are stored in `UploadedImage`, so they remain available on serverless hosting.

## Weekly quota
- Questions: 5 per user per week.
- Characters: 3 per user per week.
- A submission consumes quota immediately. Approving or rejecting it does not decrement the quota.
- Week start is Monday 00:00 in `Asia/Jakarta`.
- `ContributionQuota` stores a separate counter for each user, week, and contribution type. The counter update is atomic.

## Review and rewards
- Only admins can access `/admin/contributions`.
- Approval publishes the content, attributes it to the original contributor, awards Coin and Contribution Points, writes the Coin transaction, and deletes the submission in one database transaction.
- Question reward: 80% of the current configured bounty for the difficulty assigned by the admin (rounded down to an integer); +2 Contribution Points.
- Character reward: +100 Coin and +1 Contribution Point.
- Rejection deletes the submission without recording a rejection history. Its quota remains consumed.
- `ContributionReward.sourceSubmissionId` is unique and has no foreign key to the submission, so it provides a durable idempotency record after the submission is deleted.

## Public profiles
- The private/public profile toggle is removed. Existing users are made public by the migration and new users default to public.
- Public profile responses include only public-facing profile data, Collection Stars, Contribution Points, published questions, contributed characters, and collection characters. Authentication and wallet details are not returned.

## Question deletion
- Admins can permanently delete questions.
- Package-question links are removed; packages remain published.
- Attempts and QuestionSolve rows are retained and their `questionId` is set to `NULL`. Attempt snapshots, answers, awarded bounty, and wallet ledger entries remain.
- Uploaded question images are deleted only when no question, character, package, or banner still references the same uploaded filename.
- Deleting approved content does not reverse the contributor's Coin or Contribution Points.

## Database migration
The migration is `prisma/migrations/20261116090000_add_contribution_system/migration.sql`.

No migration, database write, or deployment was run while preparing this source archive. After reviewing the code, regenerate the Prisma client with `pnpm db:generate`. Apply the migration only to the intended development database using the project's normal Prisma migration workflow. Do not run it against production until separately reviewed and approved.
