-- ============================================================
-- SEED DATA Part 4 — lich_hen, hoa_don, thanh_toan, ton_kho,
-- phieu_nhap, banner, tin_tuc (20 records each)
-- Hình ảnh (hinh_anh) để NULL — upload sau qua API
-- ============================================================
USE spa_db;
GO

-- 16. LICH_HEN (20)
INSERT INTO lich_hen (ma_khach_hang, ngay_hen, gio_bat_dau, gio_ket_thuc, trang_thai, ghi_chu) VALUES
(5,'2026-04-18','09:00','10:00','CONFIRMED',N'Khách VIP'),
(8,'2026-04-18','10:00','11:30','PENDING',NULL),
(9,'2026-04-18','14:00','15:00','CONFIRMED',N'Lần đầu'),
(10,'2026-04-19','09:00','10:30','PENDING',NULL),
(11,'2026-04-19','11:00','12:00','CONFIRMED',NULL),
(12,'2026-04-19','15:00','16:30','IN_PROGRESS',NULL),
(13,'2026-04-20','09:00','10:00','COMPLETED',NULL),
(14,'2026-04-20','10:30','12:00','COMPLETED',N'Combo'),
(15,'2026-04-20','14:00','15:00','CANCELLED',N'Khách hủy'),
(16,'2026-04-21','09:00','10:00','PENDING',NULL),
(17,'2026-04-21','10:00','11:30','PENDING',NULL),
(18,'2026-04-21','14:00','15:30','CONFIRMED',NULL),
(19,'2026-04-22','09:00','10:00','PENDING',NULL),
(20,'2026-04-22','11:00','12:00','PENDING',NULL),
(5,'2026-04-23','09:00','10:30','PENDING',N'Lịch mới'),
(8,'2026-04-23','14:00','15:00','PENDING',NULL),
(9,'2026-04-24','10:00','11:00','CONFIRMED',NULL),
(10,'2026-04-24','14:00','15:30','PENDING',NULL),
(11,'2026-04-25','09:00','10:00','PENDING',NULL),
(13,'2026-04-25','11:00','12:00','PENDING',NULL);
GO

-- 17. KHACH_DI_KEM (20)
INSERT INTO khach_di_kem (ma_lich_hen, ho_ten, so_dien_thoai, ghi_chu) VALUES
(1,N'Nguyễn Thị Bé','0912345678',NULL),(1,N'Trần Văn Nhỏ','0912345679',NULL),
(2,N'Lê Thị Em','0912345680',N'Bạn đi cùng'),(3,N'Phạm Văn Út','0912345681',NULL),
(4,N'Vũ Thị Nhung','0912345682',N'Chị gái'),(5,N'Hoàng Văn An','0912345683',NULL),
(6,N'Đỗ Thị Bình','0912345684',NULL),(7,N'Ngô Văn Cường','0912345685',N'Bạn thân'),
(8,N'Bùi Thị Dung','0912345686',NULL),(9,N'Lý Văn Hùng','0912345687',NULL),
(10,N'Cao Thị Kim','0912345688',N'Mẹ'),(11,N'Đinh Văn Lộc','0912345689',NULL),
(12,N'Hà Thị My','0912345690',NULL),(14,N'Tạ Văn Nghĩa','0912345691',N'Đồng nghiệp'),
(15,N'Phan Thị Oanh','0912345692',NULL),(16,N'Trịnh Văn Phong','0912345693',NULL),
(17,N'Mai Thị Quỳnh','0912345694',NULL),(18,N'Lương Văn Rồng','0912345695',N'Anh trai'),
(19,N'Dương Thị Sen','0912345696',NULL),(20,N'Cao Văn Thắng','0912345697',NULL);
GO

