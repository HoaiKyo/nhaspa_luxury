-- ============================================================
-- NHÀ SPA MANAGEMENT SYSTEM — DATABASE CREATION & SEED DATA
-- SQL Server
-- Mỗi bảng 20 bản ghi seed. Các field hình ảnh để NULL.
-- ============================================================

-- Tạo database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'spa_db')
BEGIN
    CREATE DATABASE spa_db;
END
GO

USE spa_db;
GO

-- ============================================================
-- 1. VAI_TRO (Roles)
-- ============================================================
IF OBJECT_ID('nguoi_dung_vai_tro', 'U') IS NOT NULL DROP TABLE nguoi_dung_vai_tro;
IF OBJECT_ID('chi_tiet_lich_hen', 'U') IS NOT NULL DROP TABLE chi_tiet_lich_hen;
IF OBJECT_ID('khach_di_kem', 'U') IS NOT NULL DROP TABLE khach_di_kem;
IF OBJECT_ID('chi_tiet_hoa_don', 'U') IS NOT NULL DROP TABLE chi_tiet_hoa_don;
IF OBJECT_ID('thanh_toan', 'U') IS NOT NULL DROP TABLE thanh_toan;
IF OBJECT_ID('hoa_don', 'U') IS NOT NULL DROP TABLE hoa_don;
IF OBJECT_ID('lich_hen', 'U') IS NOT NULL DROP TABLE lich_hen;
IF OBJECT_ID('combo_khach_hang', 'U') IS NOT NULL DROP TABLE combo_khach_hang;
IF OBJECT_ID('chi_tiet_combo', 'U') IS NOT NULL DROP TABLE chi_tiet_combo;
IF OBJECT_ID('nhan_vien_dich_vu', 'U') IS NOT NULL DROP TABLE nhan_vien_dich_vu;
IF OBJECT_ID('bang_gia', 'U') IS NOT NULL DROP TABLE bang_gia;
IF OBJECT_ID('chi_tiet_phieu_nhap', 'U') IS NOT NULL DROP TABLE chi_tiet_phieu_nhap;
IF OBJECT_ID('phieu_nhap', 'U') IS NOT NULL DROP TABLE phieu_nhap;
IF OBJECT_ID('ton_kho', 'U') IS NOT NULL DROP TABLE ton_kho;
IF OBJECT_ID('nghi_phep', 'U') IS NOT NULL DROP TABLE nghi_phep;
IF OBJECT_ID('lich_lam_viec', 'U') IS NOT NULL DROP TABLE lich_lam_viec;
IF OBJECT_ID('nhan_vien', 'U') IS NOT NULL DROP TABLE nhan_vien;
IF OBJECT_ID('ca_lam', 'U') IS NOT NULL DROP TABLE ca_lam;
IF OBJECT_ID('san_pham', 'U') IS NOT NULL DROP TABLE san_pham;
IF OBJECT_ID('danh_muc', 'U') IS NOT NULL DROP TABLE danh_muc;
IF OBJECT_ID('tin_tuc', 'U') IS NOT NULL DROP TABLE tin_tuc;
IF OBJECT_ID('banner', 'U') IS NOT NULL DROP TABLE banner;
IF OBJECT_ID('khuyen_mai', 'U') IS NOT NULL DROP TABLE khuyen_mai;
IF OBJECT_ID('nha_cung_cap', 'U') IS NOT NULL DROP TABLE nha_cung_cap;
IF OBJECT_ID('nguoi_dung', 'U') IS NOT NULL DROP TABLE nguoi_dung;
IF OBJECT_ID('vai_tro', 'U') IS NOT NULL DROP TABLE vai_tro;
GO

