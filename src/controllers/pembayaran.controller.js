
const db = require('../config/db');
const { success, fail } = require('../utils/response');

// PELANGGAN: Upload bukti pembayaran
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 'File bukti bayar wajib diunggah (field: bukti)', 400);
    }

    const [[p]] = await db.query(
      'SELECT * FROM pemesanan WHERE id_pemesanan = ?',
      [req.params.id]
    );

    if (!p) return fail(res, 'Pesanan tidak ditemukan', 404);

    if (Number(p.id_user) !== Number(req.user.id)) {
      return fail(res, 'Bukan pesanan kamu', 403);
    }

    if (p.status_pemesanan !== 'menunggu') {
      return fail(res, 'Pesanan ini tidak sedang menunggu pembayaran', 409);
    }

    const [[terbaru]] = await db.query(
      `SELECT status_pembayaran
       FROM pembayaran
       WHERE id_pemesanan = ?
       ORDER BY id_pembayaran DESC
       LIMIT 1`,
      [p.id_pemesanan]
    );

    if (terbaru && terbaru.status_pembayaran === 'menunggu') {
      return fail(res, 'Bukti pembayaran masih menunggu verifikasi Admin', 409);
    }

    if (terbaru && terbaru.status_pembayaran === 'berhasil') {
      return fail(res, 'Pembayaran pesanan ini sudah berhasil', 409);
    }

    const bukti = `uploads/bukti/${req.file.filename}`;
    const metode = (req.body.metode_pembayaran || 'transfer').slice(0, 50);

    const [r] = await db.query(
      `INSERT INTO pembayaran
       (id_pemesanan, jumlah_bayar, metode_pembayaran,
        bukti_bayar, status_pembayaran)
       VALUES (?, ?, ?, ?, 'menunggu')`,
      [p.id_pemesanan, p.total_harga, metode, bukti]
    );

    return success(
      res,
      {
        id_pembayaran: r.insertId,
        bukti_bayar: bukti,
        status_pembayaran: 'menunggu'
      },
      'Bukti pembayaran berhasil dikirim ulang. Menunggu verifikasi Admin.',
      201
    );

  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal mengunggah bukti pembayaran', 500);
  }
};

// ADMIN/MANAGER: Daftar pembayaran
const daftar = async (req, res) => {
  try {
    const params = [];

    let sql = `
      SELECT b.*, p.id_user, p.total_harga, p.status_pemesanan
      FROM pembayaran b
      JOIN pemesanan p ON p.id_pemesanan = b.id_pemesanan
    `;

    if (req.query.status) {
      sql += ' WHERE b.status_pembayaran = ?';
      params.push(req.query.status);
    }

    sql += ' ORDER BY b.id_pembayaran DESC';

    const [rows] = await db.query(sql, params);
    return success(res, rows);

  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal mengambil daftar pembayaran', 500);
  }
};

exports.list = daftar;
exports.daftar = daftar;
exports.getAll = daftar;
exports.index = daftar;
exports.semua = daftar;
exports.listAll = daftar;

// ADMIN/MANAGER: Verifikasi atau tolak pembayaran
exports.verifikasi = async (req, res) => {
  let conn;

  try {
    const { status, alasan_penolakan } = req.body || {};

    if (!['berhasil', 'ditolak'].includes(status)) {
      return fail(res, "Status harus 'berhasil' atau 'ditolak'", 400);
    }

    const alasan = status === 'ditolak'
      ? (alasan_penolakan || '').trim()
      : null;

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [[b]] = await conn.query(
      `SELECT * FROM pembayaran
       WHERE id_pembayaran = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (!b) {
      await conn.rollback();
      return fail(res, 'Pembayaran tidak ditemukan', 404);
    }

    if (b.status_pembayaran !== 'menunggu') {
      await conn.rollback();
      return fail(res, 'Pembayaran ini sudah diverifikasi', 409);
    }

    await conn.query(
      `UPDATE pembayaran
       SET status_pembayaran = ?,
           alasan_penolakan = ?
       WHERE id_pembayaran = ?`,
      [status, alasan, b.id_pembayaran]
    );

    if (status === 'berhasil') {
      await conn.query(
        `UPDATE pemesanan
         SET status_pemesanan = 'dibayar'
         WHERE id_pemesanan = ?`,
        [b.id_pemesanan]
      );
    }

    await conn.commit();

    return success(
      res,
      {
        id_pembayaran: b.id_pembayaran,
        id_pemesanan: b.id_pemesanan,
        status_pembayaran: status,
        alasan_penolakan: alasan
      },
      status === 'ditolak'
        ? 'Pembayaran ditolak. Pelanggan dapat mengunggah ulang bukti pembayaran.'
        : 'Pembayaran berhasil diverifikasi.'
    );

  } catch (e) {
    if (conn) await conn.rollback();
    console.error(e);
    return fail(res, 'Gagal memverifikasi pembayaran', 500);

  } finally {
    if (conn) conn.release();
  }
};
