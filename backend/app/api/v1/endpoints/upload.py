"""
File Upload API — Upload images for products, banners, news, user avatars.
Files stored in backend/uploads/ directory, served as static files.
"""
import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.response import success_response
from app.core.exceptions import NotFoundException, BusinessRuleException
from app.api.v1.dependencies import get_current_user, require_manager
from app.infrastructure.persistence.models.user import NguoiDung
from app.infrastructure.persistence.models.product import SanPham, DanhMuc
from app.infrastructure.persistence.models.marketing import Banner, TinTuc

router = APIRouter(prefix="/upload", tags=["File Upload"])

# Upload config
# Upload config - Trỏ đúng vào thư mục 'backend/uploads' thay vì 'backend/app/uploads'
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _ensure_upload_dir(subfolder: str) -> Path:
    """Create upload subdirectory if not exists."""
    path = UPLOAD_DIR / subfolder
    path.mkdir(parents=True, exist_ok=True)
    return path


def _validate_file(file: UploadFile) -> None:
    """Validate file extension and size."""
    if not file.filename:
        raise BusinessRuleException(message="Tên file không hợp lệ")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BusinessRuleException(
            message=f"Định dạng file không hỗ trợ. Chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
        )


def _save_file(file: UploadFile, subfolder: str) -> str:
    """Save uploaded file and return relative URL path."""
    _validate_file(file)

    upload_path = _ensure_upload_dir(subfolder)
    ext = Path(file.filename).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}_{int(datetime.utcnow().timestamp())}{ext}"
    file_path = upload_path / unique_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return relative URL for DB storage
    return f"/uploads/{subfolder}/{unique_name}"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    loai: str = Form(default="general", description="products | banners | news | avatars | general"),
    current_user: NguoiDung = Depends(get_current_user),
):
    """
    Upload a single image. Returns the URL path to store in database.
    loai: products, banners, news, avatars, general
    """
    if loai not in ("products", "banners", "news", "avatars", "general"):
        loai = "general"

    url = _save_file(file, loai)
    return success_response(
        data={"url": url, "filename": file.filename, "loai": loai},
        message="Upload thành công",
    )


@router.post("/product/{product_id}")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_manager),
):
    """Upload and update product image."""
    product = db.query(SanPham).filter(SanPham.ma_san_pham == product_id).first()
    if not product:
        raise NotFoundException(message="Sản phẩm không tồn tại")

    url = _save_file(file, "products")
    product.hinh_anh = url
    db.commit()
    return success_response(
        data={"ma_san_pham": product_id, "hinh_anh": url},
        message="Cập nhật ảnh sản phẩm thành công",
    )


@router.post("/banner/{banner_id}")
async def upload_banner_image(
    banner_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_manager),
):
    """Upload and update banner image."""
    banner = db.query(Banner).filter(Banner.ma_banner == banner_id).first()
    if not banner:
        raise NotFoundException(message="Banner không tồn tại")

    url = _save_file(file, "banners")
    banner.hinh_anh = url
    db.commit()
    return success_response(
        data={"ma_banner": banner_id, "hinh_anh": url},
        message="Cập nhật ảnh banner thành công",
    )


@router.post("/news/{news_id}")
async def upload_news_image(
    news_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_manager),
):
    """Upload and update news article image."""
    news = db.query(TinTuc).filter(TinTuc.ma_tin_tuc == news_id).first()
    if not news:
        raise NotFoundException(message="Tin tức không tồn tại")

    url = _save_file(file, "news")
    news.hinh_anh = url
    db.commit()
    return success_response(
        data={"ma_tin_tuc": news_id, "hinh_anh": url},
        message="Cập nhật ảnh tin tức thành công",
    )


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and update user avatar."""
    url = _save_file(file, "avatars")
    current_user.anh_dai_dien = url
    db.commit()
    return success_response(
        data={"ma_nguoi_dung": current_user.ma_nguoi_dung, "anh_dai_dien": url},
        message="Cập nhật ảnh đại diện thành công",
    )
