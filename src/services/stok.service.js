// Hitung sisa stok sebuah alat pada rentang tanggal tertentu.
// Pesanan yang MASIH memegang alat: status_pemesanan di daftar STATUS_AKTIF.
// (dibatalkan dan selesai tidak dihitung, jadi stok otomatis bebas lagi)
// Dipanggil di dalam transaksi (conn) supaya aman dari dua pesanan bersamaan.

const STATUS_AKTIF = ['menunggu', 'dibayar', 'dipinjam'];

exports.STATUS_AKTIF = STATUS_AKTIF;

exports.sisaStok = async (conn, idAlat, mulai, selesai) => {
  // FOR UPDATE = kunci baris alat ini, pesanan lain harus menunggu sampai transaksi selesai
  const [[alat]] = await conn.query('SELECT id_alat, stok FROM alat WHERE id_alat = ? FOR UPDATE', [idAlat]);
  if (!alat) return null;

  const [[pakai]] = await conn.query(
    `SELECT COALESCE(SUM(k.jumlah), 0) AS dipakai
     FROM keranjang_detail k
     JOIN pemesanan p ON p.id_pemesanan = k.id_pemesanan
     WHERE k.id_alat = ?
       AND p.status_pemesanan IN (${STATUS_AKTIF.map(() => '?').join(',')})
       AND p.tanggal_sewa <= ? AND p.tanggal_kembali_rencana >= ?`,
    [idAlat, ...STATUS_AKTIF, selesai, mulai]
  );
  return Number(alat.stok) - Number(pakai.dipakai);
};
