"""
Marketing schemas: Promotion, Banner, News.
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


# --- Promotion ---
class PromotionCreate(BaseModel):
    ten_khuyen_mai: str = Field(..., max_length=200)
    mo_ta: Optional[str] = None
    loai_giam: str = Field(default="PERCENT", description="PERCENT or AMOUNT")
    gia_tri_giam: Decimal = Field(..., ge=0)
    giam_toi_da: Optional[Decimal] = None
    don_toi_thieu: Optional[Decimal] = None
    ma_code: Optional[str] = Field(None, max_length=50)
    ngay_bat_dau: datetime
    ngay_ket_thuc: datetime
    so_luot_su_dung: Optional[int] = None


class PromotionUpdate(BaseModel):
    ten_khuyen_mai: Optional[str] = None
    mo_ta: Optional[str] = None
    loai_giam: Optional[str] = None
    gia_tri_giam: Optional[Decimal] = None
    giam_toi_da: Optional[Decimal] = None
    don_toi_thieu: Optional[Decimal] = None
    ma_code: Optional[str] = None
    ngay_bat_dau: Optional[datetime] = None
    ngay_ket_thuc: Optional[datetime] = None
    so_luot_su_dung: Optional[int] = None
    trang_thai: Optional[str] = None


class PromotionResponse(BaseModel):
    ma_khuyen_mai: int
    ten_khuyen_mai: str
    mo_ta: Optional[str] = None
    loai_giam: str = "PERCENT"
    gia_tri_giam: Decimal
    giam_toi_da: Optional[Decimal] = None
    don_toi_thieu: Optional[Decimal] = None
    ma_code: Optional[str] = None
    ngay_bat_dau: datetime
    ngay_ket_thuc: datetime
    so_luot_su_dung: Optional[int] = None
    da_su_dung: int = 0
    trang_thai: str = "ACTIVE"
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Banner ---
class BannerCreate(BaseModel):
    tieu_de: str = Field(..., max_length=200)
    mo_ta: Optional[str] = Field(None, max_length=500)
    hinh_anh: Optional[str] = Field(None, max_length=500)
    duong_dan: Optional[str] = Field(None, max_length=500)
    thu_tu: int = 0
    ngay_bat_dau: Optional[datetime] = None
    ngay_ket_thuc: Optional[datetime] = None


class BannerUpdate(BaseModel):
    tieu_de: Optional[str] = None
    mo_ta: Optional[str] = None
    hinh_anh: Optional[str] = None
    duong_dan: Optional[str] = None
    thu_tu: Optional[int] = None
    trang_thai: Optional[str] = None
    ngay_bat_dau: Optional[datetime] = None
    ngay_ket_thuc: Optional[datetime] = None


class BannerResponse(BaseModel):
    ma_banner: int
    tieu_de: str
    mo_ta: Optional[str] = None
    hinh_anh: Optional[str] = None
    duong_dan: Optional[str] = None
    thu_tu: int = 0
    trang_thai: str = "ACTIVE"
    ngay_bat_dau: Optional[datetime] = None
    ngay_ket_thuc: Optional[datetime] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- News ---
class NewsCreate(BaseModel):
    tieu_de: str = Field(..., max_length=300)
    slug: str = Field(..., max_length=300)
    danh_muc: Optional[str] = Field(None, max_length=100)
    tom_tat: Optional[str] = Field(None, max_length=500)
    noi_dung: Optional[str] = None
    hinh_anh: Optional[str] = Field(None, max_length=500)
    tac_gia: Optional[str] = Field(None, max_length=100)
    ngay_dang: Optional[datetime] = None


class NewsUpdate(BaseModel):
    tieu_de: Optional[str] = None
    slug: Optional[str] = None
    danh_muc: Optional[str] = None
    tom_tat: Optional[str] = None
    noi_dung: Optional[str] = None
    hinh_anh: Optional[str] = None
    tac_gia: Optional[str] = None
    trang_thai: Optional[str] = None
    ngay_dang: Optional[datetime] = None


class NewsResponse(BaseModel):
    ma_tin_tuc: int
    tieu_de: str
    slug: str
    danh_muc: Optional[str] = None
    tom_tat: Optional[str] = None
    noi_dung: Optional[str] = None
    hinh_anh: Optional[str] = None
    tac_gia: Optional[str] = None
    trang_thai: str = "PUBLISHED"
    ngay_dang: Optional[datetime] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}
