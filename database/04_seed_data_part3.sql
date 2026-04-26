-- ============================================================
-- SEED DATA Part 3 — Remaining tables (20 records each)
-- ============================================================
USE spa_db;
GO

-- 9. LICH_LAM_VIEC (20)
INSERT INTO lich_lam_viec (ma_nhan_vien, ma_ca, ngay_lam_viec, ghi_chu) VALUES
(3,1,'2026-04-18',NULL),(4,1,'2026-04-18',NULL),(6,2,'2026-04-18',NULL),(7,2,'2026-04-18',NULL),
(3,2,'2026-04-19',NULL),(4,2,'2026-04-19',NULL),(6,1,'2026-04-19',NULL),(7,1,'2026-04-19',NULL),
(3,2,'2026-04-20',N'Ca cuối tuần'),(4,2,'2026-04-20',N'Ca cuối tuần'),
(5,1,'2026-04-18',NULL),(5,2,'2026-04-19',NULL),(13,1,'2026-04-18',NULL),(13,2,'2026-04-19',NULL),
(15,2,'2026-04-18',N'Trưởng ca'),(15,2,'2026-04-19',N'Trưởng ca'),
(11,1,'2026-04-21',NULL),(12,1,'2026-04-21',NULL),(6,2,'2026-04-21',NULL),(7,2,'2026-04-21',NULL);
GO

-- 10. NGHI_PHEP (20)
INSERT INTO nghi_phep (ma_nhan_vien, ngay_bat_dau, ngay_ket_thuc, ly_do, trang_thai, nguoi_duyet) VALUES
(3,'2026-05-01','2026-05-03',N'Nghỉ lễ','APPROVED',2),(4,'2026-05-01','2026-05-02',N'Việc gia đình','APPROVED',2),
(6,'2026-06-10','2026-06-12',N'Nghỉ phép năm','PENDING',NULL),(7,'2026-06-15','2026-06-16',N'Khám bệnh','APPROVED',2),
(5,'2026-07-01','2026-07-03',N'Du lịch','REJECTED',2),(11,'2026-05-10','2026-05-11',N'Việc cá nhân','PENDING',NULL),
(12,'2026-05-20','2026-05-22',N'Nghỉ ốm','APPROVED',2),(13,'2026-06-01','2026-06-02',N'Hiếu hỉ','APPROVED',2),
(15,'2026-07-10','2026-07-15',N'Nghỉ phép dài','PENDING',NULL),(3,'2026-08-01','2026-08-02',N'Nghỉ bù','APPROVED',2),
(4,'2026-08-10','2026-08-11',N'Khám sức khỏe','PENDING',NULL),(6,'2026-09-01','2026-09-03',N'Nghỉ phép','PENDING',NULL),
(7,'2026-09-10','2026-09-12',N'Việc gia đình','PENDING',NULL),(14,'2026-05-05','2026-05-06',N'Thi chứng chỉ','APPROVED',2),
(16,'2026-06-20','2026-06-22',N'Nghỉ mát','PENDING',NULL),(17,'2026-07-05','2026-07-06',N'Bảo trì hệ thống','APPROVED',2),
(18,'2026-08-15','2026-08-17',N'Nghỉ hè','PENDING',NULL),(19,'2026-09-20','2026-09-21',N'Việc cá nhân','PENDING',NULL),
(20,'2026-10-01','2026-10-02',N'Nghỉ lễ','PENDING',NULL),(8,'2026-05-25','2026-05-27',N'Kiểm kê kho','APPROVED',2);
GO

-- 11. NHAN_VIEN_DICH_VU (20)
INSERT INTO nhan_vien_dich_vu (ma_nhan_vien, ma_san_pham) VALUES
(3,1),(3,5),(3,6),(3,15),(4,2),(4,7),(4,16),(6,3),(6,8),(7,11),
(13,1),(13,5),(13,12),(13,14),(15,1),(15,2),(15,5),(11,1),(11,6),(12,3);
GO

