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
    so_tien_khach_tra: Decimal = Decimal('0')
    so_tien_tra_lai: Decimal = Decimal('0')
    ghi_chu: Optional[str] = None
    chi_tiets: List[InvoiceDetailCreate] = Field(..., min_length=1)


class InvoiceEdit(BaseModel):
    ma_khuyen_mai: Optional[int] = None
    so_tien_khach_tra: Decimal = Decimal('0')
    so_tien_tra_lai: Decimal = Decimal('0')
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
    so_tien: Optional[Decimal] = Field(default=None, gt=0)
    phuong_thuc: str = Field(default="CASH")
    trang_thai: str = Field(default="PAID")
    ma_giao_dich: Optional[str] = None
    ghi_chu: Optional[str] = None


class PaymentResponse(BaseModel):
    ma_thanh_toan: int
    ma_hoa_don: int
    so_tien: Decimal
    phuong_thuc: str
    trang_thai: str = "PAID"
    ma_giao_dich: Optional[str] = None
    ghi_chu: Optional[str] = None
    ngay_thanh_toan: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InvoicePayRequest(BaseModel):
    phuong_thuc: str = Field(default="CASH")
    ghi_chu: Optional[str] = None


class VnpayCreateUrlRequest(BaseModel):
    ma_hoa_don: int
    return_url: Optional[str] = None


class VnpayCreateUrlResponse(BaseModel):
    ma_hoa_don: int
    txn_ref: str
    payment_url: str
    amount: Decimal


class VnpayCallbackResponse(BaseModel):
    success: bool
    ma_hoa_don: int
    txn_ref: str
    payment_method: str
    payment_status: str
    invoice_status: str
    response_code: Optional[str] = None


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
    so_tien_khach_tra: Decimal = Decimal("0")
    so_tien_tra_lai: Decimal = Decimal("0")
    thanh_tien: Decimal = Decimal("0")
    trang_thai: str = "DRAFT"
    payment_method: str = "CASH"
    payment_status: str = "UNPAID"
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
