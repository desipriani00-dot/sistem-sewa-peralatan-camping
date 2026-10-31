const router = require('express').Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./auth.routes'));
router.use('/alat', require('./alat.routes'));
router.use('/pemesanan', require('./pemesanan.routes'));
router.use('/pembayaran', require('./pembayaran.routes'));
router.use('/pengembalian', require('./pengembalian.routes'));
router.use('/evaluasi', require('./evaluasi.routes'));
router.use('/ktp', require('./ktp.routes'));
router.use('/pelanggan', require('./pelanggan.routes'));
module.exports = router;