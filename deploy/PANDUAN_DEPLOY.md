# Panduan Deploy — Vercel + Neon (gratis)

Panduan ini untuk orang yang **belum pernah deploy Next.js**. Total waktu ± 30–45 menit.
Kamu **tidak perlu** menginstal Node.js, pnpm, atau PostgreSQL di komputer sendiri.

---

## 0. Kenapa bukan InfinityFree?

InfinityFree (paket gratis) hanya menjalankan **PHP + MySQL**. Aplikasi ini dibuat dengan
**Next.js (Node.js) + PostgreSQL**, jadi tidak bisa berjalan di sana: file yang di-upload ke `htdocs`
tidak akan pernah dieksekusi.

Penggantinya, yang juga gratis:

| Kebutuhan       | Layanan                  | Fungsi                                                        |
| --------------- | ------------------------ | ------------------------------------------------------------- |
| Server aplikasi | **Vercel** (paket Hobby) | Menjalankan Next.js, HTTPS otomatis, domain `nama.vercel.app` |
| Database        | **Neon** (paket Free)    | PostgreSQL di cloud                                           |
| Tempat kode     | **GitHub**               | Vercel mengambil kode dari sini dan deploy otomatis           |

> Domain sendiri (mis. yang kamu pakai di InfinityFree) tetap bisa dipasang ke Vercel nanti
> (Langkah 7), asalkan kamu bisa mengatur DNS domain tersebut.

---

## 1. Siapkan akun (sekali saja)

1. **GitHub** — https://github.com/signup
2. **Vercel** — https://vercel.com/signup → pilih **Continue with GitHub** (paling mudah).
3. **Neon** — https://neon.tech → **Sign up** (boleh pakai akun GitHub juga).
4. **GitHub Desktop** (agar tidak perlu command line) — https://desktop.github.com

---

## 2. Buat database di Neon

1. Di Neon Console klik **New Project**.
   - **Project name:** `learning-gacha`
   - **Postgres version:** biarkan default (16 atau 17, keduanya cocok)
   - **Region:** **AWS Asia Pacific (Singapore)** ← paling dekat dengan Indonesia dan dengan server Vercel (`sin1`)
   - Klik **Create project**.
2. Di dashboard project, klik tombol **Connect** (atau **Connection Details**).
3. Kamu butuh **DUA** connection string. Simpan sementara di Notepad:

   **a. Pooled (untuk aplikasi) → nanti jadi `DATABASE_URL`**
   - Pastikan opsi **Connection pooling** **AKTIF**. Host-nya mengandung kata **`-pooler`**.
   - Contoh bentuknya:
     ```
     postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
   - **Tambahkan** di akhir: `&pgbouncer=true&connect_timeout=15`
     ```
     postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15
     ```
     (Kalau string dari Neon mengandung `&channel_binding=require`, boleh dibiarkan.)

   **b. Direct (untuk migrasi tabel) → nanti jadi `DIRECT_URL`**
   - **Matikan** opsi **Connection pooling**. Host-nya **tanpa** `-pooler`.
     ```
     postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```

> ⚠️ Connection string berisi password database. Jangan dibagikan atau di-commit ke GitHub.

---

## 3. Upload kode ke GitHub

1. Ekstrak `learning-gacha-platform.zip`. Hasilnya folder `learning-gacha-platform`.
   (Folder ini sudah berisi riwayat git, file `.env` **tidak** ikut, jadi aman.)
2. Buka **GitHub Desktop** → **File → Add local repository…** → pilih folder `learning-gacha-platform` → **Add repository**.
3. Klik **Publish repository**.
   - Name: `learning-gacha-platform`
   - Centang **Keep this code private** (disarankan).
   - Klik **Publish repository**.

<details>
<summary>Alternatif: lewat command line (jika kamu terbiasa git)</summary>

Buat repo kosong di github.com, lalu di dalam folder proyek:

```bash
git remote add origin https://github.com/USERNAME/learning-gacha-platform.git
```

```bash
git push -u origin main
```

</details>

---

## 4. Buat secret untuk login (`AUTH_SECRET`)

Perlu teks acak minimal 32 karakter. Pilih salah satu:

- Buka https://generate-secret.vercel.app/32 → salin hasilnya, **atau**
- Jika punya terminal: `openssl rand -base64 48`

Simpan di Notepad bersama connection string tadi. Jangan pernah membagikannya.

---

## 5. Deploy di Vercel

1. Di https://vercel.com/new → bagian **Import Git Repository** → pilih `learning-gacha-platform` → **Import**.
   (Jika repo tidak muncul: **Adjust GitHub App Permissions** → izinkan repo tersebut.)
2. **Framework Preset:** Next.js (terdeteksi otomatis).
   **Build/Install Command:** biarkan — sudah diatur oleh `vercel.json`
   (`pnpm vercel-build` = generate Prisma → **buat/migrasi tabel di Neon** → build).
3. Buka **Environment Variables**, tambahkan satu per satu:

   | Name                           | Value                                                                                          |
   | ------------------------------ | ---------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`                 | connection string **Pooled** (Langkah 2a, sudah ditambah `&pgbouncer=true&connect_timeout=15`) |
   | `DIRECT_URL`                   | connection string **Direct** (Langkah 2b)                                                      |
   | `AUTH_SECRET`                  | hasil Langkah 4                                                                                |
   | `APP_TIMEZONE`                 | `Asia/Jakarta`                                                                                 |
   | `APP_URL`                      | `https://learning-gacha-platform.vercel.app` (perkiraan; perbarui setelah tahu domain aslinya) |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (agar Vercel memakai versi pnpm yang sama dengan proyek)                                   |

