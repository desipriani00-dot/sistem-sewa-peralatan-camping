/* JALANKAN SQL INI DULU DI MySQL / phpMyAdmin (sekali saja):

ALTER TABLE users
  ADD COLUMN diverifikasi_oleh INT NULL,
  ADD COLUMN tanggal_verifikasi DATETIME NULL;
*/

const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { success, fail } = require('../utils/response');

const folder = path.join(__dirname, '../../private-ktp');

// KTP yang masih menunggu verifikasi
exports.daftar = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_user, username, nama, email, nomor_ktp, status_verifikasi_ktp
       FROM users
       WHERE status_verifikasi_ktp = 'menunggu'
       ORDER BY id_user DESC`
    );
    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal mengambil daftar KTP', 500);
  }
};

// Riwayat: yang sudah disetujui / ditolak + nama admin yang memproses
exports.riwayat = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_user, u.username, u.nama, u.email, u.nomor_ktp,
              u.status_verifikasi_ktp, u.tanggal_verifikasi,
              a.nama AS diverifikasi_oleh
       FROM users u
       LEFT JOIN users a ON a.id_user = u.diverifikasi_oleh
       WHERE u.status_verifikasi_ktp IN ('disetujui', 'ditolak')
       ORDER BY u.tanggal_verifikasi IS NULL, u.tanggal_verifikasi DESC, u.id_user DESC`
    );
    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal mengambil riwayat KTP', 500);
  }
};

exports.foto = async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT foto_ktp FROM users WHERE id_user = ?',
      [req.params.id]
    );
    if (!user || !user.foto_ktp) return fail(res, 'Foto KTP tidak ditemukan', 404);

    const file = path.join(folder, path.basename(user.foto_ktp));
    if (!fs.existsSync(file)) return fail(res, 'File foto KTP tidak tersedia', 404);

    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(file);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal membuka foto KTP', 500);
  }
};

// Verifikasi / tolak, sekaligus mencatat admin & waktunya
exports.verifikasi = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['disetujui', 'ditolak'].includes(status)) {
      return fail(res, "Status harus 'disetujui' atau 'ditolak'");
    }

    const [result] = await db.query(
      `UPDATE users
       SET status_verifikasi_ktp = ?, diverifikasi_oleh = ?, tanggal_verifikasi = NOW()
       WHERE id_user = ? AND id_role = (
         SELECT id_role FROM roles WHERE nama_role = 'pelanggan'
       )`,
      [status, req.user.id, req.params.id]   // req.user.id = id admin dari token
    );
    if (!result.affectedRows) return fail(res, 'Pelanggan tidak ditemukan', 404);

    return success(res, null, `KTP berhasil ${status}`);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal memverifikasi KTP', 500);
  }
};