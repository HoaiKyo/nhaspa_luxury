"""
Seed/sync staff data + detailed RBAC role mapping.

Run:
    python -m app.seeds.seed_staff_permissions
"""

from datetime import date

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.infrastructure.persistence.models import user, staff, product, marketing, invoice, inventory, combo, appointment
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.user import NguoiDung, NguoiDungVaiTro, VaiTro


SAMPLE_STAFF_ACCOUNTS = [
    {
        "ho_ten": "Nguyễn Hoàng Sơn",
        "email": "son.nguyen.staff@nhaspa.com",
        "so_dien_thoai": "0903333001",
        "mat_khau": "staff123",
        "ma_nhan_vien_code": "NSP201",
        "chuc_vu": "Kỹ thuật viên massage",
        "phong_ban": "Dịch vụ",
        "ngay_vao_lam": "2024-06-01",
    },
    {
        "ho_ten": "Trần Mỹ Linh",
        "email": "linh.tran.reception@nhaspa.com",
        "so_dien_thoai": "0903333002",
        "mat_khau": "staff123",
        "ma_nhan_vien_code": "NSP202",
        "chuc_vu": "Lễ tân",
        "phong_ban": "Hành chính",
        "ngay_vao_lam": "2024-04-15",
    },
    {
        "ho_ten": "Phạm Khánh Duy",
        "email": "duy.pham.stafflead@nhaspa.com",
        "so_dien_thoai": "0903333003",
        "mat_khau": "staff123",
        "ma_nhan_vien_code": "NSP203",
        "chuc_vu": "Trưởng bộ phận",
        "phong_ban": "Quản lý",
        "ngay_vao_lam": "2023-11-10",
    },
]


DETAILED_PERMISSION_MATRIX = {
    "ADMIN": [
        "Xem và quản lý toàn bộ nhân viên, lịch làm việc, nghỉ phép",
        "Tạo/Cập nhật danh mục, dịch vụ/sản phẩm, kho, marketing",
        "Xử lý lịch hẹn, hóa đơn, thanh toán, nhập kho",
    ],
    "RECEPTIONIST": [
        "Quản lý lịch hẹn và tạo lịch cho khách",
        "Xem thông tin nhân viên, lịch làm việc, nghỉ phép",
        "Xử lý hóa đơn/thanh toán tại quầy lễ tân",
    ],
    "STAFF": [
        "Xem dashboard, lịch hẹn, lịch làm việc",
        "Xem/ghi nhận trạng thái xử lý lịch hẹn được phân công",
        "Tạo và theo dõi đơn nghỉ phép cá nhân",
    ],
}


def infer_staff_role_name(chuc_vu: str = "", phong_ban: str = "") -> str:
    text = f"{chuc_vu or ''} {phong_ban or ''}".lower()
    receptionist_keywords = ("lễ tân", "le tan", "tiếp tân", "tiep tan", "thu ngân", "thu ngan")

    if any(keyword in text for keyword in receptionist_keywords):
        return "RECEPTIONIST"
    return "STAFF"


def ensure_role(db, role_name: str, description: str) -> VaiTro:
    role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == role_name).first()
    if role:
        return role
    role = VaiTro(ten_vai_tro=role_name, mo_ta=description)
    db.add(role)
    db.flush()
    return role


def ensure_user_role(db, user_id: int, role_id: int) -> bool:
    existing = db.query(NguoiDungVaiTro).filter(
        NguoiDungVaiTro.ma_nguoi_dung == user_id,
        NguoiDungVaiTro.ma_vai_tro == role_id,
    ).first()
    if existing:
        return False

    db.add(NguoiDungVaiTro(ma_nguoi_dung=user_id, ma_vai_tro=role_id))
    return True


def ensure_staff_record(db, user: NguoiDung, payload: dict) -> bool:
    existing = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == user.ma_nguoi_dung).first()

    yyyy, mm, dd = payload["ngay_vao_lam"].split("-")
    start_date = date(int(yyyy), int(mm), int(dd))

    if not existing:
        db.add(
            NhanVien(
                ma_nguoi_dung=user.ma_nguoi_dung,
                ma_nhan_vien_code=payload["ma_nhan_vien_code"],
                chuc_vu=payload["chuc_vu"],
                phong_ban=payload["phong_ban"],
                ngay_vao_lam=start_date,
                trang_thai=True,
            )
        )
        return True

    existing.ma_nhan_vien_code = existing.ma_nhan_vien_code or payload["ma_nhan_vien_code"]
    existing.chuc_vu = payload["chuc_vu"]
    existing.phong_ban = payload["phong_ban"]
    existing.ngay_vao_lam = existing.ngay_vao_lam or start_date
    existing.trang_thai = True
    return False


