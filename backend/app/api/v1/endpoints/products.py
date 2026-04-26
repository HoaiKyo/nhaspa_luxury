"""Category & Product API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.product import (CategoryCreate, CategoryUpdate, CategoryResponse,
    ProductCreate, ProductUpdate, ProductResponse, PricingCreate, PricingResponse)
from app.application.services.product_service import CategoryService, ProductService
from app.api.v1.dependencies import require_manager, get_current_user_optional

cat_router = APIRouter(prefix="/categories", tags=["Categories"])
prod_router = APIRouter(prefix="/products", tags=["Products"])


@cat_router.get("")
def list_categories(db: Session = Depends(get_db)):
    svc = CategoryService(db)
    cats = svc.get_categories()
    return success_response(data=[CategoryResponse.model_validate(c).model_dump() for c in cats])


@cat_router.post("")
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = CategoryService(db)
    cat = svc.create_category(data.model_dump())
    return success_response(data=CategoryResponse.model_validate(cat).model_dump(), message="Tạo danh mục thành công")


@cat_router.put("/{cat_id}")
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = CategoryService(db)
    cat = svc.update_category(cat_id, data.model_dump(exclude_unset=True))
    return success_response(data=CategoryResponse.model_validate(cat).model_dump(), message="Cập nhật thành công")


@cat_router.delete("/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = CategoryService(db)
    svc.delete_category(cat_id)
    return success_response(message="Xóa danh mục thành công")


# --- Products ---
@prod_router.get("")
def list_products(page: int = 1, page_size: int = 10, search: Optional[str] = None,
                  category_id: Optional[int] = None, loai: Optional[str] = None,
                  db: Session = Depends(get_db)):
    svc = ProductService(db)
    products, total = svc.get_products(page, page_size, search, category_id, loai)
    data = []
    for p in products:
        d = ProductResponse.model_validate(p).model_dump()
        d["ten_danh_muc"] = p.danh_muc.ten_danh_muc if p.danh_muc else None
        data.append(d)
    return paginated_response(data, total, page, page_size)


@prod_router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    svc = ProductService(db)
    p = svc.get_product(product_id)
    d = ProductResponse.model_validate(p).model_dump()
    d["ten_danh_muc"] = p.danh_muc.ten_danh_muc if p.danh_muc else None
    return success_response(data=d)


@prod_router.post("")
def create_product(data: ProductCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = ProductService(db)
    p = svc.create_product(data.model_dump())
    return success_response(data=ProductResponse.model_validate(p).model_dump(), message="Tạo sản phẩm thành công")


@prod_router.put("/{product_id}")
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = ProductService(db)
    p = svc.update_product(product_id, data.model_dump(exclude_unset=True))
    return success_response(data=ProductResponse.model_validate(p).model_dump(), message="Cập nhật thành công")


@prod_router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = ProductService(db)
    svc.delete_product(product_id)
    return success_response(message="Xóa thành công")


@prod_router.post("/{product_id}/prices")
def add_price(product_id: int, data: PricingCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = ProductService(db)
    price = svc.add_price(product_id, data.model_dump())
    return success_response(data=PricingResponse.model_validate(price).model_dump(), message="Thêm giá thành công")


@prod_router.get("/{product_id}/prices")
def get_prices(product_id: int, db: Session = Depends(get_db)):
    svc = ProductService(db)
    prices = svc.get_price_history(product_id)
    return success_response(data=[PricingResponse.model_validate(p).model_dump() for p in prices])
