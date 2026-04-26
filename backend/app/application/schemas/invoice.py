"""
Invoice and Payment schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class InvoiceDetailCreate(BaseModel):
    ma_san_pham: int
    so_luong: int = Field(default=1, ge=1)
    don_gia: Decimal = Field(..., ge=0)
    ghi_chu: Optional[str] = None


class InvoiceCreate(BaseModel):
    ma_lich_hen: Optional[int] = None
    ma_khach_hang: int
    ma_khuyen_mai: Optional[int] = None
    diem_su_dung: int = 0
    ghi_chu: Optional[str] = None
    chi_tiets: List[InvoiceDetailCreate] = Field(..., min_length=1)


class InvoiceEdit(BaseModel):
    ma_khuyen_mai: Optional[int] = None
    diem_su_dung: int = 0
    ghi_chu: Optional[str] = None
    chi_tiets: List[InvoiceDetailCreate] = Field(..., min_length=1)


class InvoiceUpdate(BaseModel):
    trang_thai: Optional[str] = None
    ghi_chu: Optional[str] = None


class InvoiceDetailResponse(BaseModel):
    ma_chi_tiet: int
    ma_san_pham: int
    ten_san_pham: Optional[str] = None
    so_luong: int
    don_gia: Decimal
    thanh_tien: Decimal
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    ma_hoa_don: int
    so_tien: Decimal = Field(..., gt=0)
    phuong_thuc: str = Field(default="CASH")
    ma_giao_dich: Optional[str] = None
    ghi_chu: Optional[str] = None


class PaymentResponse(BaseModel):
    ma_thanh_toan: int
    ma_hoa_don: int
    so_tien: Decimal
    phuong_thuc: str
    trang_thai: str = "SUCCESS"
    ma_giao_dich: Optional[str] = None
    ghi_chu: Optional[str] = None
    ngay_thanh_toan: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    ma_hoa_don: int
    ma_lich_hen: Optional[int] = None
    ma_khach_hang: int
    ho_ten_khach: Optional[str] = None
    ma_nhan_vien: Optional[int] = None
    ma_khuyen_mai: Optional[int] = None
    tong_tien: Decimal = Decimal("0")
    giam_gia: Decimal = Decimal("0")
    thue: Decimal = Decimal("0")
    diem_su_dung: int = 0
    gia_tri_diem: Decimal = Decimal("0")
    diem_tich_luy: int = 0
    thanh_tien: Decimal = Decimal("0")
    trang_thai: str = "DRAFT"
    trang_thai_hd_dien_tu: str = "NOT_ISSUED"
    ghi_chu: Optional[str] = None
    chi_tiets: List[InvoiceDetailResponse] = []
    thanh_toans: List[PaymentResponse] = []
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PointHistoryResponse(BaseModel):
    ma_lich_su: int
    ma_khach_hang: int
    ma_hoa_don: Optional[int] = None
    loai_bien_dong: str
    diem_thay_doi: int
    so_du_sau: int
    noi_dung: Optional[str] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}
