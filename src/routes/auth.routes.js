const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/auth.controller');

router.post('/register',
  body('nama').trim().notEmpty().withMessage('Nama wajib diisi'),
  body('email').isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
  validate, c.register);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate, c.login);

router.get('/me', authenticate, c.me);

module.exports = router;