-- 12. CHI_TIET_COMBO (20)
INSERT INTO chi_tiet_combo (ma_combo, ma_dich_vu, so_luong, ghi_chu) VALUES
(4,2,1,N'Sạch sâu cấp ẩm'),(4,16,1,N'Peel da'),(4,1,1,N'Massage body'),
(9,1,1,N'Massage body'),(9,3,1,N'Gội đầu dưỡng sinh'),
(10,1,1,N'Massage body'),(10,2,1,N'Facial'),(10,3,1,N'Gội đầu'),
(4,7,1,N'Trị mụn bonus'),(9,6,1,N'Massage chân bonus'),
(10,5,1,N'Massage cổ vai gáy'),(4,14,1,N'Xông hơi'),
(9,14,1,N'Xông hơi'),(10,14,1,N'Xông hơi'),
(4,8,1,N'Ủ tóc'),(9,5,1,N'Massage cổ vai gáy'),
(10,7,1,N'Trị mụn'),(10,8,1,N'Ủ tóc'),
(9,8,1,N'Ủ tóc'),(4,6,1,N'Massage chân');
GO

-- 13. COMBO_KHACH_HANG (20)
INSERT INTO combo_khach_hang (ma_khach_hang, ma_combo, tong_so_luot, so_luot_con_lai, ngay_het_han, gia_mua) VALUES
(5,4,5,4,'2027-04-18',4500000),(8,9,3,2,'2027-06-01',2000000),
(9,10,5,5,'2027-05-01',5500000),(10,4,3,3,'2027-07-01',2700000),
(11,9,5,3,'2027-03-01',3200000),(12,10,3,1,'2027-08-01',3400000),
(13,4,5,5,'2027-09-01',4500000),(14,9,3,3,'2027-10-01',2000000),
(15,10,5,4,'2027-04-01',5500000),(16,4,3,2,'2027-05-01',2700000),
(17,9,5,5,'2027-06-01',3200000),(18,10,3,3,'2027-07-01',3400000),
(5,9,3,1,'2027-08-01',2000000),(8,4,5,3,'2027-09-01',4500000),
(9,9,3,2,'2027-10-01',2000000),(10,10,5,4,'2027-11-01',5500000),
(11,4,3,3,'2027-12-01',2700000),(19,9,5,5,'2027-04-01',3200000),
(20,10,3,3,'2027-05-01',3400000),(13,9,5,4,'2027-06-01',3200000);
GO

-- 14. NHA_CUNG_CAP (20)
INSERT INTO nha_cung_cap (ten_nha_cung_cap, dia_chi, so_dien_thoai, email, nguoi_lien_he) VALUES
(N'Công ty Mỹ phẩm ABC',N'123 Lê Lợi, HN','0911111111','abc@supplier.com',N'Nguyễn A'),
(N'Nhà phân phối XYZ',N'456 Trần Hưng Đạo, HN','0922222222','xyz@supplier.com',N'Trần B'),
(N'Thảo dược Việt Nam',N'789 Láng Hạ, HN','0933333333','thaduoc@vn.com',N'Lê C'),
(N'Korea Beauty Import',N'101 Kim Mã, HN','0944444444','korea@beauty.com',N'Park D'),
(N'Japan Skincare Co',N'202 Đội Cấn, HN','0955555555','japan@skin.com',N'Tanaka E'),
(N'Thiết bị Spa Pro',N'303 Nguyễn Trãi, HN','0966666666','spapro@equip.com',N'Phạm F'),
(N'Tinh dầu Organic',N'404 Bà Triệu, HN','0977777777','organic@oil.com',N'Hoàng G'),
(N'Nội thất Spa Luxury',N'505 Hai Bà Trưng, HN','0988888888','luxury@furniture.com',N'Vũ H'),
(N'Dược phẩm Hà Nội',N'606 Phan Chu Trinh, HN','0999999999','duoc@hn.com',N'Đỗ I'),
(N'Công ty Bao bì Xanh',N'707 Lý Thường Kiệt, HN','0911122233','green@pack.com',N'Ngô K'),
(N'Hóa chất spa chuyên dụng',N'Hưng Yên','0911222333','hoachat@spa.com',N'Bùi L'),
(N'Máy móc thẩm mỹ Hàn',N'HCM','0911333444','may@han.com',N'Kim M'),
(N'Vải và khăn spa',N'Hà Nội','0911444555','vai@spa.com',N'Lý N'),
(N'Nến thơm artisan',N'Đà Nẵng','0911555666','candle@art.com',N'Mai O'),
(N'Nhạc và âm thanh spa',N'HN','0911666777','audio@spa.com',N'Tạ P'),
(N'Đá nóng massage',N'Thanh Hóa','0911777888','stone@msg.com',N'Cao Q'),
(N'Giấy và văn phòng phẩm',N'HN','0911888999','paper@vpp.com',N'Đinh R'),
(N'Nước uống detox',N'HN','0912111222','detox@drink.com',N'Hà S'),
(N'Găng tay y tế',N'HCM','0912222333','glove@med.com',N'Phan T'),
(N'Dầu gội thảo dược',N'HN','0912333444','shampoo@herb.com',N'Trịnh U');
GO

