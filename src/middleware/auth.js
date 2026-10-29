const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

// Verifikasi token JWT dari header: Authorization: Bearer <token>
exports.verifyToken = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return fail(res, 'Silakan login terlebih dahulu', 401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch (err) {
    return fail(res, 'Sesi login sudah habis, silakan login lagi', 401);
  }
};

// Batasi akses berdasarkan nama role, contoh: requireRole('admin')
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return fail(res, 'Anda tidak memiliki akses', 403);
  }
  next();
};