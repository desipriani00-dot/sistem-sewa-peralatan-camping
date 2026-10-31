
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

exports.verifyToken = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null;

  if (!token) {
    return fail(res, 'Token tidak ditemukan. Silakan login kembali.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      ...decoded,
      id: decoded.id || decoded.id_user,
      role: String(
        decoded.role?.nama_role ||
        decoded.role?.nama ||
        decoded.role ||
        decoded.nama_role ||
        ''
      ).toLowerCase().trim()
    };

    next();
  } catch (err) {
    return fail(res, 'Token tidak valid atau sesi login sudah habis.', 401);
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  const userRole = String(req.user?.role || '')
    .toLowerCase()
    .trim();

  const allowedRoles = roles.map(role =>
    String(role).toLowerCase().trim()
  );

  if (!allowedRoles.includes(userRole)) {
    return fail(
      res,
      `Akses ditolak. Role akun: ${userRole || 'tidak dikenali'}. Role yang diizinkan: ${allowedRoles.join(', ')}`,
      403
    );
  }

  next();
};
