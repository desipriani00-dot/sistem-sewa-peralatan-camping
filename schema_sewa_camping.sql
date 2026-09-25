-- =====================================================
-- Database Sistem Sewa Peralatan Camping (MySQL 8 / MariaDB)
-- =====================================================

CREATE DATABASE IF NOT EXISTS sewa_camping
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sewa_camping;

-- -----------------------------------------------------
-- 1. roles
-- -----------------------------------------------------
CREATE TABLE roles (
    id_role     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nama_role   VARCHAR(50)  NOT NULL,
    PRIMARY KEY (id_role),
    UNIQUE KEY uq_roles_nama (nama_role)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 2. users
-- -----------------------------------------------------
CREATE TABLE users (
    id_user     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_role     INT UNSIGNED NOT NULL,
    nama        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,          -- simpan hash (bcrypt/argon2)
    no_hp       VARCHAR(20)  NULL,
    alamat      TEXT         NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_user),
    UNIQUE KEY uq_users_email (email),
    CONSTRAINT fk_users_role FOREIGN KEY (id_role)
        REFERENCES roles (id_role)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 3. alat
-- -----------------------------------------------------
CREATE TABLE alat (
    id_alat              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nama_alat            VARCHAR(100)  NOT NULL,
    kategori             VARCHAR(50)   NULL,
    deskripsi            TEXT          NULL,
    harga_sewa_per_hari  DECIMAL(12,2) NOT NULL,
    stok                 INT UNSIGNED  NOT NULL DEFAULT 0,
    gambar               VARCHAR(255)  NULL,
    PRIMARY KEY (id_alat),
    CONSTRAINT chk_alat_harga CHECK (harga_sewa_per_hari >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 4. pemesanan
-- -----------------------------------------------------
CREATE TABLE pemesanan (
    id_pemesanan             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_user                  INT UNSIGNED  NOT NULL,
    tanggal_pesan            DATE          NOT NULL DEFAULT (CURRENT_DATE),
    tanggal_sewa             DATE          NOT NULL,
    tanggal_kembali_rencana  DATE          NOT NULL,
    total_harga              DECIMAL(12,2) NOT NULL DEFAULT 0,
    status_pemesanan         ENUM('menunggu','dibayar','dipinjam','selesai','dibatalkan')
                             NOT NULL DEFAULT 'menunggu',
    PRIMARY KEY (id_pemesanan),
    KEY idx_pemesanan_user (id_user),
    CONSTRAINT fk_pemesanan_user FOREIGN KEY (id_user)
        REFERENCES users (id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_pemesanan_tanggal CHECK (tanggal_kembali_rencana >= tanggal_sewa)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 5. keranjang_detail (detail alat per pemesanan)
-- -----------------------------------------------------
CREATE TABLE keranjang_detail (
    id_detail     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_pemesanan  INT UNSIGNED  NOT NULL,
    id_alat       INT UNSIGNED  NOT NULL,
    jumlah        INT UNSIGNED  NOT NULL DEFAULT 1,
    durasi_hari   INT UNSIGNED  NOT NULL DEFAULT 1,
    subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_detail),
    UNIQUE KEY uq_detail_pesanan_alat (id_pemesanan, id_alat),
    KEY idx_detail_alat (id_alat),
    CONSTRAINT fk_detail_pemesanan FOREIGN KEY (id_pemesanan)
        REFERENCES pemesanan (id_pemesanan)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detail_alat FOREIGN KEY (id_alat)
        REFERENCES alat (id_alat)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_detail_jumlah CHECK (jumlah > 0 AND durasi_hari > 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 6. pembayaran
-- -----------------------------------------------------
CREATE TABLE pembayaran (
    id_pembayaran      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_pemesanan       INT UNSIGNED  NOT NULL,
    tanggal_bayar      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    jumlah_bayar       DECIMAL(12,2) NOT NULL,
    metode_pembayaran  VARCHAR(50)   NOT NULL,   -- transfer, e-wallet, tunai, dll
    bukti_bayar        VARCHAR(255)  NULL,
    status_pembayaran  ENUM('menunggu','berhasil','ditolak') NOT NULL DEFAULT 'menunggu',
    PRIMARY KEY (id_pembayaran),
    KEY idx_pembayaran_pesanan (id_pemesanan),
    CONSTRAINT fk_pembayaran_pemesanan FOREIGN KEY (id_pemesanan)
        REFERENCES pemesanan (id_pemesanan)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_pembayaran_jumlah CHECK (jumlah_bayar > 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 7. pengembalian (relasi 1:0..1 dengan pemesanan)
-- -----------------------------------------------------
CREATE TABLE pengembalian (
    id_pengembalian         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_pemesanan            INT UNSIGNED  NOT NULL,
    tanggal_kembali_aktual  DATE          NOT NULL,
    hari_terlambat          INT UNSIGNED  NOT NULL DEFAULT 0,
    denda                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    kondisi_alat            ENUM('baik','rusak_ringan','rusak_berat','hilang') NOT NULL DEFAULT 'baik',
    catatan                 TEXT          NULL,
    PRIMARY KEY (id_pengembalian),
    UNIQUE KEY uq_pengembalian_pesanan (id_pemesanan),
    CONSTRAINT fk_pengembalian_pemesanan FOREIGN KEY (id_pemesanan)
        REFERENCES pemesanan (id_pemesanan)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Data awal
-- -----------------------------------------------------
INSERT INTO roles (nama_role) VALUES ('admin'), ('pelanggan');