CREATE TABLE vai_tro (
    ma_vai_tro INT IDENTITY(1,1) PRIMARY KEY,
    ten_vai_tro NVARCHAR(50) NOT NULL UNIQUE,
    mo_ta NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 2. NGUOI_DUNG (Users)
-- ============================================================
CREATE TABLE nguoi_dung (
    ma_nguoi_dung INT IDENTITY(1,1) PRIMARY KEY,
    ho_ten NVARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mat_khau VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20) NULL UNIQUE,
    gioi_tinh VARCHAR(10) NULL,
    ngay_sinh DATETIME NULL,
    dia_chi NVARCHAR(255) NULL,
    anh_dai_dien VARCHAR(500) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 3. NGUOI_DUNG_VAI_TRO (User-Role junction)
-- ============================================================
CREATE TABLE nguoi_dung_vai_tro (
    ma_nguoi_dung INT NOT NULL,
    ma_vai_tro INT NOT NULL,
    ngay_gan DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (ma_nguoi_dung, ma_vai_tro),
    FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_vai_tro) REFERENCES vai_tro(ma_vai_tro)
);
GO

-- ============================================================
-- 4. DANH_MUC (Categories)
-- ============================================================
CREATE TABLE danh_muc (
    ma_danh_muc INT IDENTITY(1,1) PRIMARY KEY,
    ten_danh_muc NVARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    mo_ta NVARCHAR(500) NULL,
    icon VARCHAR(50) NULL,
    thu_tu INT DEFAULT 0,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 5. SAN_PHAM (Products/Services/Packages)
-- ============================================================
CREATE TABLE san_pham (
    ma_san_pham INT IDENTITY(1,1) PRIMARY KEY,
    ma_danh_muc INT NOT NULL,
    ten_san_pham NVARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    mo_ta NTEXT NULL,
    mo_ta_ngan NVARCHAR(500) NULL,
    hinh_anh VARCHAR(500) NULL,
    loai VARCHAR(20) NOT NULL DEFAULT 'SERVICE',
    thoi_luong INT NULL,
    thu_tu INT DEFAULT 0,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_danh_muc) REFERENCES danh_muc(ma_danh_muc)
);
GO

-- ============================================================
-- 6. BANG_GIA (Price List / History)
-- ============================================================
CREATE TABLE bang_gia (
    ma_bang_gia INT IDENTITY(1,1) PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    gia DECIMAL(18,2) NOT NULL,
    gia_goc DECIMAL(18,2) NULL,
    thoi_luong NVARCHAR(50) NULL,
    ngay_ap_dung DATETIME DEFAULT GETDATE(),
    ngay_ket_thuc DATETIME NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 7. CA_LAM (Work Shifts)
-- ============================================================
CREATE TABLE ca_lam (
    ma_ca INT IDENTITY(1,1) PRIMARY KEY,
    ten_ca NVARCHAR(50) NOT NULL,
    gio_bat_dau TIME NOT NULL,
    gio_ket_thuc TIME NOT NULL,
    mo_ta NVARCHAR(255) NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 8. NHAN_VIEN (Staff)
-- ============================================================
CREATE TABLE nhan_vien (
    ma_nhan_vien INT IDENTITY(1,1) PRIMARY KEY,
    ma_nguoi_dung INT NOT NULL UNIQUE,
    ma_nhan_vien_code VARCHAR(20) NULL UNIQUE,
    chuc_vu NVARCHAR(100) NULL,
    phong_ban NVARCHAR(100) NULL,
    ngay_vao_lam DATE NULL,
    trang_thai BIT DEFAULT 1,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung)
);
GO

-- ============================================================
-- 9. LICH_LAM_VIEC (Work Schedule)
-- ============================================================
CREATE TABLE lich_lam_viec (
    ma_lich INT IDENTITY(1,1) PRIMARY KEY,
    ma_nhan_vien INT NOT NULL,
    ma_ca INT NOT NULL,
    ngay_lam_viec DATE NOT NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien),
    FOREIGN KEY (ma_ca) REFERENCES ca_lam(ma_ca)
);
GO