def seed_staff_accounts_if_empty(db, role_by_name: dict[str, VaiTro]) -> tuple[int, int, int]:
    created_users = 0
    created_staff = 0
    created_roles = 0

    if db.query(NhanVien).count() > 0:
        return created_users, created_staff, created_roles

    for payload in SAMPLE_STAFF_ACCOUNTS:
        user = db.query(NguoiDung).filter(NguoiDung.email == payload["email"]).first()
        if not user:
            user = NguoiDung(
                ho_ten=payload["ho_ten"],
                email=payload["email"],
                so_dien_thoai=payload["so_dien_thoai"],
                mat_khau=get_password_hash(payload["mat_khau"]),
                trang_thai=True,
            )
            db.add(user)
            db.flush()
            created_users += 1

        role_name = infer_staff_role_name(payload["chuc_vu"], payload["phong_ban"])
        role = role_by_name[role_name]
        if ensure_user_role(db, user.ma_nguoi_dung, role.ma_vai_tro):
            created_roles += 1

        if ensure_staff_record(db, user, payload):
            created_staff += 1

    return created_users, created_staff, created_roles


def sync_staff_roles(db, role_by_name: dict[str, VaiTro]) -> int:
    added_roles = 0
    records = db.query(NhanVien).all()

    for row in records:
        role_name = infer_staff_role_name(row.chuc_vu or "", row.phong_ban or "")
        role = role_by_name[role_name]
        if ensure_user_role(db, row.ma_nguoi_dung, role.ma_vai_tro):
            added_roles += 1

    return added_roles


def migrate_manager_role(db, role_by_name: dict[str, VaiTro]) -> tuple[int, int, bool]:
    """
    Legacy migration: system now uses 4 roles only (ADMIN/STAFF/RECEPTIONIST/CUSTOMER).
    Convert MANAGER mappings to STAFF and remove MANAGER role if unused.
    """
    manager_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "MANAGER").first()
    if not manager_role:
        return 0, 0, False

    staff_role = role_by_name["STAFF"]
    mappings = db.query(NguoiDungVaiTro).filter(
        NguoiDungVaiTro.ma_vai_tro == manager_role.ma_vai_tro
    ).all()

    reassigned_to_staff = 0
    removed_manager_mappings = 0

    for mapping in mappings:
        if ensure_user_role(db, mapping.ma_nguoi_dung, staff_role.ma_vai_tro):
            reassigned_to_staff += 1
        db.delete(mapping)
        removed_manager_mappings += 1

    db.flush()

    manager_mapping_left = db.query(NguoiDungVaiTro).filter(
        NguoiDungVaiTro.ma_vai_tro == manager_role.ma_vai_tro
    ).count()
    deleted_manager_role = False
    if manager_mapping_left == 0:
        db.delete(manager_role)
        deleted_manager_role = True

    return reassigned_to_staff, removed_manager_mappings, deleted_manager_role


def run() -> None:
    db = SessionLocal()
    try:
        role_by_name = {
            "ADMIN": ensure_role(db, "ADMIN", "Quản trị hệ thống"),
            "RECEPTIONIST": ensure_role(db, "RECEPTIONIST", "Lễ tân"),
            "STAFF": ensure_role(db, "STAFF", "Nhân viên"),
            "CUSTOMER": ensure_role(db, "CUSTOMER", "Khách hàng"),
        }

        migrated_to_staff, removed_manager_mappings, deleted_manager_role = migrate_manager_role(db, role_by_name)
        created_users, created_staff, created_roles = seed_staff_accounts_if_empty(db, role_by_name)
        synced_roles = sync_staff_roles(db, role_by_name)

        db.commit()

        print("✅ Staff seed/sync completed")
        print(f"   Users created: {created_users}")
        print(f"   Staff profiles created: {created_staff}")
        print(f"   Staff roles added: {created_roles + synced_roles}")
        print(f"   Legacy MANAGER mappings removed: {removed_manager_mappings}")
        print(f"   Legacy MANAGER users converted to STAFF: {migrated_to_staff}")
        print(f"   MANAGER role removed from system: {'yes' if deleted_manager_role else 'no'}")
        print("\n📌 Detailed staff permissions:")
        for role_name, rights in DETAILED_PERMISSION_MATRIX.items():
            print(f"   - {role_name}:")
            for right in rights:
                print(f"     • {right}")

        if created_staff > 0:
            print("\n🔑 Sample staff accounts (default password: staff123):")
            for payload in SAMPLE_STAFF_ACCOUNTS:
                print(f"   - {payload['email']} ({payload['chuc_vu']})")

    except Exception as exc:
        db.rollback()
        print(f"❌ Staff seed/sync failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
