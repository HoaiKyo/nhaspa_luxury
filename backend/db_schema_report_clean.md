# Báo Cáo Cấu Trúc Cơ Sở Dữ Liệu (Database Schema)

## Bảng: banner

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_banner | INTEGER | PK | Có |  |
| tieu_de | VARCHAR(200) |  | Có |  |
| mo_ta | VARCHAR(500) |  | Không |  |
| hinh_anh | VARCHAR(500) |  | Có |  |
| duong_dan | VARCHAR(500) |  | Không |  |
| thu_tu | INTEGER |  | Không | 0 |
| trang_thai | VARCHAR(20) |  | Không | ACTIVE |
| ngay_bat_dau | DATETIME |  | Không |  |
| ngay_ket_thuc | DATETIME |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: ca_lam

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_ca | INTEGER | PK | Có |  |
| ten_ca | VARCHAR(50) |  | Có |  |
| gio_bat_dau | TIME |  | Có |  |
| gio_ket_thuc | TIME |  | Có |  |
| mo_ta | VARCHAR(255) |  | Không |  |
| trang_thai | BOOLEAN |  | Không | True |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: cau_hinh_he_thong

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_cau_hinh | VARCHAR(50) | PK | Có |  |
| gia_tri | VARCHAR(255) |  | Có |  |
| mo_ta | VARCHAR(255) |  | Không |  |
| loai_du_lieu | VARCHAR(20) |  | Không | STRING |

