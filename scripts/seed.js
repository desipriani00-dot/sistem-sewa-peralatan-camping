const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sewa_camping'
});

db.connect((err) => {
  if (err) {
    console.error('Koneksi database gagal:', err.message);
    return;
  }
  console.log('Berhasil terhubung ke database sewa_camping!');

  // 1. Buat Tabel Peralatan
  const sqlTabelPeralatan = `
    CREATE TABLE IF NOT EXISTS peralatan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama_barang VARCHAR(100) NOT NULL,
      harga_sewa INT NOT NULL,
      stok INT NOT NULL
    )
  `;

  db.query(sqlTabelPeralatan, (err) => {
    if (err) throw err;
    console.log('Tabel peralatan siap!');

    // 2. Isi Data Awal Peralatan
    const sqlIsiData = `
      INSERT INTO peralatan (nama_barang, harga_sewa, stok) VALUES
      ('Tenda Kapasitas 4 Orang', 50000, 10),
      ('Sleeping Bag', 15000, 20),
      ('Kompor Portable', 20000, 15),
      ('Carrier 60 Liter', 35000, 8)
      ON DUPLICATE KEY UPDATE nama_barang=VALUES(nama_barang);
    `;

    db.query(sqlIsiData, (err) => {
      if (err) throw err;
      console.log('Data awal peralatan berhasil dimasukkan!');
      db.end();
    });
  });
});