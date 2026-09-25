const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/pemesanan.controller');

router.use(authenticate);

router.post('/',
  authorize('pelanggan'),
  body('tanggal_sewa').isISO8601().withMessage('Tanggal sewa tidak valid'),
  body('tanggal_kembali_rencana').isISO8601().withMessage('Tanggal kembali tidak valid'),
  body('items').isArray({ min: 1 }).withMessage('Minimal 1 alat'),
  body('items.*.id_alat').isInt({ min: 1 }),
  body('items.*.jumlah').isInt({ min: 1 }),
  validate, c.create);

router.get('/', c.list);
router.get('/:id', param('id').isInt(), validate, c.detail);

router.patch('/:id/status',
  authorize('admin'),
  param('id').isInt(),
  body('status').isIn(['dipinjam', 'dibatalkan']).withMessage('Status harus dipinjam atau dibatalkan'),
  validate, c.ubahStatus);

module.exports = router;
