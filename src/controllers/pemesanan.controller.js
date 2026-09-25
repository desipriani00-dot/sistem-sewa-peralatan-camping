const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const service = require('../services/pemesanan.service');

exports.create = async (req, res) => {
  const hasil = await service.buat(req.user.id, req.body);
  ok(res, hasil, 'Pemesanan dibuat', 201);
};

// Pelanggan: hanya miliknya. Admin: semua.
exports.list = async (req, res) => {
  const admin = req.user.role === 'admin';
  const [rows] = await pool.execute(
    `SELECT p.*, u.nama AS nama_user FROM pemesanan p
       JOIN users u ON u.id_user = p.id_user
      ${admin ? '' : 'WHERE p.id_user = ?'}
      ORDER BY p.id_pemesanan DESC`,
    admin ? [] : [req.user.id]
  );
  ok(res, rows);
};

exports.detail = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT p.*, u.nama AS nama_user FROM pemesanan p
       JOIN users u ON u.id_user = p.id_user WHERE p.id_pemesanan = ?`,
    [req.params.id]
  );
  const pesanan = rows[0];
  if (!pesanan) throw new AppError('Pemesanan tidak ditemukan', 404);
  if (req.user.role !== 'admin' && pesanan.id_user !== req.user.id) {
    throw new AppError('Akses ditolak', 403);
  }

  const [items] = await pool.execute(
    `SELECT d.*, a.nama_alat FROM keranjang_detail d
       JOIN alat a ON a.id_alat = d.id_alat WHERE d.id_pemesanan = ?`,
    [req.params.id]
  );
  const [pembayaran] = await pool.execute('SELECT * FROM pembayaran WHERE id_pemesanan = ?', [req.params.id]);
  const [pengembalian] = await pool.execute('SELECT * FROM pengembalian WHERE id_pemesanan = ?', [req.params.id]);

  ok(res, { ...pesanan, items, pembayaran, pengembalian: pengembalian[0] || null });
};

exports.ubahStatus = async (req, res) => {
  await service.ubahStatus(req.params.id, req.body.status);
  ok(res, null, 'Status diperbarui');
};
