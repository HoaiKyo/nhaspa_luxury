"""
Appointment schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date, time, datetime
from decimal import Decimal


class AppointmentDetailCreate(BaseModel):
    ma_san_pham: int
    ma_nhan_vien: Optional[int] = None
    ma_khach_di_kem: Optional[int] = None
    chi_so_khach_di_kem: Optional[int] = None
    ma_combo_kh: Optional[int] = None
    gio_bat_dau: Optional[time] = None
    gio_ket_thuc: Optional[time] = None
    gia: Optional[Decimal] = None
    ghi_chu: Optional[str] = None


class GuestCreate(BaseModel):
    ho_ten: str = Field(..., max_length=100)
    so_dien_thoai: Optional[str] = Field(None, max_length=20)
    ghi_chu: Optional[str] = None


class GuestBookingCreate(BaseModel):
    ho_ten: str = Field(..., max_length=100)
    so_dien_thoai: str = Field(..., max_length=20)
    ngay_hen: date
    gio_bat_dau: time
    ghi_chu: Optional[str] = None
    ma_san_phams: Optional[List[int]] = None
    khach_di_kems: Optional[List[GuestCreate]] = []
    chi_tiets: Optional[List[AppointmentDetailCreate]] = []


class AppointmentCreate(BaseModel):
    ngay_hen: date
    gio_bat_dau: time
    gio_ket_thuc: Optional[time] = None
    ghi_chu: Optional[str] = None
    ma_san_phams: Optional[List[int]] = None
    khach_di_kems: Optional[List[GuestCreate]] = []
    chi_tiets: Optional[List[AppointmentDetailCreate]] = []


class AppointmentDetailUpdate(BaseModel):
    ma_chi_tiet: Optional[int] = None
    ma_san_pham: Optional[int] = None
    ma_nhan_vien: Optional[int] = None
    ma_khach_di_kem: Optional[int] = None
    gio_bat_dau: Optional[time] = None
    gio_ket_thuc: Optional[time] = None
    ghi_chu: Optional[str] = None


class AppointmentUpdate(BaseModel):
    ngay_hen: Optional[date] = None
    gio_bat_dau: Optional[time] = None
    gio_ket_thuc: Optional[time] = None
    trang_thai: Optional[str] = None
    ghi_chu: Optional[str] = None
    chi_tiets: Optional[List[AppointmentDetailUpdate]] = None
    khach_di_kems: Optional[List[GuestCreate]] = None


class AppointmentDetailResponse(BaseModel):
    ma_chi_tiet: int
    ma_san_pham: int
    ten_san_pham: Optional[str] = None
    ma_nhan_vien: Optional[int] = None
    ho_ten_nhan_vien: Optional[str] = None
    ma_khach_di_kem: Optional[int] = None
    ma_combo_kh: Optional[int] = None
    gio_bat_dau: Optional[time] = None
    gio_ket_thuc: Optional[time] = None
    gia: Optional[Decimal] = None
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}


class GuestResponse(BaseModel):
    ma_khach_di_kem: int
    ho_ten: str
    so_dien_thoai: Optional[str] = None
    ghi_chu: Optional[str] = None

    model_config = {"from_attributes": True}


class AppointmentResponse(BaseModel):
    ma_lich_hen: int
    ma_khach_hang: int
    ma_hoa_don: Optional[int] = None
    ho_ten_khach: Optional[str] = None
    so_dien_thoai_khach: Optional[str] = None
    ngay_hen: date
    gio_bat_dau: time
    gio_ket_thuc: Optional[time] = None
    trang_thai: str = "PENDING"
    ghi_chu: Optional[str] = None
    khach_di_kems: List[GuestResponse] = []
    chi_tiets: List[AppointmentDetailResponse] = []
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}
