const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Verifikasi JWT -> req.user = { id, role }
exports.authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Token tidak ditemukan', 401);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    throw new AppError('Token tidak valid atau kedaluwarsa', 401);
  }
};

// Batasi akses berdasarkan role, contoh: authorize('admin')
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new AppError('Akses ditolak', 403);
  next();
};
