const multer = require('multer');
const path = require('path');
const fs = require('fs');

const folder = path.join(__dirname, '../../uploads/bukti');
fs.mkdirSync(folder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, folder),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bukti-${req.params.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  cb(ok ? null : new Error('FORMAT_SALAH'), ok);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } }); // maks 2 MB
