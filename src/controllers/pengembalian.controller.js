const db = require('../config/db');
const { success, fail } = require('../utils/response');

// Sesuai schema_sewa_camping.sql:
// pengembalian(id_pengembalian, id_pemesanan [unik], tanggal_kembali_aktual, hari_terlambat, denda, kondisi_alat, catatan)
//   kondisi_alat: baik | rusak_ringan | rusak_berat | hilang

const KONDISI = ['baik', 'rusak_ringan', 'rusak_berat', 'hilang'];

// Admin: alat diserahkan ke penyewa (dibayar -> dipinjam)
exports.serahkan = async (req, res) => {
  try {
    const [[p]] = await db.query('SELECT status_pemesanan FROM pemesanan WHERE id_pemesanan = ?', [req.params.id]);
    if (!p) return fail(res, 'Pesanan tidak ditemukan', 404);
    if (p.status_pemesanan !== 'dibayar') return fail(res, 'Hanya pesanan berstatus dibayar yang bisa diserahkan');
    await db.query("UPDATE pemesanan SET status_pemesanan = 'dipinjam' WHERE id_pemesanan = ?", [req.params.id]);
    return success(res, null, 'Alat diserahkan ke penyewa');
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

// Admin: catat pengembalian. body: { kondisi_alat, denda, catatan }
// hari_terlambat dihitung otomatis dari tanggal_kembali_rencana
exports.catat = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { kondisi_alat, denda, catatan } = req.body;
    if (!KONDISI.includes(kondisi_alat)) return fail(res, `kondisi_alat harus salah satu dari: ${KONDISI.join(', ')}`);

    await conn.beginTransaction();
    const [[p]] = await conn.query(
      `SELECT status_pemesanan, GREATEST(0, DATEDIFF(CURDATE(), tanggal_kembali_rencana)) AS telat
       FROM pemesanan WHERE id_pemesanan = ? FOR UPDATE`, [req.params.id]);
    if (!p) { await conn.rollback(); return fail(res, 'Pesanan tidak ditemukan', 404); }
    if (p.status_pemesanan !== 'dipinjam') { await conn.rollback(); return fail(res, 'Pesanan ini tidak sedang dipinjam'); }

    await conn.query(
      `INSERT INTO pengembalian (id_pemesanan, tanggal_kembali_aktual, hari_terlambat, denda, kondisi_alat, catatan)
       VALUES (?, CURDATE(), ?, ?, ?, ?)`,
      [req.params.id, p.telat, Number(denda) || 0, kondisi_alat, catatan || null]);
    await conn.query("UPDATE pemesanan SET status_pemesanan = 'selesai' WHERE id_pemesanan = ?", [req.params.id]);
    await conn.commit();
    return success(res, { hari_terlambat: Number(p.telat) }, 'Pengembalian dicatat, pesanan selesai', 201);
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return fail(res, 'Pengembalian pesanan ini sudah dicatat', 409);
    console.error(e); return fail(res, 'Server error', 500);
  } finally { conn.release(); }
};
