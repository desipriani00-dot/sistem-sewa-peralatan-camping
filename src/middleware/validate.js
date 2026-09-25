const { validationResult } = require('express-validator');

// Dipasang setelah rangkaian rule express-validator
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(422).json({
    success: false,
    message: 'Validasi gagal',
    errors: result.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};
