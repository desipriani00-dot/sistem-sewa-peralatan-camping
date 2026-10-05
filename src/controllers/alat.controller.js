const db = require('../config/db');
const { success, fail } = require('../utils/response');
const { STATUS_AKTIF } = require('../services/stok.service');

// Sesuai schema_sewa_camping.sql:
// alat(id_alat, nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar)

exports.getAll = async (req, res) => {
  try {
    // Filter: ?kategori=Tenda &q=dome &harga_min=10000 &harga_max=80000
    //         &mulai=2026-10-10 &selesai=2026-10-12 (hitung sisa stok di tanggal itu)
    //         &tersedia=1 (hanya yang masih ada) &urut=harga_asc|harga_desc|nama
    const { kategori, q, harga_min, harga_max, mulai, selesai, tersedia, urut } = req.query;
    const params = [];

    let sisa = 'a.stok';
    if (mulai && selesai) {
      sisa = `(a.stok - COALESCE((
        SELECT SUM(k.jumlah) FROM keranjang_detail k
        JOIN pemesanan p ON p.id_pemesanan = k.id_pemesanan
        WHERE k.id_alat = a.id_alat
          AND p.status_pemesanan IN (${STATUS_AKTIF.map(() => '?').join(',')})
          AND p.tanggal_sewa <= ? AND p.tanggal_kembali_rencana >= ?), 0))`;
      params.push(...STATUS_AKTIF, selesai, mulai);
    }

    let sql = `SELECT a.*, ${sisa} AS sisa_stok FROM alat a WHERE 1=1`;
    if (kategori) { sql += ' AND a.kategori = ?'; params.push(kategori); }
    if (q) { sql += ' AND a.nama_alat LIKE ?'; params.push(`%${q}%`); }
    if (harga_min) { sql += ' AND a.harga_sewa_per_hari >= ?'; params.push(harga_min); }
    if (harga_max) { sql += ' AND a.harga_sewa_per_hari <= ?'; params.push(harga_max); }
    if (tersedia === '1') sql += ' HAVING sisa_stok > 0';

    const urutan = { harga_asc: 'a.harga_sewa_per_hari ASC', harga_desc: 'a.harga_sewa_per_hari DESC', nama: 'a.nama_alat ASC' };
    sql += ` ORDER BY ${urutan[urut] || urutan.nama}`;

    const [rows] = await db.query(sql, params);
    return success(res, rows);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.getKategori = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT kategori FROM alat WHERE kategori IS NOT NULL ORDER BY kategori');
    return success(res, rows.map((r) => r.kategori));
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM alat WHERE id_alat = ?', [req.params.id]);
    if (!rows.length) return fail(res, 'Alat tidak ditemukan', 404);
    return success(res, rows[0]);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.create = async (req, res) => {
  try {
    const { nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar } = req.body;
    if (!nama_alat || harga_sewa_per_hari === undefined || stok === undefined) {
      return fail(res, 'nama_alat, harga_sewa_per_hari, dan stok wajib diisi');
    }
    const [r] = await db.query(
      `INSERT INTO alat (nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama_alat, kategori || null, deskripsi || null, harga_sewa_per_hari, stok, gambar || null]
    );
    return success(res, { id_alat: r.insertId }, 'Alat ditambahkan', 201);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.update = async (req, res) => {
  try {
    const { nama_alat, kategori, deskripsi, harga_sewa_per_hari, stok, gambar } = req.body;
    const [r] = await db.query(
      `UPDATE alat SET nama_alat = ?, kategori = ?, deskripsi = ?, harga_sewa_per_hari = ?, stok = ?, gambar = ?
       WHERE id_alat = ?`,
      [nama_alat, kategori || null, deskripsi || null, harga_sewa_per_hari, stok, gambar || null, req.params.id]
    );
    if (!r.affectedRows) return fail(res, 'Alat tidak ditemukan', 404);
    return success(res, null, 'Alat diperbarui');
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.remove = async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM alat WHERE id_alat = ?', [req.params.id]);
    if (!r.affectedRows) return fail(res, 'Alat tidak ditemukan', 404);
    return success(res, null, 'Alat dihapus');
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') return fail(res, 'Alat sudah pernah dipesan, tidak bisa dihapus', 409);
    console.error(e); return fail(res, 'Server error', 500);
  }
};
