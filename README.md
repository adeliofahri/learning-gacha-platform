# Learning Gacha Platform

Platform belajar yang memotivasi siswa lewat soal → koin virtual → gacha karakter → leaderboard.
Next.js 15 (App Router) + TypeScript strict + PostgreSQL/Prisma + Tailwind + komponen bergaya shadcn/ui.

> **Tidak ada uang sungguhan.** Koin dan shard adalah mata uang virtual internal yang hanya didapat dari soal, event, atau penyesuaian admin.

Dokumentasi: [Arsitektur](docs/ARCHITECTURE.md) · [Desain database](docs/DATABASE_DESIGN.md) · [Keputusan & asumsi](docs/DECISIONS.md) · [Keamanan](docs/SECURITY.md) · [Rencana implementasi](docs/IMPLEMENTATION_PLAN.md)

## Fitur

- **Siswa**: registrasi/login, dashboard, paket soal (pilihan ganda & isian), progress tersimpan, bounty sekali per soal, wallet + riwayat transaksi, klaim bonus event, gacha (single, 10×, step-up 5 tahap dengan jaminan 6★), rate disclosure, riwayat gacha, koleksi + konversi duplikat ke shard, avatar, profil publik/privat, leaderboard lifetime & bulanan.
- **Admin**: overview, CRUD soal (search/filter/pagination, preview, versi), mapel & topik, paket (urutan soal, anti-duplikat), review jawaban isian, karakter (+upload gambar), banner (rate/weight, featured, harga, step-up, preview, validasi publish, arsip), siswa (wallet, inventory, penyesuaian koin beralasan, suspend), event bonus, pengaturan bounty & shard, audit log.

## Prasyarat

- Node.js ≥ 20.18 (diuji dengan 22) dan **pnpm 10** (`corepack enable`)
- PostgreSQL 16 — via Docker Compose (disarankan) atau instalasi lokal

## Menjalankan secara lokal

```bash
pnpm install
```

```bash
pnpm db:up
```

(menjalankan PostgreSQL di Docker pada port 5432; lewati jika memakai PostgreSQL lokal)

```bash
cp .env.example .env
```

Isi `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learning_gacha?schema=public
AUTH_SECRET=<hasil: openssl rand -base64 48>
APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Jakarta
```

```bash
pnpm db:generate
```

```bash
pnpm db:migrate
```

(production/CI: `pnpm db:deploy`)

```bash
pnpm db:seed
```

```bash
pnpm dev
```

Buka http://localhost:3000.

### Akun DEMO (dibuat oleh seed — hanya untuk development)

| Role                      | Email               | Password       |
| ------------------------- | ------------------- | -------------- |
| Admin                     | `admin@demo.local`  | `DemoAdmin123` |
| Siswa (publik, 3000 koin) | `siswa1@demo.local` | `DemoSiswa123` |
| Siswa (privat, 1500 koin) | `siswa2@demo.local` | `DemoSiswa123` |
| Siswa (publik, 0 koin)    | `siswa3@demo.local` | `DemoSiswa123` |

Password bisa diganti lewat `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD` sebelum seed. Seed juga membuat 12 soal, 4 paket (satu soal muncul di 2 paket), 20 karakter (ilustrasi SVG orisinal di `public/characters`), 3 banner (permanen, limited + step-up, limited yang sudah berakhir) bertanda **DEMO RATE**, dan 2 event.

### Membuat admin tanpa seed

Tidak ada endpoint publik untuk membuat admin. Gunakan CLI lokal:

```bash
ADMIN_EMAIL=guru@sekolah.id ADMIN_USERNAME=guru_admin ADMIN_PASSWORD='GantiPassword123' pnpm admin:create
```

