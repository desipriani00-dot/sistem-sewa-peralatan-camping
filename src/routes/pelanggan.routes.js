const router = require('express').Router();
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Daftar semua pelanggan (role dicari lewat nama, bukan angka 2)
router.get('/', verifyToken, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_user, u.nama, u.email, u.nomor_ktp, u.foto_ktp, u.status_verifikasi_ktp
       FROM users u
       JOIN roles r ON r.id_role = u.id_role
       WHERE r.nama_role = 'pelanggan'
       ORDER BY u.id_user DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;