const db = require('../config/db');
const { success, fail } = require('../utils/response');

// Pelanggan: upload bukti bayar. form-data: bukti (file), metode_pembayaran (opsional)
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 'File bukti bayar wajib diunggah (field: bukti)');
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
      return fail(res, 'Pesanan ini tidak sedang menunggu pembayaran');
    }

    const [[tunggu]] = await db.query(
      `SELECT COUNT(*) AS n FROM pembayaran
       WHERE id_pemesanan = ? AND status_pembayaran = 'menunggu'`,
      [p.id_pemesanan]
    );

    if (tunggu.n > 0) {
      return fail(res, 'Bukti bayar sebelumnya masih menunggu verifikasi admin', 409);
    }

    const bukti = `uploads/bukti/${req.file.filename}`;
    const metode = (req.body.metode_pembayaran || 'transfer').slice(0, 50);

    const [r] = await db.query(
      `INSERT INTO pembayaran
       (id_pemesanan, jumlah_bayar, metode_pembayaran, bukti_bayar, status_pembayaran)
       VALUES (?, ?, ?, ?, 'menunggu')`,
      [p.id_pemesanan, p.total_harga, metode, bukti]
    );

    return success(
      res,
      { id_pembayaran: r.insertId, bukti_bayar: bukti },
      'Bukti bayar terkirim, menunggu verifikasi admin',
      201
    );
  } catch (e) {
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};

// Admin: daftar pembayaran (opsional ?status=menunggu)
const daftar = async (req, res) => {
  try {
    const params = [];
    let sql = `SELECT b.*, p.id_user, p.total_harga, p.status_pemesanan
               FROM pembayaran b
               JOIN pemesanan p ON p.id_pemesanan = b.id_pemesanan`;

    if (req.query.status) {
      sql += ' WHERE b.status_pembayaran = ?';
      params.push(req.query.status);
    }

    sql += ' ORDER BY b.id_pembayaran DESC';

    const [rows] = await db.query(sql, params);
    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};

// Nama lain yang mungkin dipakai di file routes
exports.list = daftar;
exports.daftar = daftar;
exports.getAll = daftar;
exports.index = daftar;
exports.semua = daftar;
exports.listAll = daftar;

// Admin: verifikasi. body: { "status": "berhasil" | "ditolak" }
exports.verifikasi = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { status } = req.body;
    if (!['berhasil', 'ditolak'].includes(status)) {
      return fail(res, "status harus 'berhasil' atau 'ditolak'");
    }

    await conn.beginTransaction();
    const [[b]] = await conn.query(
      'SELECT * FROM pembayaran WHERE id_pembayaran = ? FOR UPDATE',
      [req.params.id]
    );
    if (!b) { await conn.rollback(); return fail(res, 'Pembayaran tidak ditemukan', 404); }
    if (b.status_pembayaran !== 'menunggu') {
      await conn.rollback();
      return fail(res, 'Pembayaran ini sudah diverifikasi');
    }

    await conn.query(
      'UPDATE pembayaran SET status_pembayaran = ? WHERE id_pembayaran = ?',
      [status, b.id_pembayaran]
    );
    if (status === 'berhasil') {
      await conn.query(
        "UPDATE pemesanan SET status_pemesanan = 'dibayar' WHERE id_pemesanan = ?",
        [b.id_pemesanan]
      );
    }
    await conn.commit();
    return success(res, null, `Pembayaran ${status}`);
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return fail(res, 'Server error', 500);
  } finally {
    conn.release();
  }
};