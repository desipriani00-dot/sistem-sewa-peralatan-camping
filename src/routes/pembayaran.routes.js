
const router = require('express').Router();
const c = require('../controllers/pembayaran.controller');
const upload = require('../middleware/upload');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin', 'manager'), c.daftar);

router.post(
  '/pemesanan/:id',
  verifyToken,
  requireRole('pelanggan'),
  upload.single('bukti'),
  c.upload
);

router.patch(
  '/:id/verifikasi',
  verifyToken,
  requireRole('admin', 'manager'),
  c.verifikasi
);

module.exports = router;
