require('dotenv').config();
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('Koneksi MySQL berhasil');
    app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
  } catch (err) {
    console.error('Gagal konek ke database:', err.message);
    process.exit(1);
  }
})();
