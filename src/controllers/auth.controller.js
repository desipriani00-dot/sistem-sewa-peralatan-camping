
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { success, fail } = require('../utils/response');

const PESAN_SERVER = 'Terjadi kesalahan, silakan coba kembali';
const PESAN_LENGKAPI = 'Mohon lengkapi data terlebih dahulu';

const hapusFotoKtp = (filename) => {
  if (!filename) return;
  const file = path.join(__dirname, '../../private-ktp', path.basename(filename));
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

exports.register = async (req, res) => {
  try {
    const { username, nama, email, password, no_hp, alamat, nomor_ktp } = req.body;

    if (!username || !nama || !email || !password || !nomor_ktp || !req.file) {
      if (req.file) hapusFotoKtp(req.file.filename);
      return fail(res, `Data belum terbaca: username=${!!username}, nama=${!!nama}, email=${!!email}, password=${!!password}, nomor_ktp=${!!nomor_ktp}, foto=${!!req.file}`);
    }

    const [exist] = await db.query(
      'SELECT id_user FROM users WHERE email = ? OR username = ? OR nomor_ktp = ?',
      [email, username, nomor_ktp]
    );

    if (exist.length) {
      hapusFotoKtp(req.file.filename);
      return fail(res, 'Email, username, atau nomor KTP sudah terdaftar', 409);
    }

    const [roles] = await db.query(
      "SELECT id_role FROM roles WHERE nama_role = 'pelanggan'"
    );

    if (!roles.length) {
      hapusFotoKtp(req.file.filename);
      return fail(res, PESAN_SERVER, 500);
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users
       (id_role, username, nama, email, password, no_hp, alamat,
        nomor_ktp, foto_ktp, status_verifikasi_ktp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')`,
      [
        roles[0].id_role, username, nama, email, hashed,
        no_hp || null, alamat || null, nomor_ktp, req.file.filename
      ]
    );

    return success(res, {
      id_user: result.insertId,
      username,
      nama,
      email,
      status_verifikasi_ktp: 'menunggu'
    }, 'Registrasi berhasil. Tunggu verifikasi admin.', 201);
  } catch (e) {
    if (req.file) hapusFotoKtp(req.file.filename);
    if (e.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Email, username, atau nomor KTP sudah terdaftar', 409);
    }
    console.error(e);
    return fail(res, PESAN_SERVER, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, PESAN_LENGKAPI);
    }

    const [rows] = await db.query(
      `SELECT u.id_user, u.username, u.nama, u.email, u.password,
              u.no_hp, u.alamat, u.nomor_ktp, u.foto_ktp,
              u.status_verifikasi_ktp, r.nama_role AS role
       FROM users u
       JOIN roles r ON r.id_role = u.id_role
       WHERE u.email = ?`,
      [email]
    );

    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return fail(res, 'Email atau password tidak valid', 401);
    }

    if (user.role === 'pelanggan' && user.status_verifikasi_ktp !== 'disetujui') {
      const pesan = user.status_verifikasi_ktp === 'ditolak'
        ? 'KTP ditolak. Silakan perbaiki data KTP dan hubungi admin.'
        : 'KTP masih menunggu verifikasi admin.';

      return fail(res, pesan, 403);
    }

    const token = jwt.sign(
      { id: user.id_user, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return success(res, {
      token,
      user: {
        id_user: user.id_user,
        username: user.username,
        nama: user.nama,
        email: user.email,
        role: user.role,
        nomor_ktp: user.nomor_ktp,
        foto_ktp: user.foto_ktp
      }
    }, 'Login berhasil');
  } catch (e) {
    console.error(e);
    return fail(res, PESAN_SERVER, 500);
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_user, u.username, u.nama, u.email, u.no_hp,
              u.alamat, u.nomor_ktp, u.foto_ktp,
              u.status_verifikasi_ktp, r.nama_role AS role
       FROM users u
       JOIN roles r ON r.id_role = u.id_role
       WHERE u.id_user = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return fail(res, 'Data pengguna tidak ditemukan', 404);
    }

    return success(res, rows[0]);
  } catch (e) {
    console.error(e);
    return fail(res, PESAN_SERVER, 500);
  }
};

exports.ubahProfil = async (req, res) => {
  try {
    const { nama, email, no_hp, alamat } = req.body;

    if (!nama || !email) {
      return fail(res, PESAN_LENGKAPI);
    }

    await db.query(
      `UPDATE users SET nama = ?, email = ?, no_hp = ?, alamat = ?
       WHERE id_user = ?`,
      [nama, email, no_hp || null, alamat || null, req.user.id]
    );

    return success(res, null, 'Profil diperbarui');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Email sudah dipakai akun lain', 409);
    }
    console.error(e);
    return fail(res, PESAN_SERVER, 500);
  }
};

exports.ubahKtp = async (req, res) => {
  try {
    const { nomor_ktp } = req.body;

    if (!nomor_ktp && !req.file) {
      return fail(res, 'Masukkan nomor KTP atau unggah foto KTP');
    }

    const [[user]] = await db.query(
      'SELECT nomor_ktp, foto_ktp FROM users WHERE id_user = ?',
      [req.user.id]
    );

    if (!user) {
      if (req.file) hapusFotoKtp(req.file.filename);
      return fail(res, 'Pengguna tidak ditemukan', 404);
    }

    const nomorBaru = nomor_ktp || user.nomor_ktp;
    const fotoBaru = req.file ? req.file.filename : user.foto_ktp;

    if (!nomorBaru || !fotoBaru) {
      if (req.file) hapusFotoKtp(req.file.filename);
      return fail(res, 'Nomor dan foto KTP wajib lengkap');
    }

    await db.query(
      `UPDATE users
       SET nomor_ktp = ?, foto_ktp = ?,
           status_verifikasi_ktp = 'menunggu'
       WHERE id_user = ?`,
      [nomorBaru, fotoBaru, req.user.id]
    );

    if (req.file && user.foto_ktp) {
      hapusFotoKtp(user.foto_ktp);
    }

    return success(res, null, 'Data KTP diperbarui dan menunggu verifikasi admin');
  } catch (e) {
    if (req.file) hapusFotoKtp(req.file.filename);
    if (e.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Nomor KTP sudah digunakan akun lain', 409);
    }
    console.error(e);
    return fail(res, PESAN_SERVER, 500);
  }
};

exports.ubahPassword = async (req, res) => {
  try {
    const { lama, baru } = req.body;

    if (!lama || !baru || baru.length < 6) {
      return fail(res, 'Password lama wajib diisi dan password baru minimal 6 karakter');
    }

    const [[user]] = await db.query(
      'SELECT password FROM users WHERE id_user = ?',
      [req.user.id]
    );

    if (!user || !(await bcrypt.compare(lama, user.password))) {
      return fail(res, 'Password lama salah', 401);
    }

    await db.query(
      'UPDATE users SET password = ? WHERE id_user = ?',
      [await bcrypt.hash(baru, 10), req.user.id]
    );

    return success(res, null, 'Password diubah');
  } catch (e) {
    console.error(e);
    return fail(res, PESAN_SERVER, 500);
  }
};
