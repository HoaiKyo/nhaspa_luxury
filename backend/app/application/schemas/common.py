"""
Common schemas used across the application.
Pagination, base response models, etc.
"""
from typing import Optional
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""
    page: int = Field(default=1, ge=1, description="Số trang")
    page_size: int = Field(default=10, ge=1, le=100, description="Số bản ghi mỗi trang")
    search: Optional[str] = Field(default=None, description="Từ khóa tìm kiếm")
    sort_by: Optional[str] = Field(default=None, description="Trường sắp xếp")
    sort_order: Optional[str] = Field(default="desc", description="Thứ tự sắp xếp: asc/desc")
