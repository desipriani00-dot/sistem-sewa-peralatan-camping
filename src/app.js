const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Halaman pelanggan, admin, dan manager
app.use(express.static(path.join(__dirname, '../public')));

// File bukti pembayaran
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Muat semua API melalui satu pintu
app.use('/api', require('./routes'));

// Penanganan error global (harus paling bawah)
const { notFound, errorHandler } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

module.exports = app;