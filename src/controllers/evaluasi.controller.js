
const db = require('../config/db');
const { success, fail } = require('../utils/response');

// Pelanggan memberikan rating setelah penyewaan selesai
exports.buat = async (req, res) => {
  try {
    const id_user = req.user.id;
    const { id_pemesanan, rating, ulasan } = req.body;

    if (!id_pemesanan || !Number.isInteger(Number(rating)) ||
        Number(rating) < 1 || Number(rating) > 5) {
      return fail(res, 'ID pesanan dan rating 1–5 wajib diisi');
    }

    const [[pesanan]] = await db.query(
      `SELECT id_pemesanan, id_user, status_pemesanan
       FROM pemesanan WHERE id_pemesanan = ?`,
      [id_pemesanan]
    );

    if (!pesanan) return fail(res, 'Pesanan tidak ditemukan', 404);
    if (Number(pesanan.id_user) !== Number(id_user)) {
      return fail(res, 'Pesanan ini bukan milik kamu', 403);
    }
    if (pesanan.status_pemesanan !== 'selesai') {
      return fail(res, 'Rating hanya bisa diberikan setelah alat dikembalikan');
    }

    await db.query(
      `INSERT INTO evaluasi
       (id_pemesanan, id_user, rating, ulasan)
       VALUES (?, ?, ?, ?)`,
      [id_pemesanan, id_user, Number(rating), ulasan || null]
    );

    return success(res, null, 'Rating berhasil dikirim', 201);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Pesanan ini sudah diberi rating', 409);
    }
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};

// Manager melihat seluruh rating pelanggan
exports.semua = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.id_evaluasi, e.id_pemesanan, e.rating, e.ulasan,
              e.tanggal_ulasan, u.nama AS nama_pelanggan
       FROM evaluasi e
       JOIN users u ON u.id_user = e.id_user
       ORDER BY e.tanggal_ulasan DESC`
    );

    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};

 
// Pelanggan melihat evaluasi miliknya sendiri
exports.saya = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_evaluasi, id_pemesanan, rating, ulasan, tanggal_ulasan
       FROM evaluasi
       WHERE id_user = ?
       ORDER BY tanggal_ulasan DESC`,
      [req.user.id]
    );

    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};