-- 18. CHI_TIET_LICH_HEN (20)
INSERT INTO chi_tiet_lich_hen (ma_lich_hen, ma_san_pham, ma_nhan_vien, gio_bat_dau, gio_ket_thuc, gia) VALUES
(1,1,3,'09:00','10:00',400000),(2,2,4,'10:00','11:00',800000),
(2,3,6,'11:00','11:30',450000),(3,5,3,'14:00','15:00',200000),
(4,4,4,'09:00','10:30',950000),(5,1,13,'11:00','12:00',400000),
(6,7,4,'15:00','16:00',600000),(6,6,3,'16:00','16:30',250000),
(7,1,3,'09:00','10:00',400000),(8,10,15,'10:30','12:00',1200000),
(9,5,13,'14:00','15:00',200000),(10,2,4,'09:00','10:00',800000),
(11,12,13,'10:00','11:30',900000),(12,15,3,'14:00','15:30',600000),
(13,1,3,'09:00','10:00',400000),(14,3,6,'10:00','11:00',450000),
(15,9,3,'09:00','10:30',700000),(16,11,7,'14:00','15:00',300000),
(17,2,4,'10:00','11:00',800000),(18,14,13,'14:00','15:00',400000);
GO

-- 19. HOA_DON (20)
INSERT INTO hoa_don (ma_lich_hen, ma_khach_hang, ma_nhan_vien, tong_tien, giam_gia, thue, thanh_tien, trang_thai) VALUES
(7,13,2,400000,0,32000,432000,'PAID'),(8,14,2,1200000,120000,86400,1166400,'PAID'),
(1,5,3,400000,40000,28800,388800,'PAID'),(2,8,4,1250000,0,100000,1350000,'PENDING'),
(3,9,3,200000,0,16000,216000,'PAID'),(4,10,4,950000,95000,68400,923400,'PAID'),
(5,11,13,400000,0,32000,432000,'PAID'),(6,12,4,850000,50000,64000,864000,'PARTIAL'),
(NULL,15,2,600000,0,48000,648000,'PAID'),(NULL,16,2,300000,30000,21600,291600,'PAID'),
(NULL,17,2,800000,0,64000,864000,'DRAFT'),(NULL,18,2,450000,0,36000,486000,'PAID'),
(NULL,19,2,250000,0,20000,270000,'PAID'),(NULL,20,2,900000,90000,64800,874800,'PAID'),
(NULL,5,3,700000,70000,50400,680400,'PAID'),(NULL,8,4,1800000,180000,129600,1749600,'PAID'),
(NULL,9,3,400000,0,32000,432000,'CANCELLED'),(NULL,10,4,600000,0,48000,648000,'PAID'),
(NULL,11,13,350000,0,28000,378000,'PAID'),(NULL,13,2,500000,0,40000,540000,'PENDING');
GO

-- 20. CHI_TIET_HOA_DON (20)
INSERT INTO chi_tiet_hoa_don (ma_hoa_don, ma_san_pham, so_luong, don_gia, thanh_tien) VALUES
(1,1,1,400000,400000),(2,10,1,1200000,1200000),(3,1,1,400000,400000),
(4,2,1,800000,800000),(4,3,1,450000,450000),(5,5,1,200000,200000),
(6,4,1,950000,950000),(7,1,1,400000,400000),(8,7,1,600000,600000),
(8,6,1,250000,250000),(9,15,1,600000,600000),(10,11,1,300000,300000),
(11,2,1,800000,800000),(12,3,1,450000,450000),(13,17,1,250000,250000),
(14,12,1,900000,900000),(15,9,1,700000,700000),(16,15,1,600000,600000),
(16,1,1,400000,400000),(16,2,1,800000,800000);
GO

-- 21. THANH_TOAN (20)
INSERT INTO thanh_toan (ma_hoa_don, so_tien, phuong_thuc, trang_thai, ma_giao_dich) VALUES
(1,432000,'CASH','SUCCESS',NULL),(2,1166400,'CARD','SUCCESS','TXN202604001'),
(3,388800,'CASH','SUCCESS',NULL),(5,216000,'TRANSFER','SUCCESS','TXN202604002'),
(6,923400,'CARD','SUCCESS','TXN202604003'),(7,432000,'CASH','SUCCESS',NULL),
(8,500000,'CASH','SUCCESS',NULL),(9,648000,'TRANSFER','SUCCESS','TXN202604004'),
(10,291600,'CASH','SUCCESS',NULL),(12,486000,'MOMO','SUCCESS','MOMO202604001'),
(13,270000,'CASH','SUCCESS',NULL),(14,874800,'CARD','SUCCESS','TXN202604005'),
(15,680400,'ZALOPAY','SUCCESS','ZLP202604001'),(16,1749600,'TRANSFER','SUCCESS','TXN202604006'),
(18,648000,'CASH','SUCCESS',NULL),(19,378000,'MOMO','SUCCESS','MOMO202604002'),
(8,364000,'TRANSFER','SUCCESS','TXN202604007'),
(1,0,'CASH','FAILED',NULL),(3,0,'CARD','FAILED','TXN_FAIL_001'),(6,0,'CASH','REFUND',NULL);
GO

