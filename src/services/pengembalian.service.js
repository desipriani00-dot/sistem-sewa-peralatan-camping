const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { kembalikanStok } = require('./pemesanan.service');

const DAY = 24 * 60 * 60 * 1000;

exports.catat = async ({ id_pemesanan, tanggal_kembali_aktual, kondisi_alat, catatan }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT status_pemesanan, tanggal_kembali_rencana
         FROM pemesanan WHERE id_pemesanan = ? FOR UPDATE`,
      [id_pemesanan]
    );
    if (!rows.length) throw new AppError('Pemesanan tidak ditemukan', 404);
    if (rows[0].status_pemesanan !== 'dipinjam') {
      throw new AppError('Hanya pemesanan berstatus "dipinjam" yang bisa dikembalikan', 409);
    }

    const telat = Math.max(
      Math.ceil((new Date(tanggal_kembali_aktual) - new Date(rows[0].tanggal_kembali_rencana)) / DAY),
      0
    );
    const denda = telat * Number(process.env.DENDA_PER_HARI || 0);

    const [res] = await conn.execute(
      `INSERT INTO pengembalian
         (id_pemesanan, tanggal_kembali_aktual, hari_terlambat, denda, kondisi_alat, catatan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_pemesanan, tanggal_kembali_aktual, telat, denda, kondisi_alat || 'baik', catatan || null]
    );

    // kondisi "hilang": stok tidak dikembalikan
    if (kondisi_alat !== 'hilang') await kembalikanStok(conn, id_pemesanan);
    await conn.execute("UPDATE pemesanan SET status_pemesanan = 'selesai' WHERE id_pemesanan = ?", [
      id_pemesanan,
    ]);

    await conn.commit();
    return { id_pengembalian: res.insertId, hari_terlambat: telat, denda };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