-- ============================================================
-- 10. NGHI_PHEP (Leave Requests)
-- ============================================================
CREATE TABLE nghi_phep (
    ma_nghi_phep INT IDENTITY(1,1) PRIMARY KEY,
    ma_nhan_vien INT NOT NULL,
    ngay_bat_dau DATE NOT NULL,
    ngay_ket_thuc DATE NOT NULL,
    ly_do NVARCHAR(500) NULL,
    trang_thai VARCHAR(20) DEFAULT 'PENDING',
    nguoi_duyet INT NULL,
    ngay_duyet DATETIME NULL,
    ghi_chu_duyet NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien),
    FOREIGN KEY (nguoi_duyet) REFERENCES nhan_vien(ma_nhan_vien)
);
GO

-- ============================================================
-- 11. NHAN_VIEN_DICH_VU (Staff-Service assignment)
-- ============================================================
CREATE TABLE nhan_vien_dich_vu (
    ma_nhan_vien INT NOT NULL,
    ma_san_pham INT NOT NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (ma_nhan_vien, ma_san_pham),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 12. CHI_TIET_COMBO (Combo Details)
-- ============================================================
CREATE TABLE chi_tiet_combo (
    ma_chi_tiet INT IDENTITY(1,1) PRIMARY KEY,
    ma_combo INT NOT NULL,
    ma_dich_vu INT NOT NULL,
    so_luong INT DEFAULT 1,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_combo) REFERENCES san_pham(ma_san_pham),
    FOREIGN KEY (ma_dich_vu) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 13. COMBO_KHACH_HANG (Customer Combos)
-- ============================================================
CREATE TABLE combo_khach_hang (
    ma_combo_kh INT IDENTITY(1,1) PRIMARY KEY,
    ma_khach_hang INT NOT NULL,
    ma_combo INT NOT NULL,
    tong_so_luot INT NOT NULL,
    so_luot_con_lai INT NOT NULL,
    ngay_mua DATETIME DEFAULT GETDATE(),
    ngay_het_han DATETIME NULL,
    gia_mua DECIMAL(18,2) NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_khach_hang) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_combo) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 14. LICH_HEN (Appointments)
-- ============================================================
CREATE TABLE lich_hen (
    ma_lich_hen INT IDENTITY(1,1) PRIMARY KEY,
    ma_khach_hang INT NOT NULL,
    ngay_hen DATE NOT NULL,
    gio_bat_dau TIME NOT NULL,
    gio_ket_thuc TIME NULL,
    trang_thai VARCHAR(20) DEFAULT 'PENDING',
    ghi_chu NTEXT NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_khach_hang) REFERENCES nguoi_dung(ma_nguoi_dung)
);
GO

-- ============================================================
-- 15. KHACH_DI_KEM (Companion Guests)
-- ============================================================
CREATE TABLE khach_di_kem (
    ma_khach_di_kem INT IDENTITY(1,1) PRIMARY KEY,
    ma_lich_hen INT NOT NULL,
    ho_ten NVARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20) NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_lich_hen) REFERENCES lich_hen(ma_lich_hen)
);
GO

-- ============================================================
-- 16. CHI_TIET_LICH_HEN (Appointment Details)
-- ============================================================
CREATE TABLE chi_tiet_lich_hen (
    ma_chi_tiet INT IDENTITY(1,1) PRIMARY KEY,
    ma_lich_hen INT NOT NULL,
    ma_san_pham INT NOT NULL,
    ma_nhan_vien INT NULL,
    ma_khach_di_kem INT NULL,
    ma_combo_kh INT NULL,
    gio_bat_dau TIME NULL,
    gio_ket_thuc TIME NULL,
    gia DECIMAL(18,2) NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_lich_hen) REFERENCES lich_hen(ma_lich_hen),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien),
    FOREIGN KEY (ma_khach_di_kem) REFERENCES khach_di_kem(ma_khach_di_kem),
    FOREIGN KEY (ma_combo_kh) REFERENCES combo_khach_hang(ma_combo_kh)
);
GO

