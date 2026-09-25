const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/alat.controller');

const rules = [
  body('nama_alat').trim().notEmpty().withMessage('Nama alat wajib diisi'),
  body('harga_sewa_per_hari').isFloat({ min: 0 }).withMessage('Harga tidak valid'),
  body('stok').optional().isInt({ min: 0 }).withMessage('Stok tidak valid'),
];

router.get('/', c.list);
router.get('/:id', param('id').isInt(), validate, c.detail);

router.post('/', authenticate, authorize('admin'), rules, validate, c.create);
router.put('/:id', authenticate, authorize('admin'), param('id').isInt(), rules, validate, c.update);
router.delete('/:id', authenticate, authorize('admin'), param('id').isInt(), validate, c.remove);

module.exports = router;
