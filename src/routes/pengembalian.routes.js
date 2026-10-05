const router = require('express').Router();
const c = require('../controllers/pengembalian.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.patch('/:id/serahkan', verifyToken, requireRole('admin'), c.serahkan);
router.post('/:id', verifyToken, requireRole('admin'), c.catat);

module.exports = router;
