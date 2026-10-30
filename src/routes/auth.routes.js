
const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const uploadKtp = require('../middleware/uploadKtp');

const WAJIB = 'Mohon lengkapi data terlebih dahulu';

const aturanNama = body('nama')
  .trim().notEmpty().withMessage(WAJIB).bail()
  .isLength({ min: 2, max: 100 })
  .withMessage('Nama harus 2 sampai 100 karakter');

const aturanEmail = body('email')
  .trim().notEmpty().withMessage(WAJIB).bail()
  .isEmail().withMessage('Format email tidak valid').bail()
  .isLength({ max: 100 })
  .withMessage('Email maksimal 100 karakter');

const aturanPassword = (field) => body(field)
  .notEmpty().withMessage(WAJIB).bail()
  .isLength({ min: 6, max: 72 })
  .withMessage('Password harus 6 sampai 72 karakter');

const aturanHp = body('no_hp')
  .optional({ values: 'falsy' })
  .matches(/^\+?[0-9]{8,15}$/)
  .withMessage('Nomor HP harus 8 sampai 15 digit');

const aturanAlamat = body('alamat')
  .optional({ values: 'falsy' })
  .isLength({ max: 255 })
  .withMessage('Alamat maksimal 255 karakter');

router.post(
  '/register',
  uploadKtp.single('foto_ktp'),
  [
    body('username').trim().notEmpty().withMessage(WAJIB)
      .isLength({ min: 3, max: 50 })
      .withMessage('Username harus 3 sampai 50 karakter'),
    aturanNama,
    aturanEmail,
    aturanPassword('password'),
    aturanHp,
    aturanAlamat,
    body('nomor_ktp').matches(/^[0-9]{16}$/)
      .withMessage('Nomor KTP harus tepat 16 digit'),
  ],
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
  '/ktp',
  verifyToken,
  uploadKtp.single('foto_ktp'),
  [
    body('nomor_ktp').optional()
      .matches(/^[0-9]{16}$/)
      .withMessage('Nomor KTP harus tepat 16 digit'),
  ],
  validate,
  auth.ubahKtp
);

router.put(
  '/password',
  verifyToken,
  [
    body('lama').notEmpty().withMessage(WAJIB),
    aturanPassword('baru'),
  ],
  validate,
  auth.ubahPassword
);

module.exports = router;
