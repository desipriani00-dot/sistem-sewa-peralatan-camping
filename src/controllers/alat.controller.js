const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');

exports.list = async (req, res) => {
  const { q, kategori } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 12, 100);

  const where = [];
  const params = [];
  if (q) { where.push('nama_alat LIKE ?'); params.push(`%${q}%`); }
  if (kategori) { where.push('kategori = ?'); params.push(kategori); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM alat ${clause}`, params);
  // LIMIT/OFFSET diinline karena sudah di-sanitasi jadi integer
  const [rows] = await pool.execute(
    `SELECT * FROM alat ${clause} ORDER BY nama_alat LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    params
  );
  ok(res, { items: rows, page, limit, total });
};

exports.detail = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM alat WHERE id_alat = ?', [req.params.id]);
  if (!rows.length) throw new AppError('Alat tidak ditemukan', 404);
  ok(res, rows[0]);
};

exports.create = async (req, res) => {
  const { nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar } = req.body;
  const [r] = await pool.execute(
    `INSERT INTO alat (nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nama_alat, kategori || null, deskripsi || null, harga_sewa_per_hari, stok ?? 0, gambar || null]
  );
  ok(res, { id_alat: r.insertId }, 'Alat ditambahkan', 201);
};

exports.update = async (req, res) => {
  const { nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar } = req.body;
  const [r] = await pool.execute(
    `UPDATE alat SET nama_alat = ?, kategori = ?, deskripsi = ?,
            harga_sewa_per_hari = ?, stok = ?, gambar = ? WHERE id_alat = ?`,
    [nama_alat, kategori || null, deskripsi || null, harga_sewa_per_hari, stok ?? 0, gambar || null, req.params.id]
  );
  if (!r.affectedRows) throw new AppError('Alat tidak ditemukan', 404);
  ok(res, null, 'Alat diperbarui');
};

exports.remove = async (req, res) => {
  const [r] = await pool.execute('DELETE FROM alat WHERE id_alat = ?', [req.params.id]);
  if (!r.affectedRows) throw new AppError('Alat tidak ditemukan', 404);
  ok(res, null, 'Alat dihapus');
};
