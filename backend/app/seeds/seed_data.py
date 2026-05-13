"""
Seed data script — Creates initial roles, admin user, categories, and sample data.
Run: python -m app.seeds.seed_data
"""
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.infrastructure.persistence.models.user import VaiTro, NguoiDung, NguoiDungVaiTro
from app.infrastructure.persistence.models.product import DanhMuc, SanPham, BangGia
from app.infrastructure.persistence.models.marketing import TinTuc
from app.infrastructure.persistence.models.staff import CaLam, NhanVien
from app.infrastructure.persistence.models.inventory import NhaCungCap, TonKho
# Import all models so SQLAlchemy can resolve relationships
from app.infrastructure.persistence.models import appointment, invoice, combo, inventory
from app.infrastructure.persistence.models.invoice import HoaDon
from app.application.services.invoice_service import InvoiceService
from datetime import time, date as date_type
from decimal import Decimal


def infer_staff_role_name(chuc_vu: str = "", phong_ban: str = "") -> str:
    """Infer RBAC role from staff position/department text."""
    text = f"{chuc_vu or ''} {phong_ban or ''}".lower()
    receptionist_keywords = ("lễ tân", "le tan", "tiếp tân", "tiep tan", "thu ngân", "thu ngan")

    if any(keyword in text for keyword in receptionist_keywords):
        return "RECEPTIONIST"
    return "STAFF"


def ensure_user_role(db, user_id: int, role_id: int) -> bool:
    """Attach role for user if missing. Returns True if created."""
    existing = db.query(NguoiDungVaiTro).filter(
        NguoiDungVaiTro.ma_nguoi_dung == user_id,
        NguoiDungVaiTro.ma_vai_tro == role_id,
    ).first()
    if existing:
        return False
    db.add(NguoiDungVaiTro(ma_nguoi_dung=user_id, ma_vai_tro=role_id))
    return True


