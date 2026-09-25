# Backend / API Sewa Peralatan Camping

Node.js + Express 5 + MySQL (mysql2), autentikasi JWT.

## Menjalankan
1. Import `schema_sewa_camping.sql` ke MySQL.
2. `cp .env.example .env` lalu isi kredensial DB dan `JWT_SECRET`.
3. `npm install`
4. `npm run dev`  ->  http://localhost:3000/api/health

## Membuat akun admin
Registrasi lewat API selalu berrole `pelanggan`. Untuk admin, daftar dulu lalu ubah di DB:
    UPDATE users SET id_role = (SELECT id_role FROM roles WHERE nama_role='admin') WHERE email='admin@contoh.com';

## Endpoint
| Method | Path | Akses |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | publik |
| GET | /api/auth/me | login |
| GET | /api/alat, /api/alat/:id | publik (?q=&kategori=&page=&limit=) |
| POST/PUT/DELETE | /api/alat(/:id) | admin |
| POST | /api/pemesanan | pelanggan |
| GET | /api/pemesanan, /api/pemesanan/:id | login (pelanggan hanya miliknya) |
| PATCH | /api/pemesanan/:id/status | admin (dipinjam / dibatalkan) |
| POST | /api/pembayaran | pelanggan |
| PATCH | /api/pembayaran/:id/verifikasi | admin (berhasil / ditolak) |
| POST | /api/pengembalian | admin |

## Alur status pemesanan
menunggu -> (pembayaran diverifikasi lunas) dibayar -> (admin) dipinjam -> (pengembalian dicatat) selesai
Pembatalan oleh admin dari status menunggu/dibayar/dipinjam mengembalikan stok.

## Struktur
src/config (db) | middleware (auth, validate, errorHandler) | routes | controllers | services (transaksi pemesanan & pengembalian)
