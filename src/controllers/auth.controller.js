const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');

const buatToken = (u) =>
  jwt.sign({ id: u.id_user, role: u.nama_role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

exports.register = async (req, res) => {
  const { nama, email, password, no_hp, alamat } = req.body;
  const [[role]] = await pool.execute("SELECT id_role FROM roles WHERE nama_role = 'pelanggan'");
  const hash = await bcrypt.hash(password, 10);

  const [r] = await pool.execute(
    'INSERT INTO users (id_role, nama, email, password, no_hp, alamat) VALUES (?, ?, ?, ?, ?, ?)',
    [role.id_role, nama, email, hash, no_hp || null, alamat || null]
  );
  ok(res, { id_user: r.insertId, nama, email }, 'Registrasi berhasil', 201);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.execute(
    `SELECT u.id_user, u.nama, u.email, u.password, r.nama_role
       FROM users u JOIN roles r ON r.id_role = u.id_role WHERE u.email = ?`,
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Email atau password salah', 401);
  }
  ok(res, {
    token: buatToken(user),
    user: { id_user: user.id_user, nama: user.nama, email: user.email, role: user.nama_role },
  }, 'Login berhasil');
};

exports.me = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.id_user, u.nama, u.email, u.no_hp, u.alamat, r.nama_role AS role
       FROM users u JOIN roles r ON r.id_role = u.id_role WHERE u.id_user = ?`,
    [req.user.id]
  );
  if (!rows.length) throw new AppError('User tidak ditemukan', 404);
  ok(res, rows[0]);
};
