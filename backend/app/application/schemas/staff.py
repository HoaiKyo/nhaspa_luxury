"""
Staff, Shift, WorkSchedule, Leave schemas.
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import date, time, datetime
from app.domain.enums import LeaveStatus, LeaveType


# --- Shift Schemas ---
class ShiftCreate(BaseModel):
    ten_ca: str = Field(..., max_length=50)
    gio_bat_dau: time
    gio_ket_thuc: time
    mo_ta: Optional[str] = Field(None, max_length=255)


class ShiftUpdate(BaseModel):
    ten_ca: Optional[str] = Field(None, max_length=50)
    gio_bat_dau: Optional[time] = None
    gio_ket_thuc: Optional[time] = None
    mo_ta: Optional[str] = None
    trang_thai: Optional[bool] = None


class ShiftResponse(BaseModel):
    ma_ca: int
    ten_ca: str
    gio_bat_dau: time
    gio_ket_thuc: time
    mo_ta: Optional[str] = None
    trang_thai: bool = True

    model_config = {"from_attributes": True}


# --- Staff Schemas ---
class StaffCreate(BaseModel):
    ma_nguoi_dung: int
    ma_nhan_vien_code: Optional[str] = Field(None, max_length=20)
    chuc_vu: Optional[str] = Field(None, max_length=100)
    phong_ban: Optional[str] = Field(None, max_length=100)
    ngay_vao_lam: Optional[date] = None
    danh_sach_ma_dich_vu: Optional[list[int]] = None


class StaffUpdate(BaseModel):
    ma_nhan_vien_code: Optional[str] = Field(None, max_length=20)
    chuc_vu: Optional[str] = Field(None, max_length=100)
    phong_ban: Optional[str] = Field(None, max_length=100)
    ngay_vao_lam: Optional[date] = None
    trang_thai: Optional[bool] = None
    danh_sach_ma_dich_vu: Optional[list[int]] = None


class StaffResponse(BaseModel):
    ma_nhan_vien: int
    ma_nguoi_dung: int
    ma_nhan_vien_code: Optional[str] = None
    chuc_vu: Optional[str] = None
    phong_ban: Optional[str] = None
    ngay_vao_lam: Optional[date] = None
    trang_thai: bool = True
    ho_ten: Optional[str] = None  # From nguoi_dung
    email: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    specializations: Optional[list[str]] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StaffPublicResponse(BaseModel):
    ma_nhan_vien: int
    ho_ten: Optional[str] = None
    chuc_vu: Optional[str] = None

    model_config = {"from_attributes": True}


# --- WorkSchedule Schemas ---
class ScheduleCreate(BaseModel):
    ma_nhan_vien: int
    ma_ca: int
    ngay_lam_viec: date
    ghi_chu: Optional[str] = Field(None, max_length=255)


class ScheduleUpdate(BaseModel):
    ma_nhan_vien: Optional[int] = None
    ma_ca: Optional[int] = None
    ngay_lam_viec: Optional[date] = None
    ghi_chu: Optional[str] = Field(None, max_length=255)


class ScheduleResponse(BaseModel):
    ma_lich: int
    ma_nhan_vien: int
    ma_ca: int
    ngay_lam_viec: date
    ghi_chu: Optional[str] = None
    ten_ca: Optional[str] = None
    ho_ten_nhan_vien: Optional[str] = None
    trang_thai: str = "ACTIVE"

    model_config = {"from_attributes": True}


# --- Leave Schemas ---
class LeaveCreate(BaseModel):
    ma_nhan_vien: Optional[int] = None
    ngay_bat_dau: date
    ngay_ket_thuc: date
    loai_nghi: LeaveType = LeaveType.ANNUAL
    ly_do: Optional[str] = Field(None, max_length=500)
    dinh_kem: Optional[str] = Field(None, max_length=1000)


class LeaveApproval(BaseModel):
    trang_thai: LeaveStatus = Field(..., description="APPROVED or REJECTED")
    ghi_chu_duyet: Optional[str] = Field(None, max_length=255)


class LeaveResponse(BaseModel):
    ma_nghi_phep: int
    ma_nhan_vien: int
    ngay_bat_dau: date
    ngay_ket_thuc: date
    loai_nghi: LeaveType = LeaveType.ANNUAL
    ly_do: Optional[str] = None
    dinh_kem: Optional[str] = None
    trang_thai: LeaveStatus = LeaveStatus.PENDING
    nguoi_duyet: Optional[int] = None
    ngay_duyet: Optional[datetime] = None
    ghi_chu_duyet: Optional[str] = None
    ngay_tao: Optional[datetime] = None

    model_config = {"from_attributes": True}
