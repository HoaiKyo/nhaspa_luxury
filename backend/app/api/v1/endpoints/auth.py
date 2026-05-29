"""Auth API endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.response import success_response
from app.application.schemas.auth import LoginRequest, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest, ForgotPasswordRequest
from app.application.services.auth_service import AuthService
from app.api.v1.dependencies import get_current_user
from app.infrastructure.persistence.models.user import NguoiDung

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.register(data)
    return success_response(data={"ma_nguoi_dung": user.ma_nguoi_dung, "email": user.email}, message="Đăng ký thành công")


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    tokens = service.login(data)
    return success_response(data=tokens.model_dump(), message="Đăng nhập thành công")


@router.post("/refresh")
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    tokens = service.refresh_token(data.refresh_token)
    return success_response(data=tokens.model_dump(), message="Làm mới token thành công")


@router.get("/profile")
def get_profile(current_user: NguoiDung = Depends(get_current_user)):
    roles = [r.ten_vai_tro for r in current_user.vai_tros]
    return success_response(data={
        "ma_nguoi_dung": current_user.ma_nguoi_dung,
        "ho_ten": current_user.ho_ten,
        "email": current_user.email,
        "so_dien_thoai": current_user.so_dien_thoai,
        "gioi_tinh": current_user.gioi_tinh,
        "dia_chi": current_user.dia_chi,
        "anh_dai_dien": current_user.anh_dai_dien,
        "vai_tros": roles,
    })


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, current_user: NguoiDung = Depends(get_current_user), db: Session = Depends(get_db)):
    service = AuthService(db)
    service.change_password(current_user, data.mat_khau_cu, data.mat_khau_moi)
    return success_response(message="Đổi mật khẩu thành công")


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    service.forgot_password(data)
    return success_response(message="Cập nhật mật khẩu mới thành công")

