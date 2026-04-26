"""User & Role API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.user import UserCreate, UserUpdate, RoleCreate, RoleUpdate, UserResponse, RoleResponse, AssignRolesRequest
from app.application.services.user_service import UserService
from app.api.v1.dependencies import get_current_user, require_admin, require_staff
from app.infrastructure.persistence.models.user import NguoiDung

router = APIRouter(prefix="/users", tags=["Users"])
role_router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("")
def list_users(page: int = 1, page_size: int = 10, search: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = UserService(db)
    users, total = svc.get_users(page, page_size, search)
    data = [UserResponse.model_validate(u).model_dump() for u in users]
    return paginated_response(data, total, page, page_size, "Lấy danh sách người dùng thành công")


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    user = svc.get_user_by_id(user_id)
    return success_response(data=UserResponse.model_validate(user).model_dump())


@router.post("")
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    user = svc.create_user(data.model_dump())
    return success_response(data=UserResponse.model_validate(user).model_dump(), message="Tạo người dùng thành công")


@router.put("/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    user = svc.update_user(user_id, data.model_dump(exclude_unset=True))
    return success_response(data=UserResponse.model_validate(user).model_dump(), message="Cập nhật thành công")


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    svc.delete_user(user_id)
    return success_response(message="Xóa người dùng thành công")


@router.post("/{user_id}/roles")
def assign_roles(user_id: int, data: AssignRolesRequest, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    user = svc.assign_roles(user_id, data.vai_tro_ids)
    return success_response(data=UserResponse.model_validate(user).model_dump(), message="Gán vai trò thành công")


# --- Roles ---
@role_router.get("")
def list_roles(db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    roles = svc.get_roles()
    return success_response(data=[RoleResponse.model_validate(r).model_dump() for r in roles])


@role_router.post("")
def create_role(data: RoleCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    role = svc.create_role(data.model_dump())
    return success_response(data=RoleResponse.model_validate(role).model_dump(), message="Tạo vai trò thành công")


@role_router.put("/{role_id}")
def update_role(role_id: int, data: RoleUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    role = svc.update_role(role_id, data.model_dump(exclude_unset=True))
    return success_response(data=RoleResponse.model_validate(role).model_dump(), message="Cập nhật vai trò thành công")


@role_router.delete("/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc = UserService(db)
    svc.delete_role(role_id)
    return success_response(message="Xóa vai trò thành công")