-- 22. TON_KHO (20)
INSERT INTO ton_kho (ma_san_pham, so_luong, so_luong_toi_thieu, don_vi, vi_tri) VALUES
(17,50,10,N'Chai',N'Kệ A1'),(18,80,15,N'Tuýp',N'Kệ A2'),
(19,100,20,N'Chai',N'Kệ A3'),(20,200,30,N'Miếng',N'Kệ B1'),
(1,0,0,N'Dịch vụ',N'N/A'),(2,0,0,N'Dịch vụ',N'N/A'),
(3,0,0,N'Dịch vụ',N'N/A'),(4,0,0,N'Gói',N'N/A'),
(5,0,0,N'Dịch vụ',N'N/A'),(6,0,0,N'Dịch vụ',N'N/A'),
(7,0,0,N'Dịch vụ',N'N/A'),(8,30,5,N'Hộp',N'Kệ B2'),
(9,0,0,N'Gói',N'N/A'),(10,0,0,N'Gói',N'N/A'),
(11,25,5,N'Bộ',N'Kệ C1'),(12,10,3,N'Liệu trình',N'N/A'),
(13,0,0,N'Dịch vụ',N'N/A'),(14,15,5,N'Viên',N'Kệ C2'),
(15,0,0,N'Dịch vụ',N'N/A'),(16,0,0,N'Dịch vụ',N'N/A');
GO

-- 23. PHIEU_NHAP (20)
INSERT INTO phieu_nhap (ma_nha_cung_cap, ma_nhan_vien, tong_tien, trang_thai) VALUES
(1,8,5000000,'CONFIRMED'),(2,8,3000000,'CONFIRMED'),(1,8,2500000,'CONFIRMED'),
(3,8,1500000,'CONFIRMED'),(4,8,8000000,'CONFIRMED'),(5,8,4000000,'DRAFT'),
(1,8,6000000,'CONFIRMED'),(6,8,12000000,'CONFIRMED'),(7,8,2000000,'CONFIRMED'),
(2,8,3500000,'CONFIRMED'),(8,8,15000000,'DRAFT'),(9,8,1800000,'CONFIRMED'),
(10,8,900000,'CONFIRMED'),(1,8,4500000,'CONFIRMED'),(3,8,2200000,'CONFIRMED'),
(4,8,7500000,'CONFIRMED'),(11,8,1200000,'DRAFT'),(12,8,20000000,'CONFIRMED'),
(13,8,800000,'CONFIRMED'),(14,8,600000,'CONFIRMED');
GO

-- 24. CHI_TIET_PHIEU_NHAP (20)
INSERT INTO chi_tiet_phieu_nhap (ma_phieu_nhap, ma_san_pham, so_luong, don_gia, thanh_tien) VALUES
(1,17,20,150000,3000000),(1,18,10,200000,2000000),(2,19,30,100000,3000000),
(3,20,50,50000,2500000),(4,17,10,150000,1500000),(5,18,40,200000,8000000),
(6,19,40,100000,4000000),(7,20,120,50000,6000000),(8,17,30,150000,4500000),
(8,18,25,200000,5000000),(8,19,25,100000,2500000),(9,20,40,50000,2000000),
(10,17,15,120000,1800000),(11,18,20,175000,3500000),(12,19,10,90000,900000),
(13,20,30,60000,1800000),(14,17,25,150000,3750000),(14,18,5,150000,750000),
(15,19,12,100000,1200000),(16,20,100,45000,4500000);
GO

