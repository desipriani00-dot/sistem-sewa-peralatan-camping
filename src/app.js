const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Koneksi ke Database sewa_camping
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sewa_camping'
});

db.connect((err) => {
  if (err) {
    console.error('Koneksi DB gagal:', err.message);
  } else {
    console.log('Terhubung ke database MySQL sewa_camping!');
  }
});

// Menghubungkan folder public (tempat file html kamu)
app.use(express.static(path.join(__dirname, '../public')));

// API Peralatan
app.get('/api/peralatan', (req, res) => {
  db.query('SELECT * FROM peralatan', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Server jalan di http://localhost:${port}`);
});