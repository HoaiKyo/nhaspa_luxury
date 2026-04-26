"""
Combo schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class ComboDetailCreate(BaseModel):
    ma_dich_vu: int
    so_luong: int = Field(default=1, ge=1)
    ghi_chu: Optional[str] = None


class ComboDetailResponse(BaseModel):
    ma_chi_tiet: int
    ma_combo: int
    ma_dich_vu: int
    so_luong: int = 1
    ten_dich_vu: Optional[str] = None
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}


class CustomerComboCreate(BaseModel):
    ma_khach_hang: int
    ma_combo: int
    tong_so_luot: int = Field(..., ge=1)
    gia_mua: Optional[Decimal] = None
    ngay_het_han: Optional[datetime] = None
    ghi_chu: Optional[str] = None


class CustomerComboResponse(BaseModel):
    ma_combo_kh: int
    ma_khach_hang: int
    ma_combo: int
    tong_so_luot: int
    so_luot_con_lai: int
    ngay_mua: Optional[datetime] = None
    ngay_het_han: Optional[datetime] = None
    gia_mua: Optional[Decimal] = None
    ten_combo: Optional[str] = None
    ho_ten_khach: Optional[str] = None
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}
