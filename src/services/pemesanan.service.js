const pool = require('../config/db');
const AppError = require('../utils/AppError');

const DAY = 24 * 60 * 60 * 1000;
const hitungDurasi = (mulai, akhir) => {
  const d = Math.ceil((new Date(akhir) - new Date(mulai)) / DAY);
  return Math.max(d, 1);
};

// Buat pemesanan + detail + kurangi stok dalam SATU transaksi
exports.buat = async (idUser, { tanggal_sewa, tanggal_kembali_rencana, items }) => {
  if (new Date(tanggal_kembali_rencana) < new Date(tanggal_sewa)) {
    throw new AppError('Tanggal kembali tidak boleh sebelum tanggal sewa', 422);
  }
  const durasi = hitungDurasi(tanggal_sewa, tanggal_kembali_rencana);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [res] = await conn.execute(
      `INSERT INTO pemesanan (id_user, tanggal_sewa, tanggal_kembali_rencana)
       VALUES (?, ?, ?)`,
      [idUser, tanggal_sewa, tanggal_kembali_rencana]
    );
    const idPemesanan = res.insertId;
    let total = 0;

    for (const { id_alat, jumlah } of items) {
      const [rows] = await conn.execute(
        'SELECT nama_alat, harga_sewa_per_hari, stok FROM alat WHERE id_alat = ? FOR UPDATE',
        [id_alat]
      );
      if (!rows.length) throw new AppError(`Alat ${id_alat} tidak ditemukan`, 404);
      const alat = rows[0];
      if (alat.stok < jumlah) {
        throw new AppError(`Stok "${alat.nama_alat}" tidak cukup (tersisa ${alat.stok})`, 409);
      }

      const subtotal = Number(alat.harga_sewa_per_hari) * jumlah * durasi;
      total += subtotal;

      await conn.execute(
        `INSERT INTO keranjang_detail (id_pemesanan, id_alat, jumlah, durasi_hari, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idPemesanan, id_alat, jumlah, durasi, subtotal]
      );
      await conn.execute('UPDATE alat SET stok = stok - ? WHERE id_alat = ?', [jumlah, id_alat]);
    }

    await conn.execute('UPDATE pemesanan SET total_harga = ? WHERE id_pemesanan = ?', [
      total,
      idPemesanan,
    ]);
    await conn.commit();
    return { id_pemesanan: idPemesanan, total_harga: total, durasi_hari: durasi };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Kembalikan stok semua alat dalam pemesanan (dipakai saat batal / dikembalikan)
exports.kembalikanStok = async (conn, idPemesanan) => {
  await conn.execute(
    `UPDATE alat a
       JOIN keranjang_detail d ON d.id_alat = a.id_alat
        SET a.stok = a.stok + d.jumlah
      WHERE d.id_pemesanan = ?`,
    [idPemesanan]
  );
};

// Ubah status oleh admin (dipinjam / dibatalkan)
exports.ubahStatus = async (idPemesanan, status) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT status_pemesanan FROM pemesanan WHERE id_pemesanan = ? FOR UPDATE',
      [idPemesanan]
    );
    if (!rows.length) throw new AppError('Pemesanan tidak ditemukan', 404);
    const sekarang = rows[0].status_pemesanan;

    if (['selesai', 'dibatalkan'].includes(sekarang)) {
      throw new AppError(`Pemesanan sudah ${sekarang}`, 409);
    }
    if (status === 'dipinjam' && sekarang !== 'dibayar') {
      throw new AppError('Pemesanan harus berstatus "dibayar" sebelum dipinjam', 409);
    }
    if (status === 'dibatalkan') await exports.kembalikanStok(conn, idPemesanan);

    await conn.execute('UPDATE pemesanan SET status_pemesanan = ? WHERE id_pemesanan = ?', [
      status,
      idPemesanan,
    ]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
