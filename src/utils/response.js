exports.success = (res, data = null, message = 'Berhasil', status = 200) =>
  res.status(status).json({ success: true, message, data });

exports.fail = (res, message = 'Terjadi kesalahan', status = 400) =>
  res.status(status).json({ success: false, message });
