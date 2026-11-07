# Decisions & Assumptions

Format: **D-xx — Keputusan.** Alasan.

## Dari spesifikasi bagian R (default yang dipakai)

- **D-01 — Bahasa UI: Bahasa Indonesia.**
- **D-02 — Timezone: `Asia/Jakarta`** via `APP_TIMEZONE`.
- **D-03 — Harga demo:** single 100, ten-pull 900, step-up 100/150/200/250/300.
- **D-04 — Bounty demo:** EASY 5, MEDIUM 10, HARD 20, EXPERT 35 (tabel `DifficultyConfig`, dapat diubah admin di _Pengaturan_).
- **D-05 — Shard duplikat demo:** 1★1, 2★2, 3★5, 4★10, 5★25, 6★50 (tabel `DuplicateShardConfig`).
- **D-06 — Step-up tahap 5 menjamin minimal satu 6★, tidak otomatis featured.** Opsi terpisah `stepUpGuaranteeFeatured` pada banner bila admin ingin menjamin featured 6★.
- **D-07 — Step-up reset ke tahap 1 setelah tahap 5** (`cyclesCompleted` bertambah).
- **D-08 — Leaderboard bulanan** = SUM(rarity) karakter unik dengan `firstObtainedAt` di bulan itu (zona `APP_TIMEZONE`).
- **D-09 — Leaderboard lifetime** = SUM(rarity) karakter unik dengan quantity > 0.
- **D-10 — Tie-break:** (1) jumlah soal unik solved pada periode terkait (lifetime: seluruh waktu; bulanan: `solvedAt` di bulan itu), (2) waktu skor tercapai = `MAX(firstObtainedAt)` dari karakter yang dihitung — lebih awal menang, (3) username (deterministik).
- **D-11 — Tidak ada pembayaran uang asli.** Koin hanya dari soal, event, dan penyesuaian admin.
- **D-12 — Rate gacha seed ditandai `DEMO RATE`** (`Banner.isDemoRate = true`) dan wajib ditinjau admin sebelum production.
- **D-13 — Profil privat secara default** (`isPublic = false`).
- **D-14 — Karakter ARCHIVED tetap tampil di inventory** dan tetap boleh dipakai sebagai avatar; tidak muncul untuk banner baru.
- **D-15 — Banner berakhir di tengah step-up:** pull ditolak, progress & histori tetap tersimpan, UI menampilkan "Siklus berakhir".

## Keputusan teknis tambahan

