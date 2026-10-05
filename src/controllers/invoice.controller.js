const db = require('../config/db');
const { fail, success } = require('../utils/response');
const { buatInvoice, kode } = require('../services/invoice.service');

const STATUS_BOLEH = ['dibayar', 'dipinjam', 'selesai']; // invoice ada setelah pembayaran diverifikasi

// GET /api/pemesanan/:id/invoice  (login: pemilik atau admin) -> file PDF
exports.unduh = async (req, res) => {
  try {
    const [[p]] = await db.query(
      `SELECT p.*, u.nama AS nama_penyewa, u.email
       FROM pemesanan p JOIN users u ON u.id_user = p.id_user WHERE p.id_pemesanan = ?`, [req.params.id]);
    if (!p) return fail(res, 'Pesanan tidak ditemukan', 404);
    if (req.user.role !== 'admin' && p.id_user !== req.user.id) return fail(res, 'Bukan pesanan kamu', 403);
    if (!STATUS_BOLEH.includes(p.status_pemesanan)) return fail(res, 'Invoice tersedia setelah pembayaran diverifikasi admin');

    const [items] = await db.query(
      `SELECT k.*, a.nama_alat FROM keranjang_detail k JOIN alat a ON a.id_alat = k.id_alat
       WHERE k.id_pemesanan = ?`, [p.id_pemesanan]);

    const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${kode(p.id_pemesanan)}.pdf"`);
    await buatInvoice(res, p, items, `${base}/api/pemesanan/verifikasi/${p.id_pemesanan}`);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) return fail(res, 'Server error', 500);
    res.end();
  }
};

// GET /api/pemesanan/verifikasi/:id  (publik, tujuan QR code) -> data non-pribadi
exports.verifikasi = async (req, res) => {
  try {
    const [[p]] = await db.query(
      `SELECT id_pemesanan, status_pemesanan, tanggal_sewa, tanggal_kembali_rencana, total_harga
       FROM pemesanan WHERE id_pemesanan = ?`, [req.params.id]);
    if (!p || !STATUS_BOLEH.includes(p.status_pemesanan)) return fail(res, 'Invoice tidak ditemukan atau belum sah', 404);
    return success(res, {
      no_invoice: kode(p.id_pemesanan), status: p.status_pemesanan,
      tanggal_sewa: p.tanggal_sewa, tanggal_kembali_rencana: p.tanggal_kembali_rencana, total_harga: p.total_harga,
    }, 'Invoice sah');
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};
