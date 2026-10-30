
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { success, fail } = require('../utils/response');

const folder = path.join(__dirname, '../../private-ktp');

exports.daftar = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_user, username, nama, email, nomor_ktp,
              status_verifikasi_ktp
       FROM users
       WHERE status_verifikasi_ktp IN ('menunggu', 'ditolak')
       ORDER BY id_user DESC`
    );

    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal mengambil daftar KTP', 500);
  }
};

exports.foto = async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT foto_ktp FROM users WHERE id_user = ?',
      [req.params.id]
    );

    if (!user || !user.foto_ktp) {
      return fail(res, 'Foto KTP tidak ditemukan', 404);
    }

    const file = path.join(folder, path.basename(user.foto_ktp));

    if (!fs.existsSync(file)) {
      return fail(res, 'File foto KTP tidak tersedia', 404);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(file);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal membuka foto KTP', 500);
  }
};

exports.verifikasi = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['disetujui', 'ditolak'].includes(status)) {
      return fail(res, "Status harus 'disetujui' atau 'ditolak'");
    }

    const [result] = await db.query(
      `UPDATE users SET status_verifikasi_ktp = ?
       WHERE id_user = ? AND id_role = (
         SELECT id_role FROM roles WHERE nama_role = 'pelanggan'
       )`,
      [status, req.params.id]
    );

    if (!result.affectedRows) {
      return fail(res, 'Pelanggan tidak ditemukan', 404);
    }

    return success(res, null, `KTP berhasil ${status}`);
  } catch (e) {
    console.error(e);
    return fail(res, 'Gagal memverifikasi KTP', 500);
  }
};
