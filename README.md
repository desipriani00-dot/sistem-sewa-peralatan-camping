# Sewa Peralatan Camping (MVP tahap 1 sampai rilis akhir, sudah digabung)

Isi: katalog dengan filter, pesanan dengan cek stok anti-bentrok, upload bukti bayar, verifikasi admin,
serah terima dan pengembalian, invoice PDF dengan QR code, dan halaman web (folder `public`).

## Cara menjalankan (sekali setup)
1. Nyalakan MySQL di XAMPP. Di phpMyAdmin, import file `schema_sewa_camping.sql` milikmu.
2. Buka folder ini di VS Code, lalu buka Terminal dan ketik: `npm install`
3. Salin `.env.example` menjadi `.env`. Kalau MySQL-mu tanpa password, isi tidak perlu diubah selain `JWT_SECRET`.
4. Ketik: `npm run seed` (membuat akun admin dan 4 alat contoh)
5. Ketik: `npm start`, lalu buka http://localhost:3000

Login admin: `admin@camping.local` / `admin123`. Pelanggan mendaftar sendiri lewat tombol Masuk, lalu Daftar.

## Urutan mencoba
Pelanggan: Katalog, Tambah ke keranjang, isi tanggal, Pesan, kirim bukti bayar.
Admin: tab Pembayaran (Terima), tab Pesanan (Serahkan, lalu Kembalikan). Pelanggan lalu bisa unduh Invoice PDF.

## Catatan
Kode disesuaikan dengan `schema_sewa_camping.sql` (7 tabel). Foto bukti tersimpan di folder `uploads` (otomatis dibuat).
Ubah data alat lewat API (`PUT /api/alat/:id`). Di halaman admin baru tersedia tambah dan hapus alat.
