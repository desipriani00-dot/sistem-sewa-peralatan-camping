const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const WAJIB = 'Mohon lengkapi data terlebih dahulu';

const aturanNama = body('nama')
  .trim().notEmpty().withMessage(WAJIB).bail()
  .isLength({ min: 2, max: 100 }).withMessage('Nama harus 2 sampai 100 karakter');

const aturanEmail = body('email')
  .trim().notEmpty().withMessage(WAJIB).bail()
  .isEmail().withMessage('Format email tidak valid').bail()
  .isLength({ max: 100 }).withMessage('Email maksimal 100 karakter');

const aturanPassword = (field) => body(field)
  .notEmpty().withMessage(WAJIB).bail()
  .isLength({ min: 6 }).withMessage('Password minimal 6 karakter').bail()
  .isLength({ max: 72 }).withMessage('Password maksimal 72 karakter');

const aturanHp = body('no_hp')
  .optional({ values: 'falsy' })
  .matches(/^\+?[0-9]{8,15}$/).withMessage('Nomor HP harus berupa angka (8 sampai 15 digit)');

const aturanAlamat = body('alamat')
  .optional({ values: 'falsy' })
  .isLength({ max: 255 }).withMessage('Alamat maksimal 255 karakter');

router.post(
  '/register',
  [aturanNama, aturanEmail, aturanPassword('password'), aturanHp, aturanAlamat],
  validate,
  auth.register
);

router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage(WAJIB),
    body('password').notEmpty().withMessage(WAJIB),
  ],
  validate,
  auth.login
);

router.get('/me', verifyToken, auth.me);

router.put(
  '/profil',
  verifyToken,
  [aturanNama, aturanEmail, aturanHp, aturanAlamat],
  validate,
  auth.ubahProfil
);

router.put(
  '/password',
  verifyToken,
  [body('lama').notEmpty().withMessage(WAJIB), aturanPassword('baru')],
  validate,
  auth.ubahPassword
);

module.exports = router;