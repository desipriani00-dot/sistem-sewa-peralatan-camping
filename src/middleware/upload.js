const multer = require('multer');
const path = require('path');
const fs = require('fs');

const folder = path.resolve(__dirname, '../../uploads/bukti');

fs.mkdirSync(folder, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('UPLOAD MASUK:', folder);
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `bukti-${req.params.id}-${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const ok = allowed.includes(file.mimetype);

    cb(ok ? null : new Error('FORMAT_SALAH'), ok);
};

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});