const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/pembayaran.controller');

router.use(authenticate);

router.post('/',
  authorize('pelanggan'),
  body('id_pemesanan').isInt({ min: 1 }),
  body('jumlah_bayar').isFloat({ gt: 0 }),
  body('metode_pembayaran').trim().notEmpty(),
  validate, c.create);

router.patch('/:id/verifikasi',
  authorize('admin'),
  param('id').isInt(),
  body('status').isIn(['berhasil', 'ditolak']),
  validate, c.verifikasi);

module.exports = router;
