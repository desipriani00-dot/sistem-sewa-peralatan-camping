const isProd = process.env.NODE_ENV === 'production';

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'Data tidak ditemukan',
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Format data tidak valid';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Sesi login sudah habis, silakan login lagi';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Token tidak valid';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran file maksimal 2MB'
      : 'Gagal upload file';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Data sudah terdaftar';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409;
    message = 'Data masih dipakai, tidak bisa dihapus';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    message = 'Data terkait tidak ditemukan';
  } else if (err.code === 'ER_BAD_NULL_ERROR') {
    status = 400;
    message = 'Mohon lengkapi data terlebih dahulu';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    status = 503;
    message = 'Terjadi kesalahan, silakan coba kembali';
  }

  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
    if (isProd || err.code) message = 'Terjadi kesalahan, silakan coba kembali';
  }

  if (res.headersSent) return next(err);

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };