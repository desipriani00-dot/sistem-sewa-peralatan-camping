const db = require('../config/db');
const { success, fail } = require('../utils/response');
const { sisaStok } = require('../services/stok.service');

// Sesuai schema_sewa_camping.sql:
// pemesanan(id_pemesanan, id_user, tanggal_pesan, tanggal_sewa, tanggal_kembali_rencana, total_harga, status_pemesanan)
//   status_pemesanan: menunggu | dibayar | dipinjam | selesai | dibatalkan
// keranjang_detail(id_detail, id_pemesanan, id_alat, jumlah, durasi_hari, subtotal)  -> isi item pesanan

const TGL = /^\d{4}-\d{2}-\d{2}$/;
const hitungHari = (mulai, selesai) =>
  Math.round((new Date(selesai) - new Date(mulai)) / 86400000) + 1; // tanggal sama = 1 hari

exports.buat = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { tanggal_sewa, tanggal_kembali_rencana, items } = req.body;
    if (!TGL.test(tanggal_sewa || '') || !TGL.test(tanggal_kembali_rencana || '') || !Array.isArray(items) || !items.length) {
      return fail(res, 'tanggal_sewa dan tanggal_kembali_rencana (format YYYY-MM-DD) serta items wajib diisi');
    }
    const hari = hitungHari(tanggal_sewa, tanggal_kembali_rencana);
    if (!(hari >= 1)) return fail(res, 'Tanggal kembali tidak boleh sebelum tanggal sewa');
    const hariIni = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (tanggal_sewa < hariIni) return fail(res, 'Tanggal sewa tidak boleh sebelum hari ini');

    // Gabungkan item yang alatnya sama (tabel keranjang_detail unik per pesanan + alat)
    const gabung = new Map();
    for (const it of items) {
      const jumlah = parseInt(it.jumlah, 10);
      const id = parseInt(it.id_alat, 10);
      if (!id || !(jumlah >= 1)) return fail(res, 'Setiap item butuh id_alat dan jumlah minimal 1');
      gabung.set(id, (gabung.get(id) || 0) + jumlah);
    }

    await conn.beginTransaction();

    const [p] = await conn.query(
      `INSERT INTO pemesanan (id_user, tanggal_sewa, tanggal_kembali_rencana, total_harga)
       VALUES (?, ?, ?, 0)`, [req.user.id, tanggal_sewa, tanggal_kembali_rencana]);

    let total = 0;
    for (const [idAlat, jumlah] of gabung) {
      const [[alat]] = await conn.query(
        'SELECT id_alat, nama_alat, harga_sewa_per_hari FROM alat WHERE id_alat = ?', [idAlat]);
      if (!alat) throw new Error('ALAT_TIDAK_ADA');

      const sisa = await sisaStok(conn, idAlat, tanggal_sewa, tanggal_kembali_rencana);
      if (sisa < jumlah) {
        const err = new Error('STOK_KURANG');
        err.namaAlat = alat.nama_alat;
        err.sisa = sisa;
        throw err;
      }

      const subtotal = Number(alat.harga_sewa_per_hari) * jumlah * hari;
      total += subtotal;
      await conn.query(
        `INSERT INTO keranjang_detail (id_pemesanan, id_alat, jumlah, durasi_hari, subtotal)
         VALUES (?, ?, ?, ?, ?)`, [p.insertId, idAlat, jumlah, hari, subtotal]);
    }

    await conn.query('UPDATE pemesanan SET total_harga = ? WHERE id_pemesanan = ?', [total, p.insertId]);
    await conn.commit();
    return success(res, { id_pemesanan: p.insertId, total_harga: total, durasi_hari: hari }, 'Pesanan dibuat', 201);
  } catch (e) {
    await conn.rollback();
    if (e.message === 'STOK_KURANG') return fail(res, `Stok ${e.namaAlat} tidak cukup di tanggal itu (sisa ${Math.max(0, e.sisa)})`, 409);
    if (e.message === 'ALAT_TIDAK_ADA') return fail(res, 'Ada alat yang tidak ditemukan', 404);
    console.error(e); return fail(res, 'Server error', 500);
  } finally {
    conn.release();
  }
};

