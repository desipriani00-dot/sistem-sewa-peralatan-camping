const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { success, fail } = require('../utils/response');

// Sesuai schema_sewa_camping.sql:
// roles(id_role, nama_role: 'admin' | 'pelanggan')
// users(id_user, id_role, nama, email, password, no_hp, alamat)

exports.register = async (req, res) => {
  try {
    const { nama, email, password, no_hp, alamat } = req.body;
    if (!nama || !email || !password) return fail(res, 'Nama, email, dan password wajib diisi');

    const [exist] = await db.query('SELECT id_user FROM users WHERE email = ?', [email]);
    if (exist.length) return fail(res, 'Email sudah terdaftar', 409);

    const [roles] = await db.query("SELECT id_role FROM roles WHERE nama_role = 'pelanggan'");
    if (!roles.length) return fail(res, "Role 'pelanggan' belum ada di tabel roles", 500);

    const hashed = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO users (id_role, nama, email, password, no_hp, alamat) VALUES (?, ?, ?, ?, ?, ?)',
      [roles[0].id_role, nama, email, hashed, no_hp || null, alamat || null]
    );
    return success(res, { id_user: r.insertId, nama, email }, 'Registrasi berhasil', 201);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 'Email dan password wajib diisi');

    const [rows] = await db.query(
      `SELECT u.id_user, u.nama, u.email, u.password, r.nama_role AS role
       FROM users u JOIN roles r ON r.id_role = u.id_role WHERE u.email = ?`, [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return fail(res, 'Email atau password salah', 401);
    }

    // Isi token: id (= id_user) dan role. Dipakai di semua controller lewat req.user
    const token = jwt.sign({ id: user.id_user, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
    return success(res, {
      token, user: { id_user: user.id_user, nama: user.nama, email: user.email, role: user.role },
    }, 'Login berhasil');
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id_user, u.nama, u.email, u.no_hp, u.alamat, r.nama_role AS role
       FROM users u JOIN roles r ON r.id_role = u.id_role WHERE u.id_user = ?`, [req.user.id]);
    if (!rows.length) return fail(res, 'User tidak ditemukan', 404);
    return success(res, rows[0]);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.ubahProfil = async (req, res) => {
  try {
    const { nama, email, no_hp, alamat } = req.body;
    if (!nama || !email) return fail(res, 'Nama dan email wajib diisi');
    await db.query('UPDATE users SET nama = ?, email = ?, no_hp = ?, alamat = ? WHERE id_user = ?',
      [nama, email, no_hp || null, alamat || null, req.user.id]);
    return success(res, null, 'Profil diperbarui');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return fail(res, 'Email sudah dipakai akun lain', 409);
    console.error(e); return fail(res, 'Server error', 500);
  }
};

exports.ubahPassword = async (req, res) => {
  try {
    const { lama, baru } = req.body;
    if (!lama || !baru || baru.length < 6) return fail(res, 'Password lama wajib diisi dan password baru minimal 6 karakter');
    const [[u]] = await db.query('SELECT password FROM users WHERE id_user = ?', [req.user.id]);
    if (!u || !(await bcrypt.compare(lama, u.password))) return fail(res, 'Password lama salah', 401);
    await db.query('UPDATE users SET password = ? WHERE id_user = ?', [await bcrypt.hash(baru, 10), req.user.id]);
    return success(res, null, 'Password diubah');
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};
