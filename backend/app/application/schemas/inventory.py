"""
Inventory, Supplier, ImportReceipt schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


# --- Inventory ---
class InventoryResponse(BaseModel):
    ma_ton_kho: int
    ma_san_pham: int
    ten_san_pham: Optional[str] = None
    so_luong: int = 0
    so_luong_toi_thieu: int = 5
    don_vi: Optional[str] = None
    vi_tri: Optional[str] = None
    ngay_cap_nhat: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InventoryUpdate(BaseModel):
    so_luong_toi_thieu: Optional[int] = None
    don_vi: Optional[str] = None
    vi_tri: Optional[str] = None


# --- Supplier ---
class SupplierCreate(BaseModel):
    ten_nha_cung_cap: str = Field(..., max_length=200)
    dia_chi: Optional[str] = Field(None, max_length=500)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=150)
    nguoi_lien_he: Optional[str] = Field(None, max_length=100)
    ghi_chu: Optional[str] = None


class SupplierUpdate(BaseModel):
    ten_nha_cung_cap: Optional[str] = Field(None, max_length=200)
    dia_chi: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    email: Optional[str] = None
    nguoi_lien_he: Optional[str] = None
    ghi_chu: Optional[str] = None
    trang_thai: Optional[str] = None


class SupplierResponse(BaseModel):
    ma_nha_cung_cap: int
    ten_nha_cung_cap: str
    dia_chi: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    email: Optional[str] = None
    nguoi_lien_he: Optional[str] = None
    ghi_chu: Optional[str] = None
    trang_thai: str = "ACTIVE"
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Import Receipt ---
class ImportDetailCreate(BaseModel):
    ma_san_pham: int
    so_luong: int = Field(..., ge=1)
    don_gia: Decimal = Field(..., ge=0)
    ghi_chu: Optional[str] = None


class ImportReceiptCreate(BaseModel):
    ma_nha_cung_cap: int
    ghi_chu: Optional[str] = None
    chi_tiets: List[ImportDetailCreate] = Field(..., min_length=1)


class ImportDetailResponse(BaseModel):
    ma_chi_tiet: int
    ma_san_pham: int
    ten_san_pham: Optional[str] = None
    so_luong: int
    don_gia: Decimal
    thanh_tien: Decimal
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}


class ImportReceiptResponse(BaseModel):
    ma_phieu_nhap: int
    ma_nha_cung_cap: int
    ten_nha_cung_cap: Optional[str] = None
    ma_nhan_vien: Optional[int] = None
    tong_tien: Decimal = Decimal("0")
    trang_thai: str = "DRAFT"
    ghi_chu: Optional[str] = None
    ngay_nhap: Optional[datetime] = None
    chi_tiets: List[ImportDetailResponse] = []
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- BOM (Bill of Materials) ---
class BOMItemCreate(BaseModel):
    ma_ton_kho: int
    so_luong_tieu_hao: Decimal = Field(..., gt=0)
    ghi_chu: Optional[str] = None


class BOMItemResponse(BaseModel):
    ma_dinh_muc: int
    ma_san_pham: int
    ma_ton_kho: int
    ten_ton_kho: Optional[str] = None
    so_luong_tieu_hao: Decimal
    ghi_chu: Optional[str] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}
