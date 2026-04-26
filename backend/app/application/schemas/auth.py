"""
Auth schemas: Login, Register, Token responses.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class LoginRequest(BaseModel):
    email: str = Field(..., description="Email đăng nhập")
    mat_khau: str = Field(..., min_length=6, description="Mật khẩu")


class RegisterRequest(BaseModel):
    ho_ten: str = Field(..., min_length=2, max_length=100, description="Họ và tên")
    email: str = Field(..., description="Email")
    mat_khau: str = Field(..., min_length=6, max_length=50, description="Mật khẩu")
    so_dien_thoai: Optional[str] = Field(None, max_length=20, description="Số điện thoại")
    gioi_tinh: Optional[str] = Field(None, description="Giới tính")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token")


class UserProfileResponse(BaseModel):
    ma_nguoi_dung: int
    ho_ten: str
    email: str
    so_dien_thoai: Optional[str] = None
    gioi_tinh: Optional[str] = None
    ngay_sinh: Optional[datetime] = None
    dia_chi: Optional[str] = None
    anh_dai_dien: Optional[str] = None
    diem_tich_luy: int = 0
    hang_thanh_vien: str = "Thành viên mới"
    vai_tros: List[str] = []

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    mat_khau_cu: str = Field(..., description="Mật khẩu hiện tại")
    mat_khau_moi: str = Field(..., min_length=6, description="Mật khẩu mới")

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Email đã đăng ký")
    so_dien_thoai: str = Field(..., description="Số điện thoại đã đăng ký")
    mat_khau_moi: str = Field(..., min_length=6, description="Mật khẩu mới")
