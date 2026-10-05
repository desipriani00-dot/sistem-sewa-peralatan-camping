const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', verifyToken, auth.me);

router.put('/profil', verifyToken, auth.ubahProfil);
router.put('/password', verifyToken, auth.ubahPassword);

module.exports = router;
