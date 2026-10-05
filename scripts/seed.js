// Mengisi akun admin dan beberapa alat contoh. Aman dijalankan berulang.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

(async () => {
  const [r] = await db.query("SELECT id_role FROM roles WHERE nama_role = 'admin'");
  if (!r.length) throw new Error('Role admin belum ada. Import schema_sewa_camping.sql dulu.');
  const email = 'admin@camping.local';
  const [u] = await db.query('SELECT id_user FROM users WHERE email = ?', [email]);
  if (!u.length) {
    await db.query('INSERT INTO users (id_role, nama, email, password) VALUES (?, ?, ?, ?)',
      [r[0].id_role, 'Admin', email, await bcrypt.hash('admin123', 10)]);
  }
  const [c] = await db.query('SELECT COUNT(*) AS n FROM alat');
  if (!c[0].n) {
    await db.query('INSERT INTO alat (nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok) VALUES ?', [[
      ['Tenda Dome 4 Orang', 'Tenda', 'Anti air, mudah dipasang', 50000, 3],
      ['Sleeping Bag', 'Tidur', 'Hangat sampai 10 derajat', 15000, 10],
      ['Kompor Portable', 'Masak', 'Pakai gas kaleng', 20000, 5],
      ['Carrier 60L', 'Tas', 'Punggung berventilasi', 30000, 4],
    ]]);
  }
  console.log('Selesai. Login admin: admin@camping.local / admin123');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