-- ============================================================
-- 17. KHUYEN_MAI (Promotions)
-- ============================================================
CREATE TABLE khuyen_mai (
    ma_khuyen_mai INT IDENTITY(1,1) PRIMARY KEY,
    ten_khuyen_mai NVARCHAR(200) NOT NULL,
    mo_ta NTEXT NULL,
    loai_giam VARCHAR(20) NOT NULL DEFAULT 'PERCENT',
    gia_tri_giam DECIMAL(18,2) NOT NULL,
    giam_toi_da DECIMAL(18,2) NULL,
    don_toi_thieu DECIMAL(18,2) NULL,
    ma_code VARCHAR(50) NULL UNIQUE,
    ngay_bat_dau DATETIME NOT NULL,
    ngay_ket_thuc DATETIME NOT NULL,
    so_luot_su_dung INT NULL,
    da_su_dung INT DEFAULT 0,
    trang_thai VARCHAR(20) DEFAULT 'ACTIVE',
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 18. HOA_DON (Invoices)
-- ============================================================
CREATE TABLE hoa_don (
    ma_hoa_don INT IDENTITY(1,1) PRIMARY KEY,
    ma_lich_hen INT NULL,
    ma_khach_hang INT NOT NULL,
    ma_nhan_vien INT NULL,
    ma_khuyen_mai INT NULL,
    tong_tien DECIMAL(18,2) DEFAULT 0,
    giam_gia DECIMAL(18,2) DEFAULT 0,
    thue DECIMAL(18,2) DEFAULT 0,
    so_tien_khach_tra DECIMAL(18,2) DEFAULT 0,
    so_tien_tra_lai DECIMAL(18,2) DEFAULT 0,
    thanh_tien DECIMAL(18,2) DEFAULT 0,
    trang_thai VARCHAR(20) DEFAULT 'DRAFT',
    trang_thai_hd_dien_tu VARCHAR(20) DEFAULT 'NOT_ISSUED',
    ghi_chu NTEXT NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_lich_hen) REFERENCES lich_hen(ma_lich_hen),
    FOREIGN KEY (ma_khach_hang) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien),
    FOREIGN KEY (ma_khuyen_mai) REFERENCES khuyen_mai(ma_khuyen_mai)
);
GO

-- ============================================================
-- 19. CHI_TIET_HOA_DON (Invoice Details)
-- ============================================================
CREATE TABLE chi_tiet_hoa_don (
    ma_chi_tiet INT IDENTITY(1,1) PRIMARY KEY,
    ma_hoa_don INT NOT NULL,
    ma_san_pham INT NOT NULL,
    so_luong INT DEFAULT 1,
    don_gia DECIMAL(18,2) NOT NULL,
    thanh_tien DECIMAL(18,2) NOT NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_hoa_don) REFERENCES hoa_don(ma_hoa_don),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 20. THANH_TOAN (Payments)
-- ============================================================
CREATE TABLE thanh_toan (
    ma_thanh_toan INT IDENTITY(1,1) PRIMARY KEY,
    ma_hoa_don INT NOT NULL,
    so_tien DECIMAL(18,2) NOT NULL,
    phuong_thuc VARCHAR(20) NOT NULL DEFAULT 'CASH',
    trang_thai VARCHAR(20) DEFAULT 'SUCCESS',
    ma_giao_dich VARCHAR(100) NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_thanh_toan DATETIME DEFAULT GETDATE(),
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_hoa_don) REFERENCES hoa_don(ma_hoa_don)
);
GO


