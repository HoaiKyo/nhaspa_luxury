"""
Auth Service: Login, register, token management.
"""
from sqlalchemy.orm import Session
from typing import Optional

from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import ConflictException, UnauthorizedException, NotFoundException
from app.infrastructure.persistence.models.user import NguoiDung, VaiTro, NguoiDungVaiTro
from app.application.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, ForgotPasswordRequest
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, data: RegisterRequest) -> NguoiDung:
        """Register a new user."""
        # Check email uniqueness
        existing = self.db.query(NguoiDung).filter(NguoiDung.email == data.email).first()
        if existing:
            raise ConflictException(message="Email đã được sử dụng", errors={"email": ["Email đã tồn tại"]})

        # Check phone uniqueness if provided
        if data.so_dien_thoai:
            existing_phone = self.db.query(NguoiDung).filter(
                NguoiDung.so_dien_thoai == data.so_dien_thoai
            ).first()
            if existing_phone:
                raise ConflictException(
                    message="Số điện thoại đã được sử dụng",
                    errors={"so_dien_thoai": ["Số điện thoại đã tồn tại"]},
                )

        user = NguoiDung(
            ho_ten=data.ho_ten,
            email=data.email,
            mat_khau=get_password_hash(data.mat_khau),
            so_dien_thoai=data.so_dien_thoai,
            gioi_tinh=data.gioi_tinh,
        )
        self.db.add(user)

        # Assign default CUSTOMER role
        customer_role = self.db.query(VaiTro).filter(VaiTro.ten_vai_tro == "CUSTOMER").first()
        if customer_role:
            user_role = NguoiDungVaiTro(
                ma_nguoi_dung=user.ma_nguoi_dung,
                ma_vai_tro=customer_role.ma_vai_tro,
            )
            self.db.add(user_role)

        self.db.commit()
        self.db.refresh(user)
        logger.info("user_registered", user_id=user.ma_nguoi_dung, email=user.email)
        return user

    def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate user and return JWT tokens."""
        user = self.db.query(NguoiDung).filter(NguoiDung.email == data.email).first()
        if not user or not verify_password(data.mat_khau, user.mat_khau):
            raise UnauthorizedException(message="Email hoặc mật khẩu không đúng")

        if not user.trang_thai:
            raise UnauthorizedException(message="Tài khoản đã bị khóa")

        # Build token payload
        roles = [r.ten_vai_tro for r in user.vai_tros]
        token_data = {
            "sub": str(user.ma_nguoi_dung),
            "email": user.email,
            "roles": roles,
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        logger.info("user_login", user_id=user.ma_nguoi_dung)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    def refresh_token(self, refresh_token_str: str) -> TokenResponse:
        """Refresh access token using a valid refresh token."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException(message="Refresh token không hợp lệ")

        user_id = payload.get("sub")
        user = self.db.query(NguoiDung).filter(
            NguoiDung.ma_nguoi_dung == int(user_id)
        ).first()
        if not user or not user.trang_thai:
            raise UnauthorizedException(message="Người dùng không tồn tại hoặc đã bị khóa")

        roles = [r.ten_vai_tro for r in user.vai_tros]
        token_data = {
            "sub": str(user.ma_nguoi_dung),
            "email": user.email,
            "roles": roles,
        }

        new_access = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)

        return TokenResponse(access_token=new_access, refresh_token=new_refresh)

    def change_password(self, user: NguoiDung, old_password: str, new_password: str) -> None:
        """Change user password."""
        if not verify_password(old_password, user.mat_khau):
            raise UnauthorizedException(message="Mật khẩu hiện tại không đúng")

        user.mat_khau = get_password_hash(new_password)
        self.db.commit()
        logger.info("password_changed", user_id=user.ma_nguoi_dung)

    def forgot_password(self, data: ForgotPasswordRequest) -> None:
        """Reset password using email and phone combination."""
        user = self.db.query(NguoiDung).filter(
            NguoiDung.email == data.email,
            NguoiDung.so_dien_thoai == data.so_dien_thoai
        ).first()

        if not user:
            raise NotFoundException(message="Thông tin email hoặc số điện thoại không chính xác")
        
        user.mat_khau = get_password_hash(data.mat_khau_moi)
        self.db.commit()
        logger.info("forgot_password_reset", user_id=user.ma_nguoi_dung)