4. Klik **Deploy**. Tunggu ± 2–4 menit.
   Di log build akan muncul `All migrations have been successfully applied.`, artinya **semua tabel sudah dibuat otomatis di Neon**.
5. Setelah selesai, klik **Continue to Dashboard** → catat domainnya (mis. `learning-gacha-platform-abc.vercel.app`).
   Jika berbeda dari `APP_URL` tadi: **Settings → Environment Variables** → ubah `APP_URL` → **Deployments → ⋯ → Redeploy**.

Website sudah online, tapi database masih kosong (belum ada admin, soal, maupun karakter). Lanjut ke Langkah 6.

---

## 6. Isi database (admin, soal, karakter, banner)

1. Buka file **`deploy/seed-demo.sql`** dengan Notepad → **Ctrl+A**, **Ctrl+C**.
2. Di Neon Console → project `learning-gacha` → menu **SQL Editor**.
   Pastikan database yang dipilih di atas editor adalah **`neondb`**.
3. Tempel (**Ctrl+V**) seluruh isi file → klik **Run**.
   Selesai jika tidak ada pesan error (± 200 baris `INSERT`).
   - Jangan dijalankan dua kali. Kalau tidak sengaja, akan muncul error `duplicate key` dan **tidak ada data yang berubah** (aman).
   - Jika muncul `relation "User" does not exist`: Langkah 5 belum sukses (tabel belum dibuat). Cek log build Vercel.

Data yang masuk:

| Akun       | Email                                                         | Password awal  |
| ---------- | ------------------------------------------------------------- | -------------- |
| Admin      | `admin@demo.local`                                            | `DemoAdmin123` |
| Siswa demo | `siswa1@demo.local`, `siswa2@demo.local`, `siswa3@demo.local` | `DemoSiswa123` |

Ditambah 12 soal, 4 paket, 20 karakter, 3 banner (bertanda **DEMO RATE**), dan 2 event.

---

## 7. Wajib setelah online

1. Buka website → **Masuk** sebagai `admin@demo.local`.
2. Menu **Akun saya** → **ganti password admin**. Password demo tercantum di dokumen ini, jadi siapa pun bisa menebaknya.
3. Menu **Siswa** → akun `siswa_demo1..3` boleh **ditangguhkan** jika tidak dipakai (password mereka juga publik).
4. Menu **Banner gacha** → tinjau peluang setiap banner → hilangkan centang **DEMO RATE** setelah kamu setujui.
5. Banner limited demo berakhir ± 30 hari setelah file SQL dibuat. Ubah tanggalnya di menu **Banner gacha** bila perlu, begitu juga tanggal di menu **Event**.
6. (Opsional) **Domain sendiri:** Vercel → project → **Settings → Domains** → masukkan domain → ikuti instruksi DNS (record `A`/`CNAME`). Lalu perbarui `APP_URL` dan redeploy.

Siswa baru mendaftar sendiri lewat tombol **Daftar** di website.

---

## 8. Update aplikasi ke depannya

Ubah kode → **commit** & **push** dengan GitHub Desktop → Vercel otomatis build ulang.
Jika ada migration database baru (folder `prisma/migrations`), tabel di Neon ikut diperbarui otomatis saat build.

---

## 9. Backup database

- Neon Free menyimpan riwayat perubahan (point-in-time restore) untuk periode singkat. Lihat menu **Branches/Restore** di Neon Console.
- Backup manual (butuh PostgreSQL client di komputer):
  ```bash
  pg_dump --format=custom --no-owner "DIRECT_URL_KAMU" > learning_gacha_backup.dump
  ```
  Gambar karakter yang di-upload admin tersimpan **di database** (tabel `UploadedImage`), jadi ikut ter-backup.

---

## 10. Masalah umum

| Gejala                                                          | Penyebab & solusi                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Build gagal: `P1001 Can't reach database server`                | `DIRECT_URL` salah atau Neon project sedang dihapus. Salin ulang dari Neon (pooling **mati**).      |
| Build gagal: `P1012 Environment variable not found: DIRECT_URL` | Variabel `DIRECT_URL` belum ditambahkan di Vercel.                                                  |
| Build gagal: `Konfigurasi environment tidak valid: AUTH_SECRET` | `AUTH_SECRET` kosong atau kurang dari 32 karakter.                                                  |
| Halaman error 500 setelah deploy                                | Cek **Vercel → Deployments → Functions/Logs**. Umumnya `DATABASE_URL` salah (harus yang `-pooler`). |
| Akses pertama lambat (± 1–3 detik)                              | Normal di paket gratis: database Neon "tidur" saat tidak dipakai lalu bangun lagi.                  |
| Login selalu "Email atau password salah"                        | `seed-demo.sql` belum dijalankan (Langkah 6).                                                       |
| "Terlalu banyak percobaan"                                      | Rate limit login (10× per 15 menit). Tunggu sebentar.                                               |

---

## Batasan paket gratis (perlu diketahui)

- **Neon Free:** penyimpanan kecil (± 0,5 GB). Cukup untuk ribuan siswa, tetapi batasi upload gambar besar.
- **Vercel Hobby:** untuk penggunaan non-komersial. Untuk sekolah/lembaga berbayar, pertimbangkan paket Pro.
- Limit dan harga dapat berubah. Cek halaman pricing Vercel dan Neon.