def seed():
    db = SessionLocal()
    try:
        # 1. Roles
        roles_data = [
            {"ten_vai_tro": "ADMIN", "mo_ta": "Quản trị hệ thống"},
            {"ten_vai_tro": "RECEPTIONIST", "mo_ta": "Lễ tân"},
            {"ten_vai_tro": "STAFF", "mo_ta": "Nhân viên"},
            {"ten_vai_tro": "CUSTOMER", "mo_ta": "Khách hàng"},
        ]
        for rd in roles_data:
            existing = db.query(VaiTro).filter(VaiTro.ten_vai_tro == rd["ten_vai_tro"]).first()
            if not existing:
                db.add(VaiTro(**rd))
        db.flush()

        # 2. Admin user
        admin = db.query(NguoiDung).filter(NguoiDung.email == "admin@nhaspa.com").first()
        if not admin:
            admin = NguoiDung(
                ho_ten="Admin", email="admin@nhaspa.com",
                mat_khau=get_password_hash("admin123"),
                so_dien_thoai="0900000000", trang_thai=True,
            )
            db.add(admin)
            db.flush()
            admin_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "ADMIN").first()
            if admin_role:
                db.add(NguoiDungVaiTro(ma_nguoi_dung=admin.ma_nguoi_dung, ma_vai_tro=admin_role.ma_vai_tro))

        # 3. Categories
        cats = [
            {"ten_danh_muc": "Massage", "slug": "massage", "icon": "Hands", "thu_tu": 1},
            {"ten_danh_muc": "Combo", "slug": "combo", "icon": "Sparkles", "thu_tu": 2},
            {"ten_danh_muc": "Chăm sóc tóc", "slug": "cham-soc-toc", "icon": "Scissors", "thu_tu": 3},
            {"ten_danh_muc": "Chăm sóc da", "slug": "cham-soc-da", "icon": "Droplets", "thu_tu": 4},
        ]
        for c in cats:
            if not db.query(DanhMuc).filter(DanhMuc.slug == c["slug"]).first():
                db.add(DanhMuc(**c))
        db.flush()

        # 4. Sample products
        massage_cat = db.query(DanhMuc).filter(DanhMuc.slug == "massage").first()
        skincare_cat = db.query(DanhMuc).filter(DanhMuc.slug == "cham-soc-da").first()
        hair_cat = db.query(DanhMuc).filter(DanhMuc.slug == "cham-soc-toc").first()
        combo_cat = db.query(DanhMuc).filter(DanhMuc.slug == "combo").first()

        products = [
            {"ten_san_pham": "Massage Body", "slug": "massage-body", "loai": "SERVICE",
             "hinh_anh": "https://nhaspa.com.vn/wp-content/uploads/2025/08/2.jpg",
             "thoi_luong": 60, "ma_danh_muc": massage_cat.ma_danh_muc if massage_cat else 1,
             "prices": [{"gia": 400000, "thoi_luong": "60 phút"}]},
            {"ten_san_pham": "Sạch sâu cấp ẩm", "slug": "sach-sau-cap-am", "loai": "SERVICE",
             "hinh_anh": "https://nhaspa.com.vn/wp-content/uploads/2025/08/3.jpg",
             "thoi_luong": 60, "ma_danh_muc": skincare_cat.ma_danh_muc if skincare_cat else 4,
             "prices": [{"gia": 800000, "thoi_luong": "60 phút"}]},
            {"ten_san_pham": "Gội đầu dưỡng sinh Ngải Cứu", "slug": "goi-dau-duong-sinh", "loai": "SERVICE",
             "hinh_anh": "https://nhaspa.com.vn/wp-content/uploads/2025/08/1.jpg",
             "thoi_luong": 60, "ma_danh_muc": hair_cat.ma_danh_muc if hair_cat else 3,
             "prices": [{"gia": 450000, "thoi_luong": "60 phút"}]},
            {"ten_san_pham": "COMBO 3 – Chăm Sóc Da Chuyên Sâu", "slug": "combo-3", "loai": "PACKAGE",
             "hinh_anh": "https://nhaspa.com.vn/wp-content/uploads/2025/08/4.jpg",
             "thoi_luong": 60, "ma_danh_muc": combo_cat.ma_danh_muc if combo_cat else 2,
             "prices": [{"gia": 950000, "gia_goc": 1000000, "thoi_luong": "60 phút"}]},
            {"ten_san_pham": "Massage cổ vai gáy", "slug": "massage-co-vai-gay", "loai": "SERVICE",
             "hinh_anh": "https://nhaspa.com.vn/wp-content/uploads/2025/08/2-1.jpg",
             "thoi_luong": 60, "ma_danh_muc": massage_cat.ma_danh_muc if massage_cat else 1,
             "prices": [{"gia": 200000, "thoi_luong": "60 phút"}]},
        ]

        for p_data in products:
            prices = p_data.pop("prices")
            if not db.query(SanPham).filter(SanPham.slug == p_data["slug"]).first():
                product = SanPham(**p_data)
                db.add(product)
                db.flush()
                for pr in prices:
                    db.add(BangGia(
                        ma_san_pham=product.ma_san_pham,
                        gia=Decimal(str(pr["gia"])),
                        gia_goc=Decimal(str(pr.get("gia_goc", 0))) if pr.get("gia_goc") else None,
                        thoi_luong=pr.get("thoi_luong"),
                    ))

        # 5. Shifts
        shifts = [
            {"ten_ca": "Ca sáng", "gio_bat_dau": time(8, 0), "gio_ket_thuc": time(16, 0), "mo_ta": "Ca sáng 8h-16h"},
            {"ten_ca": "Ca tối", "gio_bat_dau": time(14, 0), "gio_ket_thuc": time(22, 0), "mo_ta": "Ca tối 14h-22h"},
        ]
        for s in shifts:
            if not db.query(CaLam).filter(CaLam.ten_ca == s["ten_ca"]).first():
                db.add(CaLam(**s))
        # Hide legacy afternoon/full-day shifts if present.
        legacy_afternoon = db.query(CaLam).filter(CaLam.ten_ca == "Ca chiều").first()
        if legacy_afternoon and legacy_afternoon.trang_thai:
            legacy_afternoon.trang_thai = False
        # Hide legacy full-day shift if present from old data.
        legacy_shift = db.query(CaLam).filter(CaLam.ten_ca == "Ca cả ngày").first()
        if legacy_shift and legacy_shift.trang_thai:
            legacy_shift.trang_thai = False

        # 6. Customer users
        customers_data = [
            {"ho_ten": "Nguyễn Văn An", "email": "an.nguyen@gmail.com", "so_dien_thoai": "0901111001", "gioi_tinh": "MALE", "dia_chi": "123 Lê Lợi, Q.1, TP.HCM"},
            {"ho_ten": "Trần Thị Bình", "email": "binh.tran@gmail.com", "so_dien_thoai": "0901111002", "gioi_tinh": "FEMALE", "dia_chi": "45 Nguyễn Huệ, Q.1, TP.HCM"},
            {"ho_ten": "Lê Minh Châu", "email": "chau.le@gmail.com", "so_dien_thoai": "0901111003", "gioi_tinh": "FEMALE", "dia_chi": "78 Hai Bà Trưng, Q.3, TP.HCM"},
            {"ho_ten": "Phạm Đức Dũng", "email": "dung.pham@gmail.com", "so_dien_thoai": "0901111004", "gioi_tinh": "MALE", "dia_chi": "22 Võ Văn Tần, Q.3, TP.HCM"},
            {"ho_ten": "Hoàng Thị Em", "email": "em.hoang@gmail.com", "so_dien_thoai": "0901111005", "gioi_tinh": "FEMALE", "dia_chi": "56 Điện Biên Phủ, Q. Bình Thạnh"},
            {"ho_ten": "Vũ Quốc Phong", "email": "phong.vu@gmail.com", "so_dien_thoai": "0901111006", "gioi_tinh": "MALE", "dia_chi": "99 Trần Hưng Đạo, Q.5, TP.HCM"},
            {"ho_ten": "Đỗ Thị Giang", "email": "giang.do@gmail.com", "so_dien_thoai": "0901111007", "gioi_tinh": "FEMALE", "dia_chi": "12 Lý Tự Trọng, Q.1, TP.HCM"},
            {"ho_ten": "Bùi Hữu Hải", "email": "hai.bui@gmail.com", "so_dien_thoai": "0901111008", "gioi_tinh": "MALE", "dia_chi": "88 Pasteur, Q.1, TP.HCM"},
            {"ho_ten": "Ngô Thị Ý", "email": "y.ngo@gmail.com", "so_dien_thoai": "0901111009", "gioi_tinh": "FEMALE", "dia_chi": "34 Nguyễn Trãi, Q.5, TP.HCM"},
            {"ho_ten": "Đinh Văn Khôi", "email": "khoi.dinh@gmail.com", "so_dien_thoai": "0901111010", "gioi_tinh": "MALE", "dia_chi": "67 Lê Đại Hành, Q.11, TP.HCM"},
            {"ho_ten": "Trịnh Thị Linh", "email": "linh.trinh@gmail.com", "so_dien_thoai": "0901111011", "gioi_tinh": "FEMALE", "dia_chi": "21 Phạm Ngọc Thạch, Q.3, TP.HCM"},
            {"ho_ten": "Lý Thanh Minh", "email": "minh.ly@gmail.com", "so_dien_thoai": "0901111012", "gioi_tinh": "MALE", "dia_chi": "55 Cách Mạng Tháng 8, Q.Tân Bình"},
            {"ho_ten": "Phan Thị Ngọc", "email": "ngoc.phan@gmail.com", "so_dien_thoai": "0901111013", "gioi_tinh": "FEMALE", "dia_chi": "43 Hoàng Văn Thụ, Q.Tân Bình"},
            {"ho_ten": "Mai Xuân Oanh", "email": "oanh.mai@gmail.com", "so_dien_thoai": "0901111014", "gioi_tinh": "FEMALE", "dia_chi": "76 Bùi Viện, Q.1, TP.HCM"},
            {"ho_ten": "Tô Văn Phúc", "email": "phuc.to@gmail.com", "so_dien_thoai": "0901111015", "gioi_tinh": "MALE", "dia_chi": "101 Nguyễn Thị Minh Khai, Q.1"},
        ]
        customer_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "CUSTOMER").first()
        for cd in customers_data:
            if not db.query(NguoiDung).filter(NguoiDung.email == cd["email"]).first():
                u = NguoiDung(
                    ho_ten=cd["ho_ten"], email=cd["email"],
                    mat_khau=get_password_hash("password123"),
                    so_dien_thoai=cd.get("so_dien_thoai"),
                    gioi_tinh=cd.get("gioi_tinh"), dia_chi=cd.get("dia_chi"),
                    diem_tich_luy=0, hang_thanh_vien="Thành viên mới", trang_thai=True,
                )
                db.add(u)
                db.flush()
                if customer_role:
                    db.add(NguoiDungVaiTro(ma_nguoi_dung=u.ma_nguoi_dung, ma_vai_tro=customer_role.ma_vai_tro))
        db.flush()

        # 7. Staff users (idempotent: ensure account + role + staff record even if user already exists)
        staff_data = [
            {"ho_ten": "Nguyễn Thị Hoa", "email": "hoa.nguyen@nhaspa.com", "sdt": "0902222001", "code": "NSP101", "chuc_vu": "Kỹ thuật viên", "phong_ban": "Spa", "ngay_vao_lam": "2024-01-15", "role": "STAFF"},
            {"ho_ten": "Trần Văn Đạt", "email": "dat.tran@nhaspa.com", "sdt": "0902222002", "code": "NSP102", "chuc_vu": "Kỹ thuật viên", "phong_ban": "Spa", "ngay_vao_lam": "2024-03-01", "role": "STAFF"},
            {"ho_ten": "Lê Thị Mai", "email": "mai.le@nhaspa.com", "sdt": "0902222003", "code": "NSP103", "chuc_vu": "Lễ tân", "phong_ban": "Hành chính", "ngay_vao_lam": "2024-02-10", "role": "RECEPTIONIST"},
            {"ho_ten": "Phạm Quốc Tuấn", "email": "tuan.pham@nhaspa.com", "sdt": "0902222004", "code": "NSP104", "chuc_vu": "Quản lý", "phong_ban": "Quản lý", "ngay_vao_lam": "2023-06-20", "role": "STAFF"},
            {"ho_ten": "Hoàng Thị Lan", "email": "lan.hoang@nhaspa.com", "sdt": "0902222005", "code": "NSP105", "chuc_vu": "Kỹ thuật viên", "phong_ban": "Spa", "ngay_vao_lam": "2024-05-01", "role": "STAFF"},
        ]
        role_map = {
            r.ten_vai_tro: r
            for r in db.query(VaiTro).filter(VaiTro.ten_vai_tro.in_(["STAFF", "RECEPTIONIST"])).all()
        }

        # Legacy migration: remove MANAGER mappings and convert them to STAFF.
        migrated_manager_users = 0
        removed_manager_mappings = 0
        deleted_manager_role = False
        legacy_manager_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "MANAGER").first()
        if legacy_manager_role and role_map.get("STAFF"):
            manager_mappings = db.query(NguoiDungVaiTro).filter(
                NguoiDungVaiTro.ma_vai_tro == legacy_manager_role.ma_vai_tro
            ).all()
            for mapping in manager_mappings:
                if ensure_user_role(db, mapping.ma_nguoi_dung, role_map["STAFF"].ma_vai_tro):
                    migrated_manager_users += 1
                db.delete(mapping)
                removed_manager_mappings += 1
            db.flush()
            if db.query(NguoiDungVaiTro).filter(
                NguoiDungVaiTro.ma_vai_tro == legacy_manager_role.ma_vai_tro
            ).count() == 0:
                db.delete(legacy_manager_role)
                deleted_manager_role = True

        seeded_staff_count = 0
        seeded_role_count = 0

        for sd in staff_data:
            user = db.query(NguoiDung).filter(NguoiDung.email == sd["email"]).first()
            if not user:
                user = NguoiDung(
                    ho_ten=sd["ho_ten"],
                    email=sd["email"],
                    mat_khau=get_password_hash("staff123"),
                    so_dien_thoai=sd["sdt"],
                    trang_thai=True,
                )
                db.add(user)
                db.flush()
            else:
                user.ho_ten = sd["ho_ten"]
                if not user.so_dien_thoai:
                    user.so_dien_thoai = sd["sdt"]
                user.trang_thai = True

            role_name = sd.get("role") or infer_staff_role_name(sd.get("chuc_vu"), sd.get("phong_ban"))
            role = role_map.get(role_name)
            if role and ensure_user_role(db, user.ma_nguoi_dung, role.ma_vai_tro):
                seeded_role_count += 1

            existing_staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == user.ma_nguoi_dung).first()
            y, m, d = sd["ngay_vao_lam"].split("-")
            start_date = date_type(int(y), int(m), int(d))

            if not existing_staff:
                existing_staff = NhanVien(
                    ma_nguoi_dung=user.ma_nguoi_dung,
                    ma_nhan_vien_code=sd["code"],
                    chuc_vu=sd["chuc_vu"],
                    phong_ban=sd["phong_ban"],
                    ngay_vao_lam=start_date,
                    trang_thai=True,
                )
                db.add(existing_staff)
                seeded_staff_count += 1
            else:
                existing_staff.ma_nhan_vien_code = existing_staff.ma_nhan_vien_code or sd["code"]
                existing_staff.chuc_vu = sd["chuc_vu"]
                existing_staff.phong_ban = sd["phong_ban"]
                existing_staff.ngay_vao_lam = existing_staff.ngay_vao_lam or start_date
                existing_staff.trang_thai = True

        # Sync detailed staff permissions by current staff profile for existing data sets.
        synced_role_count = 0
        all_staff_records = db.query(NhanVien).all()
        for staff_record in all_staff_records:
            role_name = infer_staff_role_name(staff_record.chuc_vu, staff_record.phong_ban)
            role = role_map.get(role_name)
            if role and ensure_user_role(db, staff_record.ma_nguoi_dung, role.ma_vai_tro):
                synced_role_count += 1

        db.flush()

        # 8. Suppliers
        suppliers_data = [
            {"ten_nha_cung_cap": "Mỹ Phẩm Hàn Quốc ABC", "dia_chi": "12 Nguyễn Trãi, Q.5, TP.HCM", "so_dien_thoai": "0283333001", "email": "abc.cosmetics@email.com", "nguoi_lien_he": "Park Ji Eun"},
            {"ten_nha_cung_cap": "Thiết Bị Spa ProTech", "dia_chi": "45 Lý Thường Kiệt, Q.Tân Bình", "so_dien_thoai": "0283333002", "email": "protech@email.com", "nguoi_lien_he": "Nguyễn Văn Sơn"},
            {"ten_nha_cung_cap": "Tinh Dầu Thiên Nhiên VN", "dia_chi": "78 Trần Quốc Toản, Q.3, TP.HCM", "so_dien_thoai": "0283333003", "email": "tinhdat.vn@email.com", "nguoi_lien_he": "Trần Thị Hồng"},
            {"ten_nha_cung_cap": "Dược Phẩm Làm Đẹp SkinCare", "dia_chi": "22 Phan Xích Long, Q. Phú Nhuận", "so_dien_thoai": "0283333004", "email": "skincare@email.com", "nguoi_lien_he": "Lê Minh Tuấn"},
            {"ten_nha_cung_cap": "Vật Tư Y Tế Sài Gòn", "dia_chi": "101 Cộng Hòa, Q.Tân Bình", "so_dien_thoai": "0283333005", "email": "vattu.sg@email.com", "nguoi_lien_he": "Phạm Thị Lan"},
        ]
        for sup in suppliers_data:
            if not db.query(NhaCungCap).filter(NhaCungCap.ten_nha_cung_cap == sup["ten_nha_cung_cap"]).first():
                db.add(NhaCungCap(**sup, trang_thai="ACTIVE"))
        db.flush()

        # 9. Inventory records for existing products
        all_products = db.query(SanPham).all()
        inv_units = ["chai", "hộp", "tuýp", "lọ", "bộ"]
        inv_locations = ["Kệ A1", "Kệ A2", "Kệ B1", "Kệ B2", "Tủ lạnh"]
        for idx, prod in enumerate(all_products):
            if not db.query(TonKho).filter(TonKho.ma_san_pham == prod.ma_san_pham).first():
                db.add(TonKho(
                    ma_san_pham=prod.ma_san_pham,
                    so_luong=(idx + 1) * 8,
                    so_luong_toi_thieu=5,
                    don_vi=inv_units[idx % len(inv_units)],
                    vi_tri=inv_locations[idx % len(inv_locations)],
                ))
        db.flush()

        # 10. Sample invoices (seed if empty)
        invoice_count = db.query(HoaDon).count()
        seeded_invoice_count = 0
        if invoice_count == 0:
            seeded_invoices = InvoiceService(db).seed_sample_invoices(target_count=20, only_if_empty=True)
            seeded_invoice_count = len(seeded_invoices)

        db.commit()
        print("✅ Seed data created successfully!")
        print("   Admin mặc định (nếu tạo mới): admin@nhaspa.com / admin123")
        print(
            f"   Customers: {len(customers_data)} | "
            f"Staff profiles seeded mới: {seeded_staff_count} | "
            f"Staff roles added mới: {seeded_role_count + synced_role_count} | "
            f"Legacy MANAGER mappings removed: {removed_manager_mappings} | "
            f"Legacy MANAGER converted to STAFF: {migrated_manager_users} | "
            f"MANAGER role removed: {'yes' if deleted_manager_role else 'no'} | "
            f"Suppliers: {len(suppliers_data)} | "
            f"Invoices seeded mới: {seeded_invoice_count}"
        )

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
