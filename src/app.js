const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Bukti bayar bisa dibuka lewat http://localhost:3000/uploads/bukti/namafile.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Halaman web (frontend) dilayani dari folder public
app.use(express.static(path.join(__dirname, '../public')));
app.get('/api/health', (req, res) => res.json({ message: 'API Sewa Peralatan Camping berjalan' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/alat', require('./routes/alat.routes'));
app.use('/api/pemesanan', require('./routes/pemesanan.routes'));
app.use('/api/pembayaran', require('./routes/pembayaran.routes'));
app.use('/api/pengembalian', require('./routes/pengembalian.routes'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' }));
app.use((err, req, res, next) => {
  if (err.message === 'FORMAT_SALAH') return res.status(400).json({ success: false, message: 'File harus berupa gambar JPG, PNG, atau WEBP' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'Ukuran file maksimal 2 MB' });
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

module.exports = app;
