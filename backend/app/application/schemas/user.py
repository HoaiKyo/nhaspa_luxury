"""
User and Role schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


# --- Role Schemas ---
class RoleCreate(BaseModel):
    ten_vai_tro: str = Field(..., max_length=50)
    mo_ta: Optional[str] = Field(None, max_length=255)


class RoleUpdate(BaseModel):
    ten_vai_tro: Optional[str] = Field(None, max_length=50)
    mo_ta: Optional[str] = Field(None, max_length=255)


class RoleResponse(BaseModel):
    ma_vai_tro: int
    ten_vai_tro: str
    mo_ta: Optional[str] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- User Schemas ---
class UserCreate(BaseModel):
    ho_ten: str = Field(..., min_length=2, max_length=100)
    email: str = Field(...)
    mat_khau: str = Field(..., min_length=6)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    gioi_tinh: Optional[str] = None
    ngay_sinh: Optional[datetime] = None
    dia_chi: Optional[str] = Field(None, max_length=255)
    vai_tro_ids: Optional[List[int]] = []


class UserUpdate(BaseModel):
    ho_ten: Optional[str] = Field(None, max_length=100)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    gioi_tinh: Optional[str] = None
    ngay_sinh: Optional[datetime] = None
    dia_chi: Optional[str] = Field(None, max_length=255)
    anh_dai_dien: Optional[str] = None
    trang_thai: Optional[bool] = None


class UserResponse(BaseModel):
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
    trang_thai: bool = True
    vai_tros: List[RoleResponse] = []
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AssignRolesRequest(BaseModel):
    vai_tro_ids: List[int] = Field(..., description="Danh sách mã vai trò")
