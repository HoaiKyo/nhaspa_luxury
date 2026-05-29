"""
Initialize models explicitly to register into SQLAlchemy Metadata properly
and resolve circular string-based relationships.
"""
from app.infrastructure.persistence.models.base import Base
from app.infrastructure.persistence.models.user import NguoiDung, VaiTro, NguoiDungVaiTro
from app.infrastructure.persistence.models.staff import NhanVien, CaLam, LichLamViec, NghiPhep
from app.infrastructure.persistence.models.product import SanPham, DanhMuc, BangGia, NhanVienDichVu
from app.infrastructure.persistence.models.appointment import LichHen, KhachDiKem, ChiTietLichHen
from app.infrastructure.persistence.models.combo import ChiTietCombo, ComboKhachHang
 
from app.infrastructure.persistence.models.invoice import HoaDon, ChiTietHoaDon, ThanhToan
from app.infrastructure.persistence.models.marketing import KhuyenMai, Banner, TinTuc
from app.infrastructure.persistence.models.system import CauHinhHeThong

__all__ = [
    'LichHen', 'KhachDiKem', 'ChiTietLichHen', 'Base', 'ChiTietCombo', 'ComboKhachHang', 'HoaDon', 'ChiTietHoaDon', 'ThanhToan', 'KhuyenMai', 'Banner', 'TinTuc', 'DanhMuc', 'SanPham', 'BangGia', 'NhanVienDichVu', 'NhanVien', 'CaLam', 'LichLamViec', 'NghiPhep', 'NguoiDung', 'VaiTro', 'NguoiDungVaiTro', 'CauHinhHeThong'
]
