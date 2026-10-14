# Ruang Survey (versi statis + Supabase)

Situs statis (HTML/CSS/JS) untuk GitHub Pages. Data disimpan di Supabase.

## 1. Siapkan Supabase
1. Buat project di https://supabase.com.
2. **SQL Editor** → New query → tempel seluruh isi `supabase/schema.sql` → **Run** (cukup sekali).
3. **Authentication → Users → Add user**: buat akun admin (email + password, centang *Auto Confirm User*).
4. **Authentication → Sign In / Providers → Email**: **matikan "Allow new users to sign up"**.
   (Wajib. Semua user yang login dianggap admin, jadi pendaftaran terbuka = siapa pun bisa jadi admin.)
5. **Project Settings → API**: salin *Project URL* dan kunci *anon public*.

## 2. Isi konfigurasi
Edit `assets/js/config.js`, ganti dua nilai itu. Kunci `anon` memang publik; keamanan dijaga oleh
Row Level Security di `schema.sql`. **Jangan pernah** memasukkan kunci `service_role`.

## 3. Coba di komputer
```
cd ruang-survey
python -m http.server 8000
```
Buka http://localhost:8000 (halaman admin: `/login.html`).

## 4. Deploy ke GitHub Pages
```
git init && git add . && git commit -m "Ruang Survey"
git branch -M main
git remote add origin https://github.com/USERNAME/ruang-survey.git
git push -u origin main
```
Repo → **Settings → Pages → Deploy from a branch → main / (root)**.
Lalu di Supabase **Authentication → URL Configuration** isi *Site URL*:
`https://USERNAME.github.io/ruang-survey/`.

## Catatan
- Foto galeri dan dokumen artikel diunggah lewat panel admin (masuk ke Supabase Storage), bukan lewat repo.
- Login memakai **email**, bukan username `gody` seperti sebelumnya.
- Nilai "Dampak" sekarang seragam berbahasa Indonesia (Sangat Positif, Positif, Netral, Negatif, Sangat Negatif).
- Bagian "Panduan" di beranda (tabel `panduan`) dihapus karena tidak ada halaman admin untuk mengisinya.
