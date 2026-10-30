const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ktp = require('../controllers/ktp.controller');

router.get('/', verifyToken, requireRole('admin'), ktp.daftar);
router.get('/:id/foto', verifyToken, requireRole('admin'), ktp.foto);
router.patch('/:id/verifikasi', verifyToken, requireRole('admin'), ktp.verifikasi);

module.exports = router;