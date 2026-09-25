exports.notFound = (req, res) =>
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });

// Express 5 otomatis meneruskan error dari handler async ke sini
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Data sudah ada (duplikat)';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409;
    message = 'Data masih dipakai oleh data lain';
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Terjadi kesalahan pada server';
  }
  res.status(status).json({ success: false, message });
};