-- 25. BANNER (20, hinh_anh = NULL)
INSERT INTO banner (tieu_de, mo_ta, hinh_anh, duong_dan, thu_tu, trang_thai) VALUES
(N'Khai trương chi nhánh mới',N'Ưu đãi 50% dịp khai trương',NULL,'/khai-truong',1,'ACTIVE'),
(N'Flash Sale tháng 4',N'Giảm giá sốc cuối tháng',NULL,'/flash-sale',2,'ACTIVE'),
(N'Combo mùa hè',N'Thư giãn mùa hè với combo đặc biệt',NULL,'/combo-he',3,'ACTIVE'),
(N'Thẻ thành viên VIP',N'Ưu đãi lên đến 35%',NULL,'/vip',4,'ACTIVE'),
(N'Dịch vụ mới: Triệt lông',N'Công nghệ triệt lông mới nhất',NULL,'/triet-long',5,'ACTIVE'),
(N'Quà tặng 8/3',N'Tặng voucher cho phái đẹp',NULL,'/8-3',6,'INACTIVE'),
(N'Giáng sinh an lành',N'Ưu đãi mùa Giáng sinh',NULL,'/christmas',7,'INACTIVE'),
(N'Spa couple',N'Trải nghiệm spa đôi',NULL,'/couple',8,'ACTIVE'),
(N'Chăm sóc da mùa đông',N'Bảo vệ da trong mùa lạnh',NULL,'/mua-dong',9,'INACTIVE'),
(N'Giới thiệu bạn bè',N'Giảm 10% khi giới thiệu',NULL,'/referral',10,'ACTIVE'),
(N'Tết Nguyên Đán',N'Ưu đãi đón Tết',NULL,'/tet',11,'INACTIVE'),
(N'Black Friday',N'Giảm đến 40%',NULL,'/black-friday',12,'INACTIVE'),
(N'Ngày của Mẹ',N'Tặng mẹ trải nghiệm spa',NULL,'/mothers-day',13,'ACTIVE'),
(N'Hè rực rỡ',N'Combo hè hot nhất',NULL,'/he-2026',14,'ACTIVE'),
(N'Loyalty Points x2',N'Nhân đôi điểm tích lũy',NULL,'/x2-points',15,'ACTIVE'),
(N'Dịch vụ Detox',N'Thải độc cơ thể toàn diện',NULL,'/detox',16,'ACTIVE'),
(N'Massage đá nóng',N'Trải nghiệm mới',NULL,'/hot-stone',17,'ACTIVE'),
(N'Workshop làm đẹp',N'Miễn phí tham gia',NULL,'/workshop',18,'ACTIVE'),
(N'Ưu đãi sinh nhật',N'Giảm 20% trong tháng sinh nhật',NULL,'/birthday',19,'ACTIVE'),
(N'Grand Opening CN2',N'Khai trương chi nhánh 2',NULL,'/cn2',20,'ACTIVE');
GO

