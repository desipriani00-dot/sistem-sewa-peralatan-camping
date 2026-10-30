
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const folder = path.join(__dirname, '../../private-ktp');
fs.mkdirSync(folder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, folder),
  filename: (req, file, cb) => {
    cb(null, `ktp-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(allowed.includes(file.mimetype) ? null : new Error('FORMAT_SALAH'),
    allowed.includes(file.mimetype));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
