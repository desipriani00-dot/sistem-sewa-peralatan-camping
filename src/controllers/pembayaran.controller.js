const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');

exports.create = async (req, res) => {
  const { id_pemesanan, jumlah_bayar, metode_pembayaran, bukti_bayar } = req.body;
  const [rows] = await pool.execute(
    'SELECT id_user, status_pemesanan FROM pemesanan WHERE id_pemesanan = ?',
    [id_pemesanan]
  );
  if (!rows.length) throw new AppError('Pemesanan tidak ditemukan', 404);
  if (rows[0].id_user !== req.user.id) throw new AppError('Akses ditolak', 403);
  if (['selesai', 'dibatalkan'].includes(rows[0].status_pemesanan)) {
    throw new AppError('Pemesanan sudah ditutup', 409);
  }

  const [r] = await pool.execute(
    `INSERT INTO pembayaran (id_pemesanan, jumlah_bayar, metode_pembayaran, bukti_bayar)
     VALUES (?, ?, ?, ?)`,
    [id_pemesanan, jumlah_bayar, metode_pembayaran, bukti_bayar || null]
  );
  ok(res, { id_pembayaran: r.insertId }, 'Pembayaran dikirim, menunggu verifikasi', 201);
};

// Admin memverifikasi: berhasil / ditolak
exports.verifikasi = async (req, res) => {
  const { status } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT id_pemesanan FROM pembayaran WHERE id_pembayaran = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) throw new AppError('Pembayaran tidak ditemukan', 404);
    const idPemesanan = rows[0].id_pemesanan;

    await conn.execute('UPDATE pembayaran SET status_pembayaran = ? WHERE id_pembayaran = ?', [
      status,
      req.params.id,
    ]);

    if (status === 'berhasil') {
      const [[{ dibayar }]] = await conn.execute(
        `SELECT COALESCE(SUM(jumlah_bayar), 0) AS dibayar FROM pembayaran
          WHERE id_pemesanan = ? AND status_pembayaran = 'berhasil'`,
        [idPemesanan]
      );
      const [[p]] = await conn.execute(
        'SELECT total_harga FROM pemesanan WHERE id_pemesanan = ?',
        [idPemesanan]
      );
      if (Number(dibayar) >= Number(p.total_harga)) {
        await conn.execute(
          "UPDATE pemesanan SET status_pemesanan = 'dibayar' WHERE id_pemesanan = ? AND status_pemesanan = 'menunggu'",
          [idPemesanan]
        );
      }
    }
    await conn.commit();
    ok(res, null, 'Pembayaran diverifikasi');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