## Bảng: danh_muc

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_danh_muc | INTEGER | PK | Có |  |
| ten_danh_muc | VARCHAR(100) |  | Có |  |
| slug | VARCHAR(100) |  | Có |  |
| mo_ta | VARCHAR(500) |  | Không |  |
| icon | VARCHAR(50) |  | Không |  |
| thu_tu | INTEGER |  | Không | 0 |
| trang_thai | BOOLEAN |  | Không | True |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: khuyen_mai

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_khuyen_mai | INTEGER | PK | Có |  |
| ten_khuyen_mai | VARCHAR(200) |  | Có |  |
| mo_ta | TEXT |  | Không |  |
| loai_giam | VARCHAR(20) |  | Có | PERCENT |
| gia_tri_giam | NUMERIC(18, 2) |  | Có |  |
| giam_toi_da | NUMERIC(18, 2) |  | Không |  |
| don_toi_thieu | NUMERIC(18, 2) |  | Không |  |
| ma_code | VARCHAR(50) |  | Không |  |
| ngay_bat_dau | DATETIME |  | Có |  |
| ngay_ket_thuc | DATETIME |  | Có |  |
| so_luot_su_dung | INTEGER |  | Không |  |
| da_su_dung | INTEGER |  | Không | 0 |
| trang_thai | VARCHAR(20) |  | Không | ACTIVE |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: nguoi_dung

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_nguoi_dung | INTEGER | PK | Có |  |
| ho_ten | VARCHAR(100) |  | Có |  |
| email | VARCHAR(150) |  | Có |  |
| mat_khau | VARCHAR(255) |  | Có |  |
| so_dien_thoai | VARCHAR(20) |  | Không |  |
| gioi_tinh | VARCHAR(10) |  | Không |  |
| ngay_sinh | DATETIME |  | Không |  |
| dia_chi | VARCHAR(255) |  | Không |  |
| anh_dai_dien | VARCHAR(500) |  | Không |  |
| trang_thai | BOOLEAN |  | Không | True |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: tin_tuc

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_tin_tuc | INTEGER | PK | Có |  |
| tieu_de | VARCHAR(300) |  | Có |  |
| slug | VARCHAR(300) |  | Có |  |
| danh_muc | VARCHAR(100) |  | Không |  |
| tom_tat | VARCHAR(500) |  | Không |  |
| noi_dung | TEXT |  | Không |  |
| hinh_anh | VARCHAR(500) |  | Không |  |
| tac_gia | VARCHAR(100) |  | Không |  |
| trang_thai | VARCHAR(20) |  | Không | PUBLISHED |
| ngay_dang | DATETIME |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: vai_tro

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_vai_tro | INTEGER | PK | Có |  |
| ten_vai_tro | VARCHAR(50) |  | Có |  |
| mo_ta | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: lich_hen

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_lich_hen | INTEGER | PK | Có |  |
| ma_khach_hang | INTEGER | FK | Có |  |
| ngay_hen | DATE |  | Có |  |
| gio_bat_dau | TIME |  | Có |  |
| gio_ket_thuc | TIME |  | Không |  |
| trang_thai | VARCHAR(20) |  | Không | PENDING |
| ghi_chu | TEXT |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: nguoi_dung_vai_tro

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_nguoi_dung | INTEGER | PK, FK | Có |  |
| ma_vai_tro | INTEGER | PK, FK | Có |  |
| ngay_gan | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: nhan_vien

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_nhan_vien | INTEGER | PK | Có |  |
| ma_nguoi_dung | INTEGER | FK | Có |  |
| ma_nhan_vien_code | VARCHAR(20) |  | Không |  |
| chuc_vu | VARCHAR(100) |  | Không |  |
| phong_ban | VARCHAR(100) |  | Không |  |
| ngay_vao_lam | DATE |  | Không |  |
| trang_thai | BOOLEAN |  | Không | True |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: san_pham

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_san_pham | INTEGER | PK | Có |  |
| ma_danh_muc | INTEGER | FK | Có |  |
| ten_san_pham | VARCHAR(200) |  | Có |  |
| slug | VARCHAR(200) |  | Có |  |
| mo_ta | TEXT |  | Không |  |
| mo_ta_ngan | VARCHAR(500) |  | Không |  |
| hinh_anh | VARCHAR(500) |  | Không |  |
| loai | VARCHAR(20) |  | Có | SERVICE |
| thoi_luong | INTEGER |  | Không |  |
| thu_tu | INTEGER |  | Không | 0 |
| trang_thai | BOOLEAN |  | Không | True |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: bang_gia

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_bang_gia | INTEGER | PK | Có |  |
| ma_san_pham | INTEGER | FK | Có |  |
| gia | NUMERIC(18, 2) |  | Có |  |
| gia_goc | NUMERIC(18, 2) |  | Không |  |
| thoi_luong | VARCHAR(50) |  | Không |  |
| ngay_ap_dung | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_ket_thuc | DATETIME |  | Không |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: chi_tiet_combo

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_chi_tiet | INTEGER | PK | Có |  |
| ma_combo | INTEGER | FK | Có |  |
| ma_dich_vu | INTEGER | FK | Có |  |
| so_luong | INTEGER |  | Không | 1 |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: combo_khach_hang

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_combo_kh | INTEGER | PK | Có |  |
| ma_khach_hang | INTEGER | FK | Có |  |
| ma_combo | INTEGER | FK | Có |  |
| tong_so_luot | INTEGER |  | Có |  |
| so_luot_con_lai | INTEGER |  | Có |  |
| ngay_mua | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_het_han | DATETIME |  | Không |  |
| gia_mua | NUMERIC(18, 2) |  | Không |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: hoa_don

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_hoa_don | INTEGER | PK | Có |  |
| ma_lich_hen | INTEGER | FK | Không |  |
| ma_khach_hang | INTEGER | FK | Có |  |
| ma_nhan_vien | INTEGER | FK | Không |  |
| ma_khuyen_mai | INTEGER | FK | Không |  |
| tong_tien | NUMERIC(18, 2) |  | Không | 0 |
| giam_gia | NUMERIC(18, 2) |  | Không | 0 |
| thue | NUMERIC(18, 2) |  | Không | 0 |
| so_tien_khach_tra | NUMERIC(18, 2) |  | Không | 0 |
| so_tien_tra_lai | NUMERIC(18, 2) |  | Không | 0 |
| thanh_tien | NUMERIC(18, 2) |  | Không | 0 |
| trang_thai | VARCHAR(20) |  | Không | DRAFT |
| trang_thai_hd_dien_tu | VARCHAR(20) |  | Không | NOT_ISSUED |
| ghi_chu | TEXT |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_cap_nhat | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: khach_di_kem

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_khach_di_kem | INTEGER | PK | Có |  |
| ma_lich_hen | INTEGER | FK | Có |  |
| ho_ten | VARCHAR(100) |  | Có |  |
| so_dien_thoai | VARCHAR(20) |  | Không |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: lich_lam_viec

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_lich | INTEGER | PK | Có |  |
| ma_nhan_vien | INTEGER | FK | Có |  |
| ma_ca | INTEGER | FK | Có |  |
| ngay_lam_viec | DATE |  | Có |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| trang_thai | VARCHAR(20) |  | Không | ACTIVE |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: nghi_phep

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_nghi_phep | INTEGER | PK | Có |  |
| ma_nhan_vien | INTEGER | FK | Có |  |
| ngay_bat_dau | DATE |  | Có |  |
| ngay_ket_thuc | DATE |  | Có |  |
| loai_nghi | VARCHAR(20) |  | Có | ANNUAL |
| ly_do | VARCHAR(500) |  | Không |  |
| dinh_kem | VARCHAR(1000) |  | Không |  |
| trang_thai | VARCHAR(20) |  | Không | PENDING |
| nguoi_duyet | INTEGER | FK | Không |  |
| ngay_duyet | DATETIME |  | Không |  |
| ghi_chu_duyet | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: nhan_vien_dich_vu

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_nhan_vien | INTEGER | PK, FK | Có |  |
| ma_san_pham | INTEGER | PK, FK | Có |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: chi_tiet_hoa_don

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_chi_tiet | INTEGER | PK | Có |  |
| ma_hoa_don | INTEGER | FK | Có |  |
| ma_san_pham | INTEGER | FK | Có |  |
| so_luong | INTEGER |  | Không | 1 |
| don_gia | NUMERIC(18, 2) |  | Có |  |
| thanh_tien | NUMERIC(18, 2) |  | Có |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: chi_tiet_lich_hen

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_chi_tiet | INTEGER | PK | Có |  |
| ma_lich_hen | INTEGER | FK | Có |  |
| ma_san_pham | INTEGER | FK | Có |  |
| ma_nhan_vien | INTEGER | FK | Không |  |
| ma_khach_di_kem | INTEGER | FK | Không |  |
| ma_combo_kh | INTEGER | FK | Không |  |
| gio_bat_dau | TIME |  | Không |  |
| gio_ket_thuc | TIME |  | Không |  |
| gia | NUMERIC(18, 2) |  | Không |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

## Bảng: thanh_toan

| Tên cột | Kiểu dữ liệu | Khóa | Bắt buộc (Not Null) | Mặc định |
| --- | --- | --- | --- | --- |
| ma_thanh_toan | INTEGER | PK | Có |  |
| ma_hoa_don | INTEGER | FK | Có |  |
| so_tien | NUMERIC(18, 2) |  | Có |  |
| phuong_thuc | VARCHAR(20) |  | Có | CASH |
| trang_thai | VARCHAR(20) |  | Không | SUCCESS |
| ma_giao_dich | VARCHAR(100) |  | Không |  |
| ghi_chu | VARCHAR(255) |  | Không |  |
| ngay_thanh_toan | DATETIME |  | Không | CURRENT_TIMESTAMP |
| ngay_tao | DATETIME |  | Không | CURRENT_TIMESTAMP |