exports.saya = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*,
              e.id_evaluasi,
              e.rating,
              e.ulasan,
              e.tanggal_ulasan
       FROM pemesanan p
       LEFT JOIN evaluasi e
         ON e.id_pemesanan = p.id_pemesanan
       WHERE p.id_user = ?
       ORDER BY p.id_pemesanan DESC`,
      [req.user.id]
    );

    return success(res, rows);
  } catch (e) {
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};

exports.semua = async (req, res) => {
  try {
    const { status } = req.query;
    const [rows] = await db.query(
      `SELECT p.*, u.nama AS nama_penyewa FROM pemesanan p JOIN users u ON u.id_user = p.id_user
       ${status ? 'WHERE p.status_pemesanan = ?' : ''} ORDER BY p.id_pemesanan DESC`,
      status ? [status] : []
    );
    return success(res, rows);
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.detail = async (req, res) => {
  try {
    const [[p]] = await db.query('SELECT * FROM pemesanan WHERE id_pemesanan = ?', [req.params.id]);
    if (!p) return fail(res, 'Pesanan tidak ditemukan', 404);
    if (
  !['admin', 'manager'].includes(req.user.role) &&
  p.id_user !== req.user.id
) {
  return fail(res, 'Bukan pesanan kamu', 403);
}
    const [items] = await db.query(
      `SELECT k.*, a.nama_alat FROM keranjang_detail k JOIN alat a ON a.id_alat = k.id_alat
       WHERE k.id_pemesanan = ?`, [p.id_pemesanan]);
    return success(res, { ...p, items });
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

exports.batalkan = async (req, res) => {
  try {
    const [[p]] = await db.query('SELECT * FROM pemesanan WHERE id_pemesanan = ?', [req.params.id]);
    if (!p) return fail(res, 'Pesanan tidak ditemukan', 404);
    if (p.id_user !== req.user.id) return fail(res, 'Bukan pesanan kamu', 403);
    if (p.status_pemesanan !== 'menunggu') return fail(res, 'Pesanan ini tidak bisa dibatalkan');

    const [[bayar]] = await db.query(
      "SELECT COUNT(*) AS n FROM pembayaran WHERE id_pemesanan = ? AND status_pembayaran = 'menunggu'",
      [p.id_pemesanan]);
    if (bayar.n > 0) return fail(res, 'Bukti bayar sedang diverifikasi, pesanan belum bisa dibatalkan');

    await db.query("UPDATE pemesanan SET status_pemesanan = 'dibatalkan' WHERE id_pemesanan = ?", [p.id_pemesanan]);
    return success(res, null, 'Pesanan dibatalkan');
  } catch (e) { console.error(e); return fail(res, 'Server error', 500); }
};

/* =========================
   ACC / TOLAK PESANAN ADMIN
========================= */
exports.ubahStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id < 1) {
      return fail(res, 'ID pesanan tidak valid', 400);
    }

    if (!['disetujui', 'ditolak'].includes(status)) {
      return fail(res, 'Status harus disetujui atau ditolak', 400);
    }

    const [[pesanan]] = await db.query(
      'SELECT id_pemesanan, status_pemesanan FROM pemesanan WHERE id_pemesanan = ?',
      [id]
    );

    if (!pesanan) {
      return fail(res, `Pesanan dengan ID ${id} tidak ditemukan`, 404);
    }

    if (pesanan.status_pemesanan !== 'menunggu') {
      return fail(
        res,
        `Pesanan tidak bisa diubah karena statusnya ${pesanan.status_pemesanan}`,
        400
      );
    }

    await db.query(
      'UPDATE pemesanan SET status_pemesanan = ? WHERE id_pemesanan = ?',
      [status === 'disetujui' ? 'dibayar' : 'dibatalkan', id]
    );

    return success(
      res,
      {
        id_pemesanan: id,
        status_pemesanan: status === 'disetujui' ? 'dibayar' : 'dibatalkan'
      },
      status === 'disetujui'
        ? 'Pesanan berhasil disetujui'
        : 'Pesanan berhasil ditolak'
    );
  } catch (e) {
    console.error('Gagal mengubah status pesanan:', e);
    return fail(res, 'Server error', 500);
  }
};
