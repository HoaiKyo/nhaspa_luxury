-- ============================================================
-- SEED DATA Part 2 — san_pham, bang_gia, ca_lam, nhan_vien
-- Hình ảnh (hinh_anh) để NULL — sẽ upload sau qua API
-- ============================================================
USE spa_db;
GO

-- 5. SAN_PHAM (20, hinh_anh = NULL)
INSERT INTO san_pham (ma_danh_muc, ten_san_pham, slug, mo_ta_ngan, hinh_anh, loai, thoi_luong, thu_tu) VALUES
(1,N'Massage Body','massage-body',N'Massage toàn thân thư giãn',NULL,'SERVICE',60,1),
(4,N'Sạch sâu cấp ẩm','sach-sau-cap-am',N'Làm sạch sâu và cấp ẩm cho da',NULL,'SERVICE',60,2),
(3,N'Gội đầu dưỡng sinh Ngải Cứu','goi-dau-duong-sinh',N'Gội đầu thảo dược ngải cứu',NULL,'SERVICE',60,3),
(2,N'COMBO 3 – Chăm Sóc Da Chuyên Sâu','combo-3',N'Combo chăm sóc da cao cấp',NULL,'PACKAGE',90,4),
(1,N'Massage cổ vai gáy','massage-co-vai-gay',N'Massage giảm đau cổ vai gáy',NULL,'SERVICE',60,5),
(1,N'Massage chân','massage-chan',N'Massage bấm huyệt chân',NULL,'SERVICE',45,6),
(4,N'Trị mụn chuyên sâu','tri-mun-chuyen-sau',N'Điều trị mụn công nghệ cao',NULL,'SERVICE',75,7),
(3,N'Ủ tóc phục hồi','u-toc-phuc-hoi',N'Ủ tóc collagen phục hồi',NULL,'SERVICE',45,8),
(2,N'COMBO 1 – Thư giãn cơ bản','combo-1',N'Combo massage + gội đầu',NULL,'PACKAGE',90,9),
(2,N'COMBO 2 – Chăm sóc toàn diện','combo-2',N'Combo body + facial + gội đầu',NULL,'PACKAGE',120,10),
(5,N'Sơn gel','son-gel',N'Sơn móng gel cao cấp',NULL,'SERVICE',60,11),
(6,N'Tắm trắng toàn thân','tam-trang-toan-than',N'Tắm trắng phi thuyền',NULL,'SERVICE',90,12),
(7,N'Triệt lông nách','triet-long-nach',N'Triệt lông vĩnh viễn',NULL,'SERVICE',30,13),
(8,N'Xông hơi đá muối','xong-hoi-da-muoi',N'Xông hơi đá muối Himalaya',NULL,'SERVICE',45,14),
(1,N'Massage Thái','massage-thai',N'Massage kiểu Thái truyền thống',NULL,'SERVICE',90,15),
(4,N'Peel da sinh học','peel-da-sinh-hoc',N'Peel da tái tạo',NULL,'SERVICE',60,16),
(20,N'Serum Vitamin C','serum-vitamin-c',N'Serum dưỡng trắng',NULL,'PRODUCT',NULL,17),
(20,N'Kem chống nắng SPF50','kem-chong-nang',N'Kem chống nắng cao cấp',NULL,'PRODUCT',NULL,18),
(20,N'Sữa rửa mặt','sua-rua-mat',N'Sữa rửa mặt dịu nhẹ',NULL,'PRODUCT',NULL,19),
(20,N'Mặt nạ collagen','mat-na-collagen',N'Mặt nạ dưỡng da collagen',NULL,'PRODUCT',NULL,20);
GO

-- 6. BANG_GIA (20)
INSERT INTO bang_gia (ma_san_pham, gia, gia_goc, thoi_luong) VALUES
(1,400000,NULL,N'60 phút'),(1,550000,NULL,N'90 phút'),
(2,800000,NULL,N'60 phút'),(3,450000,NULL,N'60 phút'),
(4,950000,1000000,N'90 phút'),(5,200000,NULL,N'60 phút'),
(5,400000,NULL,N'90 phút'),(6,250000,NULL,N'45 phút'),
(7,600000,NULL,N'75 phút'),(8,350000,NULL,N'45 phút'),
(9,700000,800000,N'90 phút'),(10,1200000,1500000,N'120 phút'),
(11,300000,NULL,N'60 phút'),(12,900000,NULL,N'90 phút'),
(13,500000,NULL,N'30 phút'),(14,400000,NULL,N'45 phút'),
(15,600000,NULL,N'90 phút'),(16,700000,NULL,N'60 phút'),
(17,450000,NULL,NULL),(18,350000,NULL,NULL);
GO

-- Thêm 2 giá nữa cho đủ 20
INSERT INTO bang_gia (ma_san_pham, gia, gia_goc, thoi_luong) VALUES
(19,250000,NULL,NULL),(20,180000,NULL,NULL);
GO

-- 7. CA_LAM (2 mac dinh)
INSERT INTO ca_lam (ten_ca, gio_bat_dau, gio_ket_thuc, mo_ta) VALUES
(N'Ca sáng','08:00','14:00',N'Ca sáng 8h-14h'),
(N'Ca chiều','14:00','22:00',N'Ca chiều 14h-22h');
GO

-- 8. NHAN_VIEN (20, users 1-10 làm staff + thêm dummy links)
INSERT INTO nhan_vien (ma_nguoi_dung, ma_nhan_vien_code, chuc_vu, phong_ban, ngay_vao_lam) VALUES
(1,'NV001',N'Giám đốc',N'Ban giám đốc','2020-01-01'),
(2,'NV002',N'Quản lý',N'Quản lý','2020-03-15'),
(3,'NV003',N'Kỹ thuật viên massage',N'Dịch vụ','2021-06-01'),
(4,'NV004',N'Kỹ thuật viên da',N'Dịch vụ','2021-07-15'),
(5,'NV005',N'Lễ tân',N'Lễ tân','2022-01-10'),
(6,'NV006',N'Kỹ thuật viên tóc',N'Dịch vụ','2022-03-20'),
(7,'NV007',N'Kỹ thuật viên nail',N'Dịch vụ','2022-05-01'),
(8,'NV008',N'Nhân viên kho',N'Kho','2022-08-15'),
(9,'NV009',N'Kế toán',N'Kế toán','2023-01-05'),
(10,'NV010',N'Marketing',N'Marketing','2023-03-10'),
(11,'NV011',N'Thực tập sinh 1',N'Dịch vụ','2024-01-15'),
(12,'NV012',N'Thực tập sinh 2',N'Dịch vụ','2024-02-01'),
(13,'NV013',N'Kỹ thuật viên body',N'Dịch vụ','2023-06-01'),
(14,'NV014',N'Nhân viên tư vấn',N'Tư vấn','2023-07-01'),
(15,'NV015',N'Trưởng ca',N'Dịch vụ','2021-09-01'),
(16,'NV016',N'Phó quản lý',N'Quản lý','2022-11-01'),
(17,'NV017',N'Nhân viên IT',N'IT','2023-09-01'),
(18,'NV018',N'Nhân viên nội dung',N'Marketing','2024-01-01'),
(19,'NV019',N'Lễ tân 2',N'Lễ tân','2024-03-01'),
(20,'NV020',N'Bảo vệ',N'An ninh','2023-05-01');
GO
