const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/pengembalian.controller');

router.post('/',
  authenticate, authorize('admin'),
  body('id_pemesanan').isInt({ min: 1 }),
  body('tanggal_kembali_aktual').isISO8601(),
  body('kondisi_alat').optional().isIn(['baik', 'rusak_ringan', 'rusak_berat', 'hilang']),
  validate, c.create);

module.exports = router;
