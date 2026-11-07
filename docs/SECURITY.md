# Security

Ringkasan kontrol keamanan dan pemetaannya ke requirement bagian M.

| #     | Requirement                 | Implementasi                                                                                                                                                        | Bukti test                                                                   |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1     | Validasi server-side        | Semua Route Handler mem-parse body dengan Zod (`.strict()` → field asing ditolak).                                                                                  | `tests/integration/*`, `gacha.test.ts` (field `characterId`/`price` ditolak) |
| 2     | Password hashing            | Argon2id (`@node-rs/argon2`, m=19 MiB, t=2, p=1). Dummy verify saat email tidak ada (anti user-enumeration timing).                                                 | `auth.test.ts`                                                               |
| 3     | Session cookie aman         | Token 256-bit acak, `HttpOnly`, `SameSite=Lax`, `Secure` di production, 7 hari. DB hanya menyimpan HMAC-SHA256. Logout menghapus sesi; suspend mencabut semua sesi. | `auth.test.ts`                                                               |
| 4     | RBAC admin                  | `requireAdmin()` di setiap `/api/admin/**` dan `requireAdminPage()` di layout & halaman admin. Middleware hanya redirect cepat.                                     | `auth.test.ts` (403 untuk siswa)                                             |
| 5     | Rate limiting               | Tabel `RateLimit` (fixed window, atomic upsert): login (per IP & per email), register, submit jawaban, gacha, klaim event.                                          | `auth.test.ts` (429)                                                         |
| 6     | IDOR                        | Endpoint siswa selalu memakai `user.id` dari sesi, tidak pernah dari request. Profil publik hanya lewat username dan hanya field publik.                            | `profile-leaderboard.test.ts`                                                |
| 7     | Kunci jawaban               | `getPackageForStudent` tidak menyertakan `isCorrect`; kunci & pembahasan hanya dikirim setelah soal SOLVED. Jawaban acuan isian hanya untuk admin.                  | `learning.test.ts`                                                           |
| 8     | Saldo/rarity dari client    | Client hanya mengirim jenis pull atau pilihan jawaban. Harga, hasil, rarity, bounty dihitung server.                                                                | `gacha.test.ts`                                                              |
| 9     | Transaksi DB                | `prisma.$transaction` untuk jawab soal, review, gacha, klaim event, adjustment.                                                                                     | integration tests (rollback saat saldo kurang)                               |
| 10    | Unique constraint reward    | `QuestionSolve(userId,questionId)`, `EventClaim(eventId,userId)`.                                                                                                   | tes request bersamaan                                                        |
| 11    | Idempotency key             | Header `Idempotency-Key` wajib di jawab soal & gacha; unique `(userId, idempotencyKey)`; replay mengembalikan hasil yang sama.                                      | `learning.test.ts`, `gacha.test.ts`                                          |
| 12    | XSS                         | React meng-escape output; `dangerouslySetInnerHTML` dilarang lewat ESLint (`react/no-danger`). Konten soal dirender sebagai teks. Upload SVG ditolak.               | lint                                                                         |
| 13    | CSRF                        | `SameSite=Lax` + middleware memeriksa header `Origin` = host untuk semua request mutasi ke `/api`.                                                                  | `security.test.ts`                                                           |
| 14    | Upload                      | PNG/JPEG/WebP saja, ≤2 MB, cek magic bytes, nama file acak, disajikan oleh route dengan regex nama ketat (tanpa path traversal) + `nosniff`.                        | `security.test.ts`                                                           |
| 15–16 | Secret                      | `.env` di-`.gitignore`; `.env.example` tanpa nilai rahasia; env divalidasi Zod (`AUTH_SECRET` ≥ 32 karakter).                                                       | —                                                                            |
| 17    | Audit log                   | Semua aksi admin penting (soal, paket, review, karakter, banner, user, adjustment, event, settings, upload).                                                        | `economy.test.ts`                                                            |
| 18    | Backup                      | Lihat README → "Backup & restore".                                                                                                                                  | —                                                                            |
| 19    | Privacy-by-default          | `isPublic` default `false`; koleksi tersembunyi kecuali diaktifkan.                                                                                                 | `auth.test.ts`, `profile-leaderboard.test.ts`                                |
| 20    | Data pribadi di leaderboard | Query leaderboard hanya memilih username, avatar, skor, data tie-break; `userId` dibuang.                                                                           | `profile-leaderboard.test.ts`, e2e #7                                        |

## Header keamanan

`next.config.ts`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`.

## Catatan deployment

- `clientIp()` membaca `X-Forwarded-For`. Jalankan aplikasi **di belakang reverse proxy tepercaya** yang menimpa header ini; jika tidak, limit per-IP dapat dielakkan (limit per-email login tetap berlaku).
- Ganti seluruh akun & password DEMO. Seed menolak berjalan saat `NODE_ENV=production` kecuali `ALLOW_DEMO_SEED=1`.
- Rate gacha seed bertanda `DEMO RATE` — tinjau dan matikan flag tersebut di admin sebelum production.
