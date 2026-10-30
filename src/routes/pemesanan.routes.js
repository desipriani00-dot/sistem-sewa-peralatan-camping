const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/pemesanan.controller');
const invoice = require('../controllers/invoice.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const WAJIB = 'Mohon lengkapi data terlebih dahulu';

const aturanPesanan = [
  body('tanggal_sewa')
    .notEmpty().withMessage(WAJIB).bail()
    .isISO8601().withMessage('Format tanggal sewa tidak valid'),
  body('tanggal_kembali_rencana')
    .notEmpty().withMessage(WAJIB).bail()
    .isISO8601().withMessage('Format tanggal kembali tidak valid'),
  body('items')
    .isArray({ min: 1 }).withMessage('Pilih minimal satu alat terlebih dahulu'),
  body('items.*.id_alat')
    .isInt({ min: 1 }).withMessage('Data alat tidak valid'),
  body('items.*.jumlah')
    .isInt({ min: 1, max: 100 }).withMessage('Jumlah alat harus angka 1 sampai 100'),
];

const aturanId = param('id').isInt({ min: 1 }).withMessage('Data pemesanan tidak ditemukan');

router.post('/', verifyToken, requireRole('pelanggan'), aturanPesanan, validate, c.buat);
router.get('/saya', verifyToken, c.saya);
router.get('/verifikasi/:id', invoice.verifikasi);
router.get('/', verifyToken, requireRole('admin'), c.semua);

// Route baru untuk ACC/Tolak pesanan
router.patch(
  '/:id/status',
  verifyToken,
  requireRole('admin'),
  [aturanId, body('status').notEmpty().withMessage(WAJIB)],
  validate,
  c.ubahStatus
);
router.get('/:id/invoice', verifyToken, invoice.unduh);
router.get('/:id', verifyToken, c.detail);
router.patch('/:id/batal', verifyToken, aturanId, validate, c.batalkan);

module.exports = router;