"""
Product & Category Service.
"""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple
from datetime import datetime

from app.core.exceptions import NotFoundException, ConflictException
from app.infrastructure.persistence.models.product import DanhMuc, SanPham, BangGia, NhanVienDichVu


class CategoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_categories(self, include_inactive: bool = False) -> List[DanhMuc]:
        query = self.db.query(DanhMuc)
        if not include_inactive:
            query = query.filter(DanhMuc.trang_thai == True)
        return query.order_by(DanhMuc.thu_tu).all()

    def get_category(self, category_id: int) -> DanhMuc:
        cat = self.db.query(DanhMuc).filter(DanhMuc.ma_danh_muc == category_id).first()
        if not cat:
            raise NotFoundException(message="Danh mục không tồn tại")
        return cat

    def create_category(self, data: dict) -> DanhMuc:
        existing = self.db.query(DanhMuc).filter(DanhMuc.slug == data.get("slug")).first()
        if existing:
            raise ConflictException(message="Slug danh mục đã tồn tại")
        cat = DanhMuc(**data)
        self.db.add(cat)
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def update_category(self, category_id: int, data: dict) -> DanhMuc:
        cat = self.get_category(category_id)
        for key, value in data.items():
            if value is not None:
                setattr(cat, key, value)
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def delete_category(self, category_id: int) -> None:
        cat = self.get_category(category_id)
        cat.trang_thai = False
        self.db.commit()


class ProductService:
    def __init__(self, db: Session):
        self.db = db

    def get_products(
        self,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        product_type: Optional[str] = None,
    ) -> Tuple[List[SanPham], int]:
        query = self.db.query(SanPham).options(
            joinedload(SanPham.danh_muc),
            joinedload(SanPham.bang_gias),
        )

        if search:
            query = query.filter(SanPham.ten_san_pham.ilike(f"%{search}%"))
        if category_id:
            query = query.filter(SanPham.ma_danh_muc == category_id)
        if product_type:
            query = query.filter(SanPham.loai == product_type)

        # Hết lỗi 'không xóa được' bằng cách luôn lọc sản phẩm đang kích hoạt
        query = query.filter(SanPham.trang_thai == True)

        total = query.count()
        products = (
            query.order_by(SanPham.thu_tu)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return products, total

    def get_product(self, product_id: int) -> SanPham:
        product = (
            self.db.query(SanPham)
            .options(joinedload(SanPham.danh_muc), joinedload(SanPham.bang_gias))
            .filter(SanPham.ma_san_pham == product_id)
            .first()
        )
        if not product:
            raise NotFoundException(message="Sản phẩm/dịch vụ không tồn tại")
        return product

    def get_product_by_slug(self, slug: str) -> SanPham:
        product = (
            self.db.query(SanPham)
            .options(joinedload(SanPham.danh_muc), joinedload(SanPham.bang_gias))
            .filter(SanPham.slug == slug)
            .first()
        )
        if not product:
            raise NotFoundException(message="Sản phẩm/dịch vụ không tồn tại")
        return product

    def create_product(self, data: dict) -> SanPham:
        bang_gias_data = data.pop("bang_gias", [])
        existing = self.db.query(SanPham).filter(SanPham.slug == data.get("slug")).first()
        if existing:
            raise ConflictException(message="Slug sản phẩm đã tồn tại")

        product = SanPham(**data)
        self.db.add(product)
        self.db.flush()

        # Add pricing entries
        for price_data in bang_gias_data:
            price = BangGia(ma_san_pham=product.ma_san_pham, **price_data)
            self.db.add(price)

        self.db.commit()
        self.db.refresh(product)
        return product

    def update_product(self, product_id: int, data: dict) -> SanPham:
        product = self.get_product(product_id)
        for key, value in data.items():
            if value is not None:
                setattr(product, key, value)
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete_product(self, product_id: int) -> None:
        product = self.get_product(product_id)
        product.trang_thai = False
        self.db.commit()

    # --- Pricing ---
    def add_price(self, product_id: int, data: dict) -> BangGia:
        self.get_product(product_id)  # Validate exists
        price = BangGia(ma_san_pham=product_id, **data)
        self.db.add(price)
        self.db.commit()
        self.db.refresh(price)
        return price

    def get_current_price(self, product_id: int) -> Optional[BangGia]:
        """Get current effective price (latest by ngay_ap_dung)."""
        return (
            self.db.query(BangGia)
            .filter(BangGia.ma_san_pham == product_id)
            .order_by(BangGia.ngay_ap_dung.desc())
            .first()
        )

    def get_price_history(self, product_id: int) -> List[BangGia]:
        return (
            self.db.query(BangGia)
            .filter(BangGia.ma_san_pham == product_id)
            .order_by(BangGia.ngay_ap_dung.desc())
            .all()
        )
