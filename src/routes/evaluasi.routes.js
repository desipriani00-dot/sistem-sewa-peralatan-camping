const router = require('express').Router();
const c = require('../controllers/evaluasi.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/', verifyToken, requireRole('pelanggan'), c.buat);
router.get('/saya', verifyToken, requireRole('pelanggan'), c.saya);
router.get('/', verifyToken, requireRole('manager'), c.semua);

module.exports = router;