- **D-20 — Autentikasi custom berbasis sesi database** (bukan Auth.js). Spesifikasi mengizinkan "solusi autentikasi yang kompatibel dengan Next.js App Router". Alasan: Auth.js v5 Credentials provider memaksa JWT session & masih beta; sesi DB memudahkan revoke, logout nyata, dan integration test terhadap Route Handler asli.
- **D-21 — Argon2id via `@node-rs/argon2`** (binary prebuilt, tanpa toolchain native).
- **D-22 — Versi paket:** Next 15.5, React 19, Prisma 6, Zod 3, Tailwind 4, Vitest 3, Playwright 1.63 — versi stabil yang matang.
- **D-23 — Rate model gacha = weight per karakter.** Peluang karakter = weight / total weight banner. UI menampilkan peluang per karakter dan agregat per rarity.
- **D-24 — Ten-pull price diturunkan = 9 × singlePrice** (tidak disimpan terpisah) agar aturan "harga sama dengan 9 kali SINGLE" tidak bisa dilanggar.
- **D-25 — Jumlah hasil per tahap step-up dapat dikonfigurasi (`pullCount`, 1–10), seed = 1 per tahap.** Jaminan 6★: jika tidak ada 6★ di hasil tahap 5, hasil terakhir diganti roll berbobot dari pool 6★ banner (atau featured 6★ jika `stepUpGuaranteeFeatured`). Hasil pengganti ditandai `isGuaranteed`.
- **D-26 — Step-up hanya untuk banner LIMITED** (validasi publish & service).
- **D-27 — Validasi publish banner:** minimal 1 karakter aktif, semua weight > 0, LIMITED wajib `startsAt < endsAt`, step-up wajib 5 tahap berharga > 0 dan minimal satu karakter 6★ (featured 6★ jika guarantee featured).
- **D-28 — Inventory menyimpan `quantity = 1` untuk karakter dimiliki; duplikat dicatat di `duplicateCount` & `shardsFromDuplicates`** serta di `GachaResult.shardsAwarded` + `WalletTransaction(DUPLICATE_CONVERSION)` sebagai riwayat konversi.
- **D-29 — Jawaban isian tidak dinilai otomatis.** Variasi jawaban acuan hanya ditampilkan ke admin saat review (dengan indikator "cocok dengan acuan").
- **D-30 — Satu attempt isian PENDING per soal per siswa.** Pengiriman baru ditolak sampai admin memutuskan.
- **D-31 — Pembahasan (explanation) tampil setelah soal SOLVED** atau setelah jawaban isian diputuskan; kunci pilihan ganda hanya dikirim di response setelah attempt dinilai benar.
- **D-32 — Edit soal yang sudah punya attempt menaikkan `version`.** Attempt menyimpan snapshot; soal dengan histori tidak bisa dihapus, hanya ARCHIVED. Bounty yang diubah tidak memberi reward ulang (unique solve).
- **D-33 — Leaderboard menampilkan semua siswa aktif hanya dengan username, avatar, skor** (sesuai J.4). Koleksi pada profil publik hanya terlihat jika `isPublic = true`.
- **D-34 — Event bonus:** reward koin tetap, rentang waktu wajib, satu klaim per siswa (unique), `maxClaims` global opsional (dikunci `SELECT … FOR UPDATE`), syarat `minSolved` opsional.
- **D-35 — Rate limiting berbasis tabel PostgreSQL** (tanpa Redis).
- **D-36 — Admin tidak memiliki wallet/inventory;** fitur siswa hanya untuk role STUDENT.
- **D-37 — TanStack Table tidak dipakai.** Tabel admin cukup dengan tabel HTML + pagination server-side; mengurangi dependency (spesifikasi: "jika diperlukan").
- **D-38 — Komponen shadcn/ui ditulis langsung di `src/components/ui`** (pola shadcn: Radix + cva + tailwind-merge) karena CLI shadcn butuh akses jaringan interaktif.
- **D-39 — Docker daemon tidak tersedia di environment build ini;** `docker-compose.yml` disediakan untuk lokal, test dijalankan dengan PostgreSQL 16 native.
- **D-40 — Status siswa SUSPENDED** tidak bisa login dan sesi aktifnya ditolak.
- **D-41 — Latihan isian setelah SOLVED dicek otomatis terhadap jawaban acuan** (tanpa review, tanpa reward, `isPractice = true`). Jawaban acuan boleh ditampilkan karena keputusan admin sudah ada.
- **D-42 — Koleksi awal akun DEMO diisi langsung oleh seed** (bukan lewat gacha) agar leaderboard demo tidak kosong; sumbernya dicatat di audit log `SEED_INVENTORY`. Semua perolehan non-seed berasal dari `GachaResult`.
- **D-43 — Middleware melakukan redirect cepat ke `/login` jika cookie sesi tidak ada** pada halaman terproteksi (agar respons 307, bukan 200 + redirect klien). Validasi sesi & role sebenarnya tetap di server.
- **D-44 — Upload disimpan di `storage/uploads/characters/`** dan disajikan oleh Route Handler, karena `next start` hanya menyajikan file `public/` yang ada saat build.
- **D-45 — Test integration & E2E tidak memakai `prisma migrate reset`.** Global setup menjalankan `migrate deploy` lalu TRUNCATE data, dengan guard nama database (`*_test` / `*_e2e`). Prisma CLI juga sengaja memblokir `migrate reset` saat dijalankan oleh agen AI.
- **D-46 — Rarity karakter terkunci setelah dimiliki siswa** agar skor leaderboard historis tetap konsisten.
- **D-47 — `X-Forwarded-For` dipercaya untuk rate limit per-IP**; wajib di belakang reverse proxy tepercaya (lihat SECURITY.md). Login juga dibatasi per email.
- **D-48 — Tidak ada `loading.tsx` di root.** Ditemukan lewat E2E: kombinasi `loading.tsx` root + prefetch parsial halaman dinamis di Next 15.5 membuat sebagian navigasi klien tidak pernah selesai (~30% dalam uji berulang; 0% setelah dihapus). State loading ditangani di level komponen (tombol "Memproses…", form disabled) dan prefetch link aktif dimatikan.
- **D-49 — UI memakai hasil yang dikonfirmasi server secara langsung** (status soal, saldo via event `wallet:update`, tahap step-up, item review) di samping `router.refresh()`, agar tampilan tidak bergantung pada urutan refresh vs prefetch. Nilai yang ditampilkan selalu berasal dari respons server, bukan dihitung klien.
