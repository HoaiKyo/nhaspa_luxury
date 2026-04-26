-- ============================================================
-- SEED DATA — 20 bản ghi mỗi bảng. Hình ảnh để NULL.
-- Chạy sau 01_create_tables.sql
-- Password hash cho 'password123' (bcrypt)
-- ============================================================
USE spa_db;
GO

-- 1. VAI_TRO (4 app roles + 16 extra = 20)
INSERT INTO vai_tro (ten_vai_tro, mo_ta) VALUES
(N'ADMIN', N'Quản trị hệ thống'), (N'STAFF', N'Nhân viên'), (N'CUSTOMER', N'Khách hàng'), (N'RECEPTIONIST', N'Lễ tân'),
(N'ACCOUNTANT', N'Kế toán'), (N'TECHNICIAN', N'Kỹ thuật viên'), (N'SUPERVISOR', N'Giám sát'),
(N'MARKETING', N'Marketing'), (N'HR', N'Nhân sự'), (N'WAREHOUSE', N'Kho'), (N'TRAINER', N'Đào tạo'),
(N'CONSULTANT', N'Tư vấn viên'), (N'VIP_CUSTOMER', N'Khách VIP'), (N'PARTNER', N'Đối tác'), (N'INTERN', N'Thực tập'),
(N'SECURITY', N'Bảo vệ'), (N'IT', N'IT'), (N'DESIGNER', N'Thiết kế'), (N'CONTENT', N'Nội dung'), (N'SUPPORT', N'Hỗ trợ vận hành');
GO

-- 2. NGUOI_DUNG (20 users, mat_khau = bcrypt hash of 'password123')
INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, gioi_tinh, dia_chi, diem_tich_luy, hang_thanh_vien) VALUES
(N'Admin Hệ Thống','admin@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000001','MALE',N'Hà Nội',0,N'Admin'),
(N'Nguyễn Văn Minh','minh.nv@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000002','MALE',N'Hà Nội',50,N'Bạc'),
(N'Trần Thị Lan','lan.tt@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000003','FEMALE',N'Hà Nội',120,N'Vàng'),
(N'Lê Hoàng Nam','nam.lh@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000004','MALE',N'Hà Nội',200,N'Bạch kim'),
(N'Phạm Thị Hương','huong.pt@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000005','FEMALE',N'Hà Nội',0,N'Thành viên mới'),
(N'Vũ Đức Anh','anh.vd@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000006','MALE',N'Hải Phòng',30,N'Bạc'),
(N'Hoàng Thị Mai','mai.ht@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000007','FEMALE',N'Đà Nẵng',80,N'Vàng'),
(N'Đỗ Văn Tùng','tung.dv@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000008','MALE',N'HCM',10,N'Thành viên mới'),
(N'Ngô Thị Thảo','thao.nt@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000009','FEMALE',N'HCM',150,N'Vàng'),
(N'Bùi Quang Huy','huy.bq@nhaspa.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000010','MALE',N'Hà Nội',0,N'Thành viên mới'),
(N'Lý Thị Ngọc','ngoc.lt@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000011','FEMALE',N'Hà Nội',40,N'Bạc'),
(N'Trịnh Văn Đạt','dat.tv@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000012','MALE',N'Hà Nội',0,N'Thành viên mới'),
(N'Phan Thị Yến','yen.pt@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000013','FEMALE',N'Hà Nội',90,N'Vàng'),
(N'Dương Văn Phúc','phuc.dv@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000014','MALE',N'Bắc Ninh',0,N'Thành viên mới'),
(N'Cao Thị Linh','linh.ct@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000015','FEMALE',N'Hà Nội',60,N'Bạc'),
(N'Tạ Minh Quân','quan.tm@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000016','MALE',N'Hà Nội',0,N'Thành viên mới'),
(N'Đinh Thị Trang','trang.dt@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000017','FEMALE',N'Hưng Yên',20,N'Thành viên mới'),
(N'Hà Văn Long','long.hv@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000018','MALE',N'Hà Nội',110,N'Vàng'),
(N'Mai Thị Hoa','hoa.mt@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000019','FEMALE',N'Hà Nội',0,N'Thành viên mới'),
(N'Lương Đình Khoa','khoa.ld@gmail.com','$2b$12$LJ3m4ys3uz.dHm2r6MBbAOeDHQPHmjPHSuJ0w9J0qlMVFmHi7mUHq','0900000020','MALE',N'Nam Định',5,N'Thành viên mới');
GO

-- 3. NGUOI_DUNG_VAI_TRO
-- Mapping chi tiet theo vai tro nhan vien:
-- ADMIN=1, STAFF=2, CUSTOMER=3, RECEPTIONIST=4
INSERT INTO nguoi_dung_vai_tro (ma_nguoi_dung, ma_vai_tro) VALUES
-- Core roles for staff accounts
(1,1),   -- Admin He Thong
(2,2),   -- Nhan vien
(3,2),(4,2),(6,2),(7,2),(8,2),(9,2),(10,2),
(11,2),(12,2),(13,2),(14,2),(15,2),(16,2),(17,2),(18,2),(20,2),
(5,4),(19,4),  -- Le tan
-- Keep customer role for user profiles used as khach hang test data
(5,3),(8,3),(9,3),(10,3),(11,3),(12,3),(13,3),(14,3),
(15,3),(16,3),(17,3),(18,3),(19,3),(20,3);
GO

-- 4. DANH_MUC (20 categories)
INSERT INTO danh_muc (ten_danh_muc, slug, mo_ta, icon, thu_tu) VALUES
(N'Massage','massage',N'Dịch vụ massage thư giãn','Hands',1),
(N'Combo','combo',N'Các gói combo ưu đãi','Sparkles',2),
(N'Chăm sóc tóc','cham-soc-toc',N'Dịch vụ chăm sóc tóc','Scissors',3),
(N'Chăm sóc da','cham-soc-da',N'Dịch vụ chăm sóc da mặt','Droplets',4),
(N'Nail','nail',N'Dịch vụ nail art','Paintbrush',5),
(N'Tắm trắng','tam-trang',N'Dịch vụ tắm trắng','Sun',6),
(N'Triệt lông','triet-long',N'Triệt lông công nghệ cao','Zap',7),
(N'Xông hơi','xong-hoi',N'Xông hơi thải độc','Flame',8),
(N'Waxing','waxing',N'Dịch vụ waxing','Scissors',9),
(N'Phun xăm','phun-xam',N'Phun xăm thẩm mỹ','Pen',10),
(N'Chăm sóc body','cham-soc-body',N'Chăm sóc toàn thân','Heart',11),
(N'Detox','detox',N'Thải độc cơ thể','Leaf',12),
(N'Foot Spa','foot-spa',N'Chăm sóc chân','Footprints',13),
(N'Facial','facial',N'Chăm sóc da chuyên sâu','Sparkles',14),
(N'Aromatherapy','aromatherapy',N'Liệu pháp hương thơm','Wind',15),
(N'Hot Stone','hot-stone',N'Massage đá nóng','Flame',16),
(N'Trị liệu','tri-lieu',N'Dịch vụ trị liệu','Shield',17),
(N'VIP','vip',N'Dịch vụ VIP','Crown',18),
(N'Làm đẹp','lam-dep',N'Dịch vụ làm đẹp tổng hợp','Star',19),
(N'Sản phẩm','san-pham',N'Sản phẩm bán lẻ','ShoppingBag',20);
GO
