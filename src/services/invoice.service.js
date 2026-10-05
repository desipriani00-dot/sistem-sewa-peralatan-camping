const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const rupiah = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const tgl = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const kode = (id) => 'INV-' + String(id).padStart(5, '0');

exports.kode = kode;

// Menulis PDF langsung ke response. verifyUrl = isi QR code.
exports.buatInvoice = async (res, p, items, verifyUrl) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);
  const qr = await QRCode.toBuffer(verifyUrl, { width: 200, margin: 1 });
  const hari = items.length ? items[0].durasi_hari : 1;

  doc.fontSize(22).text('INVOICE', 50, 50);
  doc.fontSize(10).fillColor('#555').text('Sewa Peralatan Camping', 50, 78);
  doc.fillColor('#000').fontSize(11)
    .text(kode(p.id_pemesanan), 350, 50, { width: 195, align: 'right' })
    .text(`Status: ${p.status_pemesanan}`, 350, 68, { width: 195, align: 'right' });

  doc.fontSize(11)
    .text(`Penyewa : ${p.nama_penyewa}`, 50, 120)
    .text(`Email      : ${p.email}`, 50, 136)
    .text(`Periode   : ${tgl(p.tanggal_sewa)} - ${tgl(p.tanggal_kembali_rencana)} (${hari} hari)`, 50, 152);

  const kol = { alat: 50, jml: 280, harga: 330, hari: 410, sub: 450 };
  let y = 195;
  doc.fontSize(10).fillColor('#555');
  doc.text('Alat', kol.alat, y).text('Jml', kol.jml, y).text('Harga/hari', kol.harga, y)
     .text('Hari', kol.hari, y).text('Subtotal', kol.sub, y, { width: 95, align: 'right' });
  y += 16;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#bbb').stroke();
  y += 8;

  doc.fillColor('#000');
  for (const it of items) {
    if (y > 700) { doc.addPage(); y = 50; }
    // Harga per hari dihitung dari subtotal, jadi tetap benar walau harga alat berubah belakangan
    const hargaHari = Number(it.subtotal) / (it.jumlah * it.durasi_hari);
    doc.text(it.nama_alat, kol.alat, y, { width: 220 })
       .text(String(it.jumlah), kol.jml, y)
       .text(rupiah(hargaHari), kol.harga, y)
       .text(String(it.durasi_hari), kol.hari, y)
       .text(rupiah(it.subtotal), kol.sub, y, { width: 95, align: 'right' });
    y += 22;
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#bbb').stroke();
  y += 10;
  doc.fontSize(12).text('Total', kol.harga, y)
     .text(rupiah(p.total_harga), kol.sub, y, { width: 95, align: 'right' });

  if (y > 600) { doc.addPage(); y = 50; } else { y += 50; }
  doc.image(qr, 50, y, { width: 100 });
  doc.fontSize(9).fillColor('#555')
    .text('Scan untuk memeriksa keaslian invoice', 160, y + 40, { width: 250 });

  doc.end();
};
