# 🗺️ Dummy GIS Dashboard - WebGIS Framework Testing

Proyek ini adalah *Proof of Concept* (PoC) untuk menguji dan membandingkan performa berbagai *framework* WebGIS modern (**Leaflet, MapLibre GL JS, OpenLayers, dan deck.gl**) dalam merender data spasial masif secara independen.

Proyek ini dibangun menggunakan **Next.js (App Router)** di sisi *frontend* dan **PostgreSQL + PostGIS** di sisi *backend* sebagai penyedia data API (GeoJSON).

---

## 🛠️ Prasyarat (Prerequisites)
Sebelum menjalankan proyek ini, pastikan laptop Anda sudah terinstal perangkat lunak berikut:
1. **Node.js** (versi 18.x atau terbaru)
2. **PostgreSQL** (versi 12+)
3. **PostGIS** (Ekstensi spasial untuk PostgreSQL)
4. **pgAdmin 4** (Untuk manajemen database)
5. **Git**

---

## 🚀 Cara Instalasi & Konfigurasi Lokal

Ikuti langkah-langkah di bawah ini secara berurutan agar aplikasi dapat berjalan tanpa *error* di komputer Anda.

### 1. Clone Repository & Install Dependencies
Buka terminal/command prompt, lalu jalankan:
```bash
git clone <URL_GITHUB_REPOSITORY_ANDA_DISINI>
cd dummy-gis-dashboard
npm install
```

### 2. Konfigurasi Environment Variables (.env)
Aplikasi ini membutuhkan koneksi ke database lokal.

1. Buat file baru bernama `.env` di folder paling luar (sejajar dengan `package.json`).
2. **Jangan commit file ini ke GitHub!**
3. Isi dengan kredensial PostgreSQL di laptop Anda masing-masing:

```bash
DB_USER=postgres
DB_PASSWORD=masukkan_password_pgadmin_kamu_disini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_bencana_dummy
```

### 3. Setup Database Spasial (PostGIS)
1. Buka aplikasi **pgAdmin 4** dan login.
2. Buat database kosong baru: Klik kanan **Databases** -> **Create** -> **Database...** -> Beri nama `db_bencana_dummy`.
3. Aktifkan mode spasial: Buka **Query Tool** di database tersebut, ketik dan jalankan perintah ini:

```SQL
CREATE EXTENSION postgis;
```
4. **Restore Data:**
   * Minta file `backup_bencana.sql` (atau format `.backup`) dari pembuat repository (via Google Drive atau folder `db_backup` jika disertakan).
   * Klik kanan pada database `db_bencana_dummy` -> Pilih **Restore...**
   * Cari file backup tersebut, lalu klik tombol **Restore**.
   * Tunggu hingga notifikasi **Restore completed** muncul.

### 4. Jalankan Aplikasi (Development Server)
Setelah database terisi dan `.env` terkonfigurasi, jalankan server Next.js:

```bash
npm run dev
```
Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

---

## 🔗 Struktur Routing (Endpoint & Halaman)
### API Routes (Backend Data GeoJSON)
Anda bisa mengecek apakah database sudah terkoneksi dengan membuka link berikut di browser:
* Data Bangunan: [http://localhost:3000/api/bangunan](http://localhost:3000/api/bangunan)
* Data Rumah Sakit: [http://localhost:3000/api/rumahsakit](http://localhost:3000/api/rumahsakit)
* Data Sungai: [http://localhost:3000/api/sungai](http://localhost:3000/api/sungai)
* Data Area Terdampak: [http://localhost:3000/api/area-terdampak](http://localhost:3000/api/area-terdampak)
