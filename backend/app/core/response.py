"""
Standardized API response format.
All API responses follow a consistent structure.
"""
from typing import Any, Optional, Dict, List
from pydantic import BaseModel


class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool = True
    message: str = ""
    data: Any = None
    meta: Optional[Dict[str, Any]] = None
    errors: Optional[Dict[str, List[str]]] = None


def success_response(
    data: Any = None,
    message: str = "Thành công",
    meta: Optional[Dict[str, Any]] = None,
) -> dict:
    """Create a standardized success response."""
    response = {"success": True, "message": message, "data": data}
    if meta:
        response["meta"] = meta
    return response


def error_response(
    message: str = "Đã xảy ra lỗi",
    errors: Optional[Dict[str, List[str]]] = None,
) -> dict:
    """Create a standardized error response."""
    response = {"success": False, "message": message}
    if errors:
        response["errors"] = errors
    return response


def paginated_response(
    data: Any,
    total: int,
    page: int,
    page_size: int,
    message: str = "Lấy danh sách thành công",
) -> dict:
    """Create a paginated response with meta information."""
    return {
        "success": True,
        "message": message,
        "data": data,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
        },
    }
