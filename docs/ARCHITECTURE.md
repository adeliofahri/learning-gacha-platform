# Architecture

## Ringkasan

Satu codebase TypeScript (Next.js 15 App Router) yang melayani UI dan API.

```
Browser ──► Next.js (React Server Components + Client Components)
              │
              ├─ Server Components  ──► server/services (read)  ──► server/repositories ──► Prisma ──► PostgreSQL
              └─ fetch() ke Route Handlers (/api/**)
                    │  middleware.ts: CSRF origin check untuk request non-GET
                    ├─ lib/http: parse JSON + Zod, mapping error → HTTP
                    ├─ lib/auth: sesi dari cookie HttpOnly, guard role
                    └─ server/services (aturan bisnis, transaksi DB)
```

## Lapisan

| Lapisan        | Lokasi                                                            | Tanggung jawab                                                                                                                       |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| UI             | `src/app/**`, `src/components/**`                                 | Render, form (React Hook Form + Zod), tidak berisi aturan bisnis.                                                                    |
| Validasi       | `src/lib/validation/**`                                           | Skema Zod dipakai bersama client & server. Server selalu memvalidasi ulang.                                                          |
| Route Handlers | `src/app/api/**/route.ts`                                         | Tipis: auth guard → validasi → panggil service → JSON.                                                                               |
| Domain (pure)  | `src/server/domain/**`                                            | Fungsi murni: harga gacha, roll berbobot, jaminan 6★, step-up, status soal, shard, skor leaderboard, periode bulan. Diuji unit test. |
| Services       | `src/server/services/**`                                          | Aturan bisnis + `prisma.$transaction` untuk operasi ekonomi.                                                                         |
| Repositories   | `src/server/repositories/**`                                      | Query baca yang dipakai ulang (leaderboard SQL, progress, dsb).                                                                      |
| Policies       | `src/server/policies/**`                                          | Otorisasi (requireUser / requireStudent / requireAdmin, kepemilikan resource).                                                       |
| Infrastruktur  | `src/lib/db`, `src/lib/env`, `src/lib/auth`, `src/lib/rate-limit` | Prisma client, validasi env, sesi, rate limiting berbasis DB.                                                                        |

## Autentikasi & sesi

- Login email + password. Hash: **Argon2id** (`@node-rs/argon2`, memoryCost 19 MiB, timeCost 2).
- Sesi berbasis database: token acak 256-bit di cookie `lgp_session` (HttpOnly, SameSite=Lax, Secure di production, 7 hari). DB menyimpan HMAC-SHA256(AUTH_SECRET, token).
- Registrasi publik selalu membuat role `STUDENT`; payload role diabaikan oleh skema Zod (strict).
- Admin dibuat oleh seed atau `pnpm admin:create` (CLI lokal).

## CSRF

Cookie `SameSite=Lax` + `middleware.ts` menolak request `POST/PUT/PATCH/DELETE` ke `/api/**` yang header `Origin`-nya tidak sama dengan host aplikasi. Endpoint JSON mewajibkan `Content-Type: application/json` (kecuali upload multipart admin).

## Ekonomi & konsistensi

- Semua mutasi saldo melalui `walletService.applyChange(tx, …)` yang menulis `WalletTransaction` dan memperbarui `Wallet` secara atomik.
- Gacha: satu `$transaction` → cek idempotency → cek banner aktif → kunci progress step-up (optimistic) → debit koin → roll (crypto.randomInt) → inventory upsert / konversi shard → simpan history. Gagal di mana pun = rollback penuh.
- Jawaban benar: `$transaction` → insert `QuestionSolve` (unique) → kredit bounty. Konflik unique → retry sebagai attempt latihan tanpa bounty.

## Rate limiting

Tabel `RateLimit` (fixed window) — tanpa Redis sesuai spesifikasi. Diterapkan pada login, register, submit answer, gacha pull, klaim event.

## Timezone

`APP_TIMEZONE` (default `Asia/Jakarta`) dipakai untuk batas bulan leaderboard bulanan dan format tanggal di UI.

## File upload

`POST /api/admin/uploads` (admin saja): PNG/JPEG/WebP, ≤ 2 MB, validasi magic bytes, nama file acak, disimpan di `public/uploads/characters/`. SVG ditolak (risiko XSS). Untuk deployment serverless, ganti ke object storage (lihat README).
