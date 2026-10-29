
const router = require('express').Router();
const c = require('../controllers/pemesanan.controller');
const invoice = require('../controllers/invoice.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/', verifyToken, requireRole('pelanggan'), c.buat);
router.get('/saya', verifyToken, c.saya);
router.get('/verifikasi/:id', invoice.verifikasi);
router.get('/', verifyToken, requireRole('admin'), c.semua);

// Route baru untuk ACC/Tolak pesanan
router.patch('/:id/status', verifyToken, requireRole('admin'), c.ubahStatus);
router.get('/:id/invoice', verifyToken, invoice.unduh);
router.get('/:id', verifyToken, c.detail);
router.patch('/:id/batal', verifyToken, c.batalkan);

module.exports = router;
