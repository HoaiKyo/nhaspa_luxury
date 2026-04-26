"""
Custom exceptions for the application.
Centralized exception definitions for consistent error handling.
"""
from typing import Optional, Dict, Any


class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        message: str = "Đã xảy ra lỗi",
        status_code: int = 500,
        errors: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.errors = errors
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found."""
    def __init__(self, message: str = "Không tìm thấy dữ liệu", errors: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=404, errors=errors)


class ConflictException(AppException):
    """Resource conflict (e.g., duplicate email)."""
    def __init__(self, message: str = "Dữ liệu đã tồn tại", errors: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=409, errors=errors)


class ForbiddenException(AppException):
    """Permission denied."""
    def __init__(self, message: str = "Không có quyền thực hiện", errors: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=403, errors=errors)


class UnauthorizedException(AppException):
    """Authentication required or failed."""
    def __init__(self, message: str = "Chưa xác thực", errors: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=401, errors=errors)


class ValidationException(AppException):
    """Business validation error."""
    def __init__(self, message: str = "Dữ liệu không hợp lệ", errors: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, errors=errors)


class BusinessRuleException(AppException):
    """Business rule violation (e.g., schedule conflict, combo expired)."""
    def __init__(self, message: str = "Vi phạm quy tắc nghiệp vụ", errors: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=400, errors=errors)
