const router = require('express').Router();
const c = require('../controllers/alat.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/kategori', c.getKategori);
router.get('/', c.getAll);
router.get('/:id', c.getOne);
router.post('/', verifyToken, requireRole('admin'), c.create);
router.put('/:id', verifyToken, requireRole('admin'), c.update);
router.delete('/:id', verifyToken, requireRole('admin'), c.remove);

module.exports = router;
