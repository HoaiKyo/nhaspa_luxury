"""
Category and Product schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


# --- Category Schemas ---
class CategoryCreate(BaseModel):
    ten_danh_muc: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    mo_ta: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    thu_tu: int = 0


class CategoryUpdate(BaseModel):
    ten_danh_muc: Optional[str] = Field(None, max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    mo_ta: Optional[str] = None
    icon: Optional[str] = None
    thu_tu: Optional[int] = None
    trang_thai: Optional[bool] = None


class CategoryResponse(BaseModel):
    ma_danh_muc: int
    ten_danh_muc: str
    slug: str
    mo_ta: Optional[str] = None
    icon: Optional[str] = None
    thu_tu: int = 0
    trang_thai: bool = True
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Pricing Schemas ---
class PricingCreate(BaseModel):
    gia: Decimal = Field(..., ge=0)
    gia_goc: Optional[Decimal] = Field(None, ge=0)
    thoi_luong: Optional[str] = Field(None, max_length=50)
    ngay_ap_dung: Optional[datetime] = None
    ngay_ket_thuc: Optional[datetime] = None
    ghi_chu: Optional[str] = Field(None, max_length=255)


class PricingResponse(BaseModel):
    ma_bang_gia: int
    ma_san_pham: int
    gia: Decimal
    gia_goc: Optional[Decimal] = None
    thoi_luong: Optional[str] = None
    ngay_ap_dung: Optional[datetime] = None
    ngay_ket_thuc: Optional[datetime] = None
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Product Schemas ---
class ProductCreate(BaseModel):
    ma_danh_muc: int
    ten_san_pham: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=200)
    mo_ta: Optional[str] = None
    mo_ta_ngan: Optional[str] = Field(None, max_length=500)
    hinh_anh: Optional[str] = Field(None, max_length=500)
    loai: str = Field(default="SERVICE", description="SERVICE, PRODUCT, PACKAGE")
    thoi_luong: Optional[int] = Field(None, ge=0, description="Thời lượng (phút)")
    thu_tu: int = 0
    bang_gias: Optional[List[PricingCreate]] = []


class ProductUpdate(BaseModel):
    ma_danh_muc: Optional[int] = None
    ten_san_pham: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    mo_ta: Optional[str] = None
    mo_ta_ngan: Optional[str] = None
    hinh_anh: Optional[str] = None
    loai: Optional[str] = None
    thoi_luong: Optional[int] = None
    thu_tu: Optional[int] = None
    trang_thai: Optional[bool] = None


class ProductResponse(BaseModel):
    ma_san_pham: int
    ma_danh_muc: int
    ten_san_pham: str
    slug: str
    mo_ta: Optional[str] = None
    mo_ta_ngan: Optional[str] = None
    hinh_anh: Optional[str] = None
    loai: str = "SERVICE"
    thoi_luong: Optional[int] = None
    thu_tu: int = 0
    trang_thai: bool = True
    ten_danh_muc: Optional[str] = None
    bang_gias: List[PricingResponse] = []
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}
