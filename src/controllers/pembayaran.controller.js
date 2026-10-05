const db = require('../config/db');
const { success, fail } = require('../utils/response');

// Sesuai schema_sewa_camping.sql:
// pembayaran(id_pembayaran, id_pemesanan, tanggal_bayar, jumlah_bayar, metode_pembayaran, bukti_bayar, status_pembayaran)
//   status_pembayaran: menunggu | berhasil | ditolak
// Status pesanan: menunggu (belum lunas) -> dibayar (admin sudah verifikasi)

// Pelanggan: upload bukti bayar. form-data: bukti (file), metode_pembayaran (opsional, default 'transfer')
exports.upload = async (req, res) => {
  try {
    if (!req.file) return fail(res, 'File bukti bayar wajib diunggah (field: bukti)');

    const [[p]] = await db.query('SELECT * FROM pemesanan WHERE id_pemesanan = ?', [req.params.id]);
    if (!p) return fail(res, 'Pesanan tidak ditemukan', 404);
    if (p.id_user !== req.user.id) return fail(res, 'Bukan pesanan kamu', 403);
    if (p.status_pemesanan !== 'menunggu') return fail(res, 'Pesanan ini tidak sedang menunggu pembayaran');

    const [[tunggu]] = await db.query(
      "SELECT COUNT(*) AS n FROM pembayaran WHERE id_pemesanan = ? AND status_pembayaran = 'menunggu'", [p.id_pemesanan]);
    if (tunggu.n > 0) return fail(res, 'Bukti bayar sebelumnya masih menunggu verifikasi admin', 409);

    const path = `uploads/bukti/${req.file.filename}`;
    const metode = (req.body.metode_pembayaran || 'transfer').slice(0, 50);
    const [r] = await db.query(
      `INSERT INTO pembayaran (id_pemesanan, jumlah_bayar, metode_pembayaran, bukti_bayar, status_pembayaran)
       VALUES (?, ?, ?, ?, 'menunggu')`,
      [p.id_pemesanan, p.total_harga, metode, path]);

    return success(res, { id_pembayaran: r.insertId, bukti_bayar: path },
      'Bukti bayar terkirim, menunggu verifikasi admin', 201);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

// Admin: daftar pembayaran (opsional ?status=menunggu)
exports.daftar = async (req, res) => {
  try {
    const { status } = req.query;
    const [rows] = await db.query(
      `SELECT b.*, p.total_harga, u.nama AS nama_penyewa
       FROM pembayaran b
       JOIN pemesanan p ON p.id_pemesanan = b.id_pemesanan
       JOIN users u ON u.id_user = p.id_user
       ${status ? 'WHERE b.status_pembayaran = ?' : ''} ORDER BY b.id_pembayaran DESC`,
      status ? [status] : []
    );
    return success(res, rows);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

// Admin: verifikasi. body: { "status": "berhasil" | "ditolak" }
exports.verifikasi = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { status } = req.body;
    if (!['berhasil', 'ditolak'].includes(status)) return fail(res, "status harus 'berhasil' atau 'ditolak'");

    await conn.beginTransaction();
    const [[b]] = await conn.query('SELECT * FROM pembayaran WHERE id_pembayaran = ? FOR UPDATE', [req.params.id]);
    if (!b) { await conn.rollback(); return fail(res, 'Pembayaran tidak ditemukan', 404); }
    if (b.status_pembayaran !== 'menunggu') { await conn.rollback(); return fail(res, 'Pembayaran ini sudah diverifikasi'); }

    await conn.query('UPDATE pembayaran SET status_pembayaran = ? WHERE id_pembayaran = ?', [status, b.id_pembayaran]);
    // berhasil -> pesanan jadi 'dibayar'. ditolak -> pesanan tetap 'menunggu', pelanggan boleh upload ulang
    if (status === 'berhasil') {
      await conn.query("UPDATE pemesanan SET status_pemesanan = 'dibayar' WHERE id_pemesanan = ?", [b.id_pemesanan]);
    }
    await conn.commit();
    return success(res, null, `Pembayaran ${status}`);
  } catch (e) {
    await conn.rollback(); console.error(e); return fail(res, 'Server error', 500);
  } finally { conn.release(); }
};