-- ============================================================
-- 22. NHA_CUNG_CAP (Suppliers)
-- ============================================================
CREATE TABLE nha_cung_cap (
    ma_nha_cung_cap INT IDENTITY(1,1) PRIMARY KEY,
    ten_nha_cung_cap NVARCHAR(200) NOT NULL,
    dia_chi NVARCHAR(500) NULL,
    so_dien_thoai VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    nguoi_lien_he NVARCHAR(100) NULL,
    ghi_chu NTEXT NULL,
    trang_thai VARCHAR(10) DEFAULT 'ACTIVE',
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 23. TON_KHO (Inventory)
-- ============================================================
CREATE TABLE ton_kho (
    ma_ton_kho INT IDENTITY(1,1) PRIMARY KEY,
    ma_san_pham INT NOT NULL UNIQUE,
    so_luong INT DEFAULT 0,
    so_luong_toi_thieu INT DEFAULT 5,
    don_vi NVARCHAR(50) NULL,
    vi_tri NVARCHAR(100) NULL,
    ngay_cap_nhat DATETIME DEFAULT GETDATE(),
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 24. PHIEU_NHAP (Import Receipts)
-- ============================================================
CREATE TABLE phieu_nhap (
    ma_phieu_nhap INT IDENTITY(1,1) PRIMARY KEY,
    ma_nha_cung_cap INT NOT NULL,
    ma_nhan_vien INT NULL,
    tong_tien DECIMAL(18,2) DEFAULT 0,
    trang_thai VARCHAR(20) DEFAULT 'DRAFT',
    ghi_chu NTEXT NULL,
    ngay_nhap DATETIME DEFAULT GETDATE(),
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap),
    FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien)
);
GO

-- ============================================================
-- 24. CHI_TIET_PHIEU_NHAP (Import Receipt Details)
-- ============================================================
CREATE TABLE chi_tiet_phieu_nhap (
    ma_chi_tiet INT IDENTITY(1,1) PRIMARY KEY,
    ma_phieu_nhap INT NOT NULL,
    ma_san_pham INT NOT NULL,
    so_luong INT NOT NULL,
    don_gia DECIMAL(18,2) NOT NULL,
    thanh_tien DECIMAL(18,2) NOT NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_phieu_nhap) REFERENCES phieu_nhap(ma_phieu_nhap),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
);
GO

-- ============================================================
-- 25. BANNER
-- ============================================================
CREATE TABLE banner (
    ma_banner INT IDENTITY(1,1) PRIMARY KEY,
    tieu_de NVARCHAR(200) NOT NULL,
    mo_ta NVARCHAR(500) NULL,
    hinh_anh VARCHAR(500) NULL,
    duong_dan VARCHAR(500) NULL,
    thu_tu INT DEFAULT 0,
    trang_thai VARCHAR(20) DEFAULT 'ACTIVE',
    ngay_bat_dau DATETIME NULL,
    ngay_ket_thuc DATETIME NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 26. TIN_TUC (News)
-- ============================================================
CREATE TABLE tin_tuc (
    ma_tin_tuc INT IDENTITY(1,1) PRIMARY KEY,
    tieu_de NVARCHAR(300) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,
    danh_muc NVARCHAR(100) NULL,
    tom_tat NVARCHAR(500) NULL,
    noi_dung NTEXT NULL,
    hinh_anh VARCHAR(500) NULL,
    tac_gia NVARCHAR(100) NULL,
    trang_thai VARCHAR(20) DEFAULT 'PUBLISHED',
    ngay_dang DATETIME NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- 27. DINH_MUC_VAT_TU (Bill of Materials)
-- ============================================================
CREATE TABLE dinh_muc_vat_tu (
    ma_dinh_muc INT IDENTITY(1,1) PRIMARY KEY,
    ma_san_pham INT NOT NULL,
    ma_ton_kho INT NOT NULL,
    so_luong_tieu_hao DECIMAL(18,2) NOT NULL,
    ghi_chu NVARCHAR(255) NULL,
    ngay_tao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham),
    FOREIGN KEY (ma_ton_kho) REFERENCES ton_kho(ma_ton_kho)
);
GO

PRINT N'✅ Tất cả 27 bảng đã được tạo thành công!';
GO
