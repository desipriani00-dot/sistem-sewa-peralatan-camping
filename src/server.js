require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const port = process.env.PORT || 3000;

(async () => {
  try {
    await pool.query('SELECT 1'); // cek koneksi database
    app.listen(port, () => console.log(`API berjalan di http://localhost:${port}/api`));
  } catch (err) {
    console.error('Gagal terhubung ke database:', err.message);
    process.exit(1);
  }
})();
