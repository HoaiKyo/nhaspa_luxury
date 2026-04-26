"""
API Dependencies: Authentication, authorization, and common dependencies.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import decode_token
from app.infrastructure.persistence.models.user import NguoiDung

security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> NguoiDung:
    """Extract and validate the current user from JWT token."""
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Token không hợp lệ hoặc đã hết hạn"},
        )

    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Token không hợp lệ"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Token không chứa thông tin người dùng"},
        )

    user = db.query(NguoiDung).filter(NguoiDung.ma_nguoi_dung == int(user_id)).first()
    if user is None or not user.trang_thai:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Người dùng không tồn tại hoặc đã bị khóa"},
        )

    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
) -> Optional[NguoiDung]:
    """Get user if token provided, return None otherwise."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


class RoleChecker:
    """Dependency to check if user has required role(s)."""

    def __init__(self, required_roles: List[str]):
        self.required_roles = required_roles

    def __call__(self, user: NguoiDung = Depends(get_current_user)) -> NguoiDung:
        user_roles = [r.ten_vai_tro for r in user.vai_tros]
        if not any(role in user_roles for role in self.required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "message": "Bạn không có quyền thực hiện thao tác này",
                },
            )
        return user


# Pre-built role checkers
require_admin = RoleChecker(["ADMIN"])
# Keep alias `require_manager` for backward-compatible endpoint imports.
# In the current RBAC model there is no MANAGER role; admin handles management actions.
require_manager = RoleChecker(["ADMIN"])
require_receptionist = RoleChecker(["ADMIN", "RECEPTIONIST"])
require_staff = RoleChecker(["ADMIN", "STAFF", "RECEPTIONIST"])
