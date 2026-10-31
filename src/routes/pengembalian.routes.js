const router = require('express').Router();
const c = require('../controllers/pengembalian.controller');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM pengembalian ORDER BY id_pengembalian DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/serahkan', verifyToken, requireRole('admin'), c.serahkan);
router.post('/:id', verifyToken, requireRole('admin'), c.catat);

module.exports = router;