-- 15. KHUYEN_MAI (20)
INSERT INTO khuyen_mai (ten_khuyen_mai, loai_giam, gia_tri_giam, giam_toi_da, don_toi_thieu, ma_code, ngay_bat_dau, ngay_ket_thuc, so_luot_su_dung, trang_thai) VALUES
(N'Giảm 10% đầu tiên','PERCENT',10,100000,200000,'FIRST10','2026-01-01','2026-12-31',100,'ACTIVE'),
(N'Giảm 50K','AMOUNT',50000,NULL,300000,'SAVE50K','2026-01-01','2026-06-30',200,'ACTIVE'),
(N'Sinh nhật giảm 20%','PERCENT',20,200000,NULL,'BDAY20','2026-01-01','2026-12-31',NULL,'ACTIVE'),
(N'Flash Sale 30%','PERCENT',30,300000,500000,'FLASH30','2026-04-01','2026-04-30',50,'ACTIVE'),
(N'Khách mới 15%','PERCENT',15,150000,NULL,'NEW15','2026-01-01','2026-12-31',500,'ACTIVE'),
(N'Combo ưu đãi 100K','AMOUNT',100000,NULL,800000,'COMBO100','2026-03-01','2026-09-30',100,'ACTIVE'),
(N'Giảm 25% cuối tuần','PERCENT',25,250000,400000,'WKEND25','2026-01-01','2026-12-31',NULL,'ACTIVE'),
(N'Thẻ VIP giảm 35%','PERCENT',35,500000,NULL,'VIP35','2026-01-01','2026-12-31',NULL,'ACTIVE'),
(N'Valentine 14/2','PERCENT',14,140000,NULL,'VDAY14','2026-02-01','2026-02-28',50,'EXPIRED'),
(N'8/3 giảm 30%','PERCENT',30,300000,NULL,'W0803','2026-03-01','2026-03-31',100,'EXPIRED'),
(N'Tết giảm 20%','PERCENT',20,200000,NULL,'TET20','2026-01-15','2026-02-15',200,'EXPIRED'),
(N'Hè giảm 15%','PERCENT',15,150000,300000,'SUMMER15','2026-06-01','2026-08-31',300,'ACTIVE'),
(N'Back to school','AMOUNT',75000,NULL,250000,'SCHOOL75','2026-08-15','2026-09-15',150,'ACTIVE'),
(N'Ngày đôi giảm đôi','PERCENT',22,220000,NULL,'DOUBLE22','2026-02-02','2026-12-12',NULL,'ACTIVE'),
(N'Khuyến mãi tháng 4','PERCENT',10,100000,NULL,'APR10','2026-04-01','2026-04-30',100,'ACTIVE'),
(N'Giảm 200K dịch vụ VIP','AMOUNT',200000,NULL,1000000,'VIP200K','2026-01-01','2026-12-31',50,'ACTIVE'),
(N'Tri ân khách hàng','PERCENT',12,120000,500000,'LOYAL12','2026-01-01','2026-12-31',NULL,'ACTIVE'),
(N'Giảm 5% thanh toán online','PERCENT',5,50000,NULL,'ONLINE5','2026-01-01','2026-12-31',NULL,'ACTIVE'),
(N'Giới thiệu bạn giảm 10%','PERCENT',10,100000,NULL,'REFER10','2026-01-01','2026-12-31',NULL,'ACTIVE'),
(N'Black Friday','PERCENT',40,400000,500000,'BF40','2026-11-25','2026-11-30',200,'ACTIVE');
GO

PRINT N'✅ Seed part 3 done!';
GO
