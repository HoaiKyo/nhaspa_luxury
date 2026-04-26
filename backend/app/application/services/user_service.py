"""
User Service: CRUD users, assign roles.
"""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple

from app.core.security import get_password_hash
from app.core.exceptions import NotFoundException, ConflictException
from app.infrastructure.persistence.models.user import NguoiDung, VaiTro, NguoiDungVaiTro


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_users(
        self, page: int = 1, page_size: int = 10, search: Optional[str] = None
    ) -> Tuple[List[NguoiDung], int]:
        """Get paginated users with optional search."""
        query = self.db.query(NguoiDung).options(joinedload(NguoiDung.vai_tros))
        if search:
            query = query.filter(
                NguoiDung.ho_ten.ilike(f"%{search}%")
                | NguoiDung.email.ilike(f"%{search}%")
                | NguoiDung.so_dien_thoai.ilike(f"%{search}%")
            )

        total = query.count()
        users = (
            query.order_by(NguoiDung.ma_nguoi_dung.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return users, total

    def get_user_by_id(self, user_id: int) -> NguoiDung:
        """Get user by ID."""
        user = (
            self.db.query(NguoiDung)
            .options(joinedload(NguoiDung.vai_tros))
            .filter(NguoiDung.ma_nguoi_dung == user_id)
            .first()
        )
        if not user:
            raise NotFoundException(message="Không tìm thấy người dùng")
        return user

    def create_user(self, data: dict) -> NguoiDung:
        """Create a new user (admin action)."""
        existing = self.db.query(NguoiDung).filter(NguoiDung.email == data["email"]).first()
        if existing:
            raise ConflictException(message="Email đã tồn tại")

        role_ids = data.pop("vai_tro_ids", [])
        data["mat_khau"] = get_password_hash(data["mat_khau"])

        user = NguoiDung(**data)
        self.db.add(user)
        self.db.flush()

        # Assign roles
        for role_id in role_ids:
            self.db.add(NguoiDungVaiTro(ma_nguoi_dung=user.ma_nguoi_dung, ma_vai_tro=role_id))

        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user_id: int, data: dict) -> NguoiDung:
        """Update user info."""
        user = self.get_user_by_id(user_id)
        for key, value in data.items():
            if value is not None and hasattr(user, key):
                setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user_id: int) -> None:
        """Soft-delete user by deactivating."""
        user = self.get_user_by_id(user_id)
        user.trang_thai = False
        self.db.commit()

    def assign_roles(self, user_id: int, role_ids: List[int]) -> NguoiDung:
        """Assign roles to user (replace existing)."""
        user = self.get_user_by_id(user_id)

        # Remove existing roles
        self.db.query(NguoiDungVaiTro).filter(
            NguoiDungVaiTro.ma_nguoi_dung == user_id
        ).delete()

        # Add new roles
        for role_id in role_ids:
            role = self.db.query(VaiTro).filter(VaiTro.ma_vai_tro == role_id).first()
            if not role:
                raise NotFoundException(message=f"Vai trò ID {role_id} không tồn tại")
            self.db.add(NguoiDungVaiTro(ma_nguoi_dung=user_id, ma_vai_tro=role_id))

        self.db.commit()
        self.db.refresh(user)
        return user

    # --- Role CRUD ---
    def get_roles(self) -> List[VaiTro]:
        return self.db.query(VaiTro).all()

    def create_role(self, data: dict) -> VaiTro:
        existing = self.db.query(VaiTro).filter(VaiTro.ten_vai_tro == data["ten_vai_tro"]).first()
        if existing:
            raise ConflictException(message="Tên vai trò đã tồn tại")
        role = VaiTro(**data)
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update_role(self, role_id: int, data: dict) -> VaiTro:
        role = self.db.query(VaiTro).filter(VaiTro.ma_vai_tro == role_id).first()
        if not role:
            raise NotFoundException(message="Vai trò không tồn tại")
        for key, value in data.items():
            if value is not None:
                setattr(role, key, value)
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete_role(self, role_id: int) -> None:
        role = self.db.query(VaiTro).filter(VaiTro.ma_vai_tro == role_id).first()
        if not role:
            raise NotFoundException(message="Vai trò không tồn tại")
        self.db.delete(role)
        self.db.commit()
