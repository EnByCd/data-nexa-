# Paket Data Real NEXA (pintu air BPBD + peringatan dini BMKG)

Mengganti data dummy `bpbd_posts` dan `bmkg_forecast` di `server/db.js` dengan data asli, diperbarui otomatis tiap 10 menit. Route yang sudah ada tidak perlu diubah.

## Isi paket
| File | Fungsi |
|---|---|
| `server/liveData.js` | Penyambung ke `db.js` (mengisi `db.data.bpbd_posts` dan `bmkg_forecast.active_warning`) |
| `server/services/pintuAir.js` | Mengambil tabel TMA dari https://bpbd.jakarta.go.id/waterlevel (sumber: Dinas SDA DKI) |
| `server/services/bmkgCap.js` | Mengambil CAP XML resmi dari https://www.bmkg.go.id/alerts/nowcast/id (tanpa API key) |
| `server/services/ambang.js` | Ambang Siaga I/II/III per pintu air dari `POST /api/charttma` (cache 24 jam, 12 request/hari) |
| `server/check-live.js` | Skrip cek: apakah server ini bisa mengambil data real |
| `server/services/test.js` | Tes otomatis offline (parser + integrasi, pakai fetch palsu) |

Syarat: **Node 18+** (pakai `fetch` bawaan), proyek ES module (sudah, karena `db.js` memakai `import`). Tanpa dependensi baru.

## Langkah sambung (±10 menit)
1. Salin isi folder `server/` paket ini ke `server/` proyek (`liveData.js` sejajar dengan `db.js`, folder `services/` di sebelahnya).
2. Di `server/db.js`, **hapus semua dari baris `  reports: [` sampai `};` penutup `INITIAL_DATA`**, lalu ganti dengan isi `GANTI_SEED_DB.txt`.
3. Di `server/db.js`: tambahkan di import paling atas
   `import { startLiveData } from './liveData.js';`
   dan sebagai baris terakhir file (setelah `export const db = new Database();`):
   `startLiveData(db);`
4. **Hapus `server/data/nexa.db.json`** lalu restart server. (Penting: file ini dibaca lebih dulu daripada `INITIAL_DATA`, jadi tanpa dihapus seed lama tetap muncul.)

## Verifikasi
1. `node server/services/test.js` harus mencetak `SEMUA TES LOLOS`.
2. `node server/check-live.js` dijalankan **di server/mesin tempat aplikasi berjalan**. Harus muncul 6 pintu air (default; 12 jika `PINTU_AIR_WATCH=all`) dan status BMKG.
3. Jalankan server, log harus menampilkan `[LIVE] pintu air: OK | BMKG: OK`.
4. Cocokkan 3-4 angka di dashboard dengan https://bpbd.jakarta.go.id/waterlevel (jam terbaru ada di kolom paling kiri).
5. Status kedua sumber ada di `db.data.live_status`.

## Jika bermasalah
| Gejala | Penyebab / solusi |
|---|---|
| `HTTP 403` atau "Header tabel TMA tidak ditemukan" | Server diblokir proteksi bot (Cloudflare) milik BPBD. Coba dari hosting lain, atau ajukan data resmi lewat menu Kontak > Permohonan Data di bpbd.jakarta.go.id. |
| Dashboard masih menampilkan Katulampa 95 cm / Manggarai 785 cm | Langkah 2 atau 4 belum dilakukan (seed lama / `nexa.db.json` masih ada). |
| `bpbd_posts` kosong | Lihat `db.data.live_status.pintu_air.error`. Data kosong = sumber gagal, **bukan** tidak ada data. Jangan diganti angka cadangan. |
| Peringatan BMKG tidak tampil | `active_warning.unavailable: true` berarti pengambilan gagal (bukan berarti aman). `is_active: false` tanpa `unavailable` berarti memang tidak ada peringatan aktif. |
| Pakai Supabase, data contoh lama masih ada | Data cloud tidak ikut terhapus. Bersihkan lewat SQL (`DELETE FROM hazard_reports; ...`). |

## Catatan penting
- Ambang siaga (`siaga3_limit_cm`, `siaga2_limit_cm`, `siaga1_limit_cm`) kini berisi angka resmi dari BPBD (contoh Katulampa: 80/150/200 cm; seed lama 81/151/201 salah). Nilainya adalah batas yang dipublikasikan BPBD apa adanya. `safe_limit_cm` dan `flow_destination` sengaja `null` (tidak ada di sumber, tidak dikarang); sesuaikan UI jika menampilkannya. Status siaga tetap diambil dari sumber, bukan dihitung ulang.
- `bmkg_forecast.intervals/station/current_condition` dikosongkan (isi lamanya dummy). Jika cuaca per jam datang dari Open-Meteo, pastikan route yang mengisinya tetap berjalan.
- **Pos yang dipantau** default hanya 6: Katulampa, Depok, Manggarai, Karet, Sunter Hulu, Pasar Ikan (sesuai `areas[].monitoring_post` di `db.js`). Untuk mengubah, set env `PINTU_AIR_WATCH="katulampa,manggarai,..."` (cocok sebagian nama, huruf besar/kecil bebas), atau `PINTU_AIR_WATCH=all` untuk semua 12 pos BPBD.
- Id pos lama dipertahankan (`pos-katulampa`, `pos-manggarai`, `pos-karet`, `pos-sunter-hulu`, `pos-pasar-ikan`); pos lain ditambahkan otomatis sesuai daftar di atas.
- Data `users` dan `areas` di seed masih akun/lokasi **fiktif** (termasuk `telegram_chat_id` palsu). Ganti lewat pendaftaran RT asli sebelum dipakai sungguhan.
- Jangan polling lebih sering dari 10 menit (halaman sumber memperbarui per jam dan me-refresh tiap 15 menit). Cantumkan sumber "BPBD DKI Jakarta / Dinas SDA DKI" dan "BMKG" di aplikasi.
- Scraper bergantung pada struktur HTML BPBD. Jika BPBD mengubah halamannya, fungsi akan melempar error yang jelas, tidak mengembalikan angka salah.
