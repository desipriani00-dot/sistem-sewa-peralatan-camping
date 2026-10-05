const router = require('express').Router();
const c = require('../controllers/pemesanan.controller');
const invoice = require('../controllers/invoice.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/', verifyToken, requireRole('pelanggan'), c.buat);
router.get('/saya', verifyToken, c.saya);
router.get('/verifikasi/:id', invoice.verifikasi);            // publik, tujuan QR code
router.get('/', verifyToken, requireRole('admin'), c.semua);
router.get('/:id/invoice', verifyToken, invoice.unduh);
router.get('/:id', verifyToken, c.detail);
router.patch('/:id/batal', verifyToken, c.batalkan);

module.exports = router;
