# Implementation Plan

Status: ✅ selesai · ⚠️ selesai dengan catatan · ⏳ belum

| Fase | Isi                                                                                                                      | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| 0    | Inspeksi, plan, arsitektur, desain DB, keputusan                                                                         | ✅     |
| 1    | Foundation: Next.js 15, Tailwind 4, UI kit shadcn-style, ESLint/Prettier, Docker Compose, Prisma, env validation, layout | ✅     |
| 2    | Schema + migration (dengan CHECK constraint), seed DEMO, register/login/logout, sesi DB, RBAC, test auth                 | ✅     |
| 3    | Learning: mapel/topik, soal & opsi, paket & urutan, submit PG, isian + review, solved/progress, bounty                   | ✅     |
| 4    | Wallet COIN/SHARD, ledger, admin adjustment, event bonus, atomic update, test retry/double claim                         | ✅     |
| 5    | Karakter, upload gambar tervalidasi, inventory, konversi duplikat, ledger shard, avatar                                  | ✅     |
| 6    | Gacha: banner permanent/limited, rate disclosure, single, 10×, step-up + jaminan 6★, history, idempotency                | ✅     |
| 7    | Profil publik/privat, leaderboard lifetime/monthly (Asia/Jakarta), tie-break                                             | ✅     |
| 8    | Admin dashboard: overview, soal, paket, review, karakter, banner, siswa, event, pengaturan, audit log                    | ✅     |
| 9    | Hardening: security review (docs/SECURITY.md), e2e, lint, typecheck, build, README, backup                               | ✅     |

## Pemetaan requirement → kode

| Area                                                                                        | File utama                                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Aturan murni (bounty, status, shard, harga, step-up, roll, jaminan 6★, banner, leaderboard) | `src/server/domain/*.ts`                                        |
| Transaksi ekonomi                                                                           | `src/server/services/{wallet,learning,gacha,event}.service.ts`  |
| Leaderboard SQL                                                                             | `src/server/repositories/leaderboard.repository.ts`             |
| Auth & sesi                                                                                 | `src/lib/auth/*`, `src/app/api/auth/*`, `src/middleware.ts`     |
| RBAC                                                                                        | `src/server/policies/index.ts`, `src/lib/auth/current-user.ts`  |
| Validasi                                                                                    | `src/lib/validation/*.ts`                                       |
| UI siswa / admin                                                                            | `src/app/(student)/**`, `src/app/admin/**`, `src/components/**` |

## Test

- Unit: `tests/unit` (domain, CSRF/redirect middleware, policy, validasi upload)
- Integration: `tests/integration` (Route Handler asli + PostgreSQL; race condition & idempotency)
- E2E: `tests/e2e/flows.spec.ts` (7 alur wajib, memverifikasi DB/saldo)

## Catatan / pekerjaan lanjutan (di luar MVP)

- Penggunaan shard (upgrade/tukar) belum ada — ledger SHARD & tipe `SHARD_SPEND` sudah disiapkan.
- Upload gambar tersimpan di database (maks 2 MB/file); untuk volume besar pertimbangkan object storage.
- Rate limiting berbasis tabel PostgreSQL; tabel `RateLimit` dapat dibersihkan berkala (baris lama tidak berdampak fungsional).
- Docker daemon tidak tersedia di environment build; `docker-compose.yml` belum dijalankan di sini (PostgreSQL 16 native dipakai untuk test).
- Deploy nyata ke Vercel + Neon belum bisa dijalankan dari environment ini (butuh akun pengguna). Alur yang sama (`pnpm vercel-build` pada DB kosong → `deploy/seed-demo.sql` → login, gacha, ganti password) sudah disimulasikan dan lulus secara lokal.

## Hasil verifikasi terakhir (2026-11-07, PostgreSQL 16 native, Node 22)

| Langkah                                          | Hasil                           |
| ------------------------------------------------ | ------------------------------- |
| `pnpm format:check`                              | ✅                              |
| `pnpm lint` (max-warnings 0)                     | ✅                              |
| `pnpm typecheck` (strict)                        | ✅                              |
| `pnpm test:unit`                                 | ✅ 57/57                        |
| `pnpm test:integration`                          | ✅ 44/44                        |
| `pnpm test:e2e`                                  | ✅ 7/7 (3 run berturut-turut)   |
| `pnpm build`                                     | ✅                              |
| Smoke test semua halaman siswa (11) & admin (21) | ✅ HTTP 200, tanpa error server |