## Kualitas & testing

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm format:check
```

Unit test (fungsi domain murni, tanpa DB):

```bash
pnpm test:unit
```

Integration test (Route Handler asli + PostgreSQL asli). Butuh database bernama `*_test` dan file `.env.test`:

```bash
createdb -U postgres learning_gacha_test
```

```bash
cat > .env.test <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learning_gacha_test?schema=public
AUTH_SECRET=test-secret-test-secret-test-secret-0123456789
APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Jakarta
EOF
```

```bash
pnpm test:integration
```

`pnpm test` menjalankan unit + integration. Test integration menerapkan migrasi (`migrate deploy`) lalu mengosongkan tabel sebelum setiap test — **hanya** pada database yang namanya berakhiran `_test`.

End-to-end (Playwright, build production di port 3100, database `*_e2e` di-seed ulang):

```bash
createdb -U postgres learning_gacha_e2e
```

```bash
pnpm test:e2e
```

Set `E2E_DATABASE_URL` bila URL berbeda dari `postgresql://postgres:postgres@localhost:5432/learning_gacha_e2e`. Bila browser Playwright belum ada: `pnpm exec playwright install chromium`.

Production build:

```bash
pnpm build
```

```bash
pnpm start
```

`pnpm check` menjalankan lint → typecheck → test → build berurutan.

## Script

| Script                                                          | Fungsi                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| `dev` / `build` / `start`                                       | Next.js                                                        |
| `lint`, `typecheck`, `format`, `format:check`                   | Kualitas kode                                                  |
| `db:up`                                                         | PostgreSQL via Docker Compose                                  |
| `db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:reset` | Prisma (`db:reset` menghapus seluruh data dev lalu seed ulang) |
| `admin:create`                                                  | Buat/reset akun admin                                          |
| `test`, `test:unit`, `test:integration`, `test:e2e`             | Testing                                                        |

## Deployment

1. Siapkan PostgreSQL terkelola dan environment variable (`DATABASE_URL`, `AUTH_SECRET` acak ≥32 karakter, `APP_URL` https, `APP_TIMEZONE`). Jangan commit secret.
2. `pnpm install --frozen-lockfile && pnpm db:generate && pnpm build`
3. `pnpm db:deploy` (jangan pakai `db:migrate`/`db:reset` di production).
4. Buat admin dengan `pnpm admin:create`. **Jangan** menjalankan seed DEMO di production (seed menolak kecuali `ALLOW_DEMO_SEED=1`).
5. `pnpm start` di belakang reverse proxy HTTPS tepercaya (cookie `Secure` aktif otomatis saat `NODE_ENV=production`; proxy harus menimpa `X-Forwarded-For`).
6. Tinjau rate setiap banner dan matikan tanda DEMO RATE sebelum dibuka untuk siswa.
7. Upload gambar disimpan di `storage/uploads/characters/` (disajikan lewat `/uploads/characters/<file>`). Pastikan direktori ini persisten (volume) atau ganti ke object storage pada platform serverless.

## Backup & restore

Backup harian (contoh, simpan di luar server aplikasi):

```bash
mkdir -p backups && pg_dump --format=custom --no-owner "$DATABASE_URL" > backups/learning_gacha_$(date +%F).dump
```

Restore ke database kosong:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backups/learning_gacha_2026-01-01.dump
```

Dengan Docker Compose:

```bash
docker compose exec -T db pg_dump -U postgres --format=custom learning_gacha > backups/learning_gacha_$(date +%F).dump
```

Sertakan juga `storage/uploads/` dalam backup. Uji restore secara berkala di environment terpisah.

## Struktur folder

```
prisma/            schema.prisma, migrations/, seed.ts (DEMO)
public/characters/ ilustrasi karakter SVG (dibuat scripts/generate-character-art.py)
scripts/           create-admin.ts, generate-character-art.py
src/app/           (public) landing/leaderboard/profil · (auth) login/register · (student) area siswa · admin/ · api/
src/components/    ui/ (shadcn-style), layout/, learning/, gacha/, leaderboard/, admin/, shared/
src/lib/           auth/, db/, validation/ (Zod), env, http, rate-limit, constants, utils
src/server/        domain/ (fungsi murni) · services/ (aturan bisnis + transaksi) · repositories/ · policies/ (RBAC)
tests/             unit/ · integration/ · e2e/
docs/              dokumen desain & keamanan
```