-- 26. TIN_TUC (20, hinh_anh = NULL)
INSERT INTO tin_tuc (tieu_de, slug, danh_muc, tom_tat, noi_dung, hinh_anh, tac_gia, trang_thai) VALUES
(N'5 lợi ích tuyệt vời của massage','5-loi-ich-massage',N'Sức khỏe',N'Massage mang lại nhiều lợi ích cho sức khỏe',N'<p>Massage giúp giảm stress...</p>',NULL,N'Admin','PUBLISHED'),
(N'Cách chăm sóc da mùa hè','cham-soc-da-mua-he',N'Làm đẹp',N'Bí quyết giữ da đẹp trong mùa hè',N'<p>Mùa hè da dễ bị tổn thương...</p>',NULL,N'Admin','PUBLISHED'),
(N'Khai trương chi nhánh mới','khai-truong-chi-nhanh',N'Tin tức',N'Nhà Spa khai trương chi nhánh mới',N'<p>Chúng tôi vui mừng...</p>',NULL,N'Admin','PUBLISHED'),
(N'Top 10 dịch vụ được yêu thích','top-10-dich-vu',N'Dịch vụ',N'Những dịch vụ được khách hàng yêu thích nhất',N'<p>1. Massage body...</p>',NULL,N'Admin','PUBLISHED'),
(N'Combo mùa hè 2026','combo-mua-he-2026',N'Khuyến mãi',N'Ưu đãi combo đặc biệt mùa hè',N'<p>Nhà Spa giới thiệu...</p>',NULL,N'Admin','PUBLISHED'),
(N'Hướng dẫn detox tại nhà','huong-dan-detox',N'Sức khỏe',N'Cách thải độc cơ thể đơn giản',N'<p>Detox không khó...</p>',NULL,N'Admin','PUBLISHED'),
(N'Bí quyết chống lão hóa','bi-quyet-chong-lao-hoa',N'Làm đẹp',N'Giữ mãi nét thanh xuân',N'<p>Lão hóa là quá trình...</p>',NULL,N'Admin','PUBLISHED'),
(N'Lợi ích của xông hơi','loi-ich-xong-hoi',N'Sức khỏe',N'Xông hơi giúp thải độc',N'<p>Xông hơi từ lâu...</p>',NULL,N'Admin','PUBLISHED'),
(N'Tuyển dụng nhân viên','tuyen-dung-nhan-vien',N'Tuyển dụng',N'Nhà Spa tuyển KTV',N'<p>Chúng tôi đang tìm kiếm...</p>',NULL,N'HR','PUBLISHED'),
(N'Review dịch vụ triệt lông','review-triet-long',N'Review',N'Khách hàng chia sẻ trải nghiệm',N'<p>Chị Lan chia sẻ...</p>',NULL,N'Admin','PUBLISHED'),
(N'Yoga và Spa','yoga-va-spa',N'Sức khỏe',N'Kết hợp yoga và spa',N'<p>Yoga giúp cơ thể...</p>',NULL,N'Admin','PUBLISHED'),
(N'Xu hướng làm đẹp 2026','xu-huong-lam-dep-2026',N'Làm đẹp',N'Những xu hướng mới nhất',N'<p>Năm 2026 đánh dấu...</p>',NULL,N'Admin','PUBLISHED'),
(N'Chăm sóc tóc đúng cách','cham-soc-toc-dung-cach',N'Làm đẹp',N'Bí quyết tóc đẹp',N'<p>Tóc khỏe đẹp...</p>',NULL,N'Admin','PUBLISHED'),
(N'Ưu đãi tháng 4','uu-dai-thang-4',N'Khuyến mãi',N'Giảm giá hấp dẫn tháng 4',N'<p>Nhân dịp...</p>',NULL,N'Admin','PUBLISHED'),
(N'Massage cho bà bầu','massage-ba-bau',N'Sức khỏe',N'Massage an toàn cho mẹ bầu',N'<p>Massage prenatal...</p>',NULL,N'Admin','PUBLISHED'),
(N'Nail art xu hướng','nail-art-xu-huong',N'Làm đẹp',N'Các mẫu nail đẹp nhất',N'<p>Nail art 2026...</p>',NULL,N'Admin','PUBLISHED'),
(N'Trải nghiệm khách hàng VIP','trai-nghiem-vip',N'Review',N'Khách VIP chia sẻ',N'<p>Anh Minh chia sẻ...</p>',NULL,N'Admin','PUBLISHED'),
(N'Cách chọn kem chống nắng','cach-chon-kem-chong-nang',N'Làm đẹp',N'Hướng dẫn chọn SPF phù hợp',N'<p>Kem chống nắng...</p>',NULL,N'Admin','PUBLISHED'),
(N'Công nghệ mới tại Nhà Spa','cong-nghe-moi',N'Tin tức',N'Máy móc thế hệ mới',N'<p>Nhà Spa đầu tư...</p>',NULL,N'Admin','DRAFT'),
(N'Event cuối năm','event-cuoi-nam',N'Sự kiện',N'Sự kiện tri ân khách hàng',N'<p>Sự kiện hoành tráng...</p>',NULL,N'Admin','DRAFT');
GO

PRINT N'✅ Tất cả seed data đã được tạo thành công! Mỗi bảng 20 bản ghi.';
GO
