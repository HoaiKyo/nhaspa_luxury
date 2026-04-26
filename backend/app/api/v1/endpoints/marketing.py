"""Marketing API endpoints: Promotions, Banners, News."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.marketing import *
from app.application.services.marketing_service import PromotionService, BannerService, NewsService
from app.api.v1.dependencies import require_manager

promo_router = APIRouter(prefix="/promotions", tags=["Promotions"])
banner_router = APIRouter(prefix="/banners", tags=["Banners"])
news_router = APIRouter(prefix="/news", tags=["News"])


@promo_router.get("")
def list_promotions(page: int = 1, page_size: int = 10, status: Optional[str] = None, db: Session = Depends(get_db)):
    svc = PromotionService(db)
    items, total = svc.get_promotions(page, page_size, status)
    return paginated_response([PromotionResponse.model_validate(i).model_dump() for i in items], total, page, page_size)


@promo_router.post("")
def create_promotion(data: PromotionCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = PromotionService(db)
    p = svc.create_promotion(data.model_dump())
    return success_response(data=PromotionResponse.model_validate(p).model_dump(), message="Tạo khuyến mãi thành công")


@promo_router.put("/{promo_id}")
def update_promotion(promo_id: int, data: PromotionUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = PromotionService(db)
    p = svc.update_promotion(promo_id, data.model_dump(exclude_unset=True))
    return success_response(data=PromotionResponse.model_validate(p).model_dump(), message="Cập nhật thành công")


@promo_router.delete("/{promo_id}")
def delete_promotion(promo_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = PromotionService(db)
    svc.delete_promotion(promo_id)
    return success_response(message="Xóa thành công")


@banner_router.get("")
def list_banners(active_only: bool = False, db: Session = Depends(get_db)):
    svc = BannerService(db)
    banners = svc.get_banners(active_only)
    return success_response(data=[BannerResponse.model_validate(b).model_dump() for b in banners])


@banner_router.post("")
def create_banner(data: BannerCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = BannerService(db)
    b = svc.create_banner(data.model_dump())
    return success_response(data=BannerResponse.model_validate(b).model_dump(), message="Tạo banner thành công")


@banner_router.put("/{banner_id}")
def update_banner(banner_id: int, data: BannerUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = BannerService(db)
    b = svc.update_banner(banner_id, data.model_dump(exclude_unset=True))
    return success_response(data=BannerResponse.model_validate(b).model_dump(), message="Cập nhật thành công")


@banner_router.delete("/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = BannerService(db)
    svc.delete_banner(banner_id)
    return success_response(message="Xóa thành công")


@news_router.get("")
def list_news(page: int = 1, page_size: int = 10, category: Optional[str] = None,
              status: Optional[str] = None, db: Session = Depends(get_db)):
    svc = NewsService(db)
    items, total = svc.get_news(page, page_size, category, status)
    return paginated_response([NewsResponse.model_validate(i).model_dump() for i in items], total, page, page_size)


@news_router.get("/slug/{slug}")
def get_news_by_slug(slug: str, db: Session = Depends(get_db)):
    svc = NewsService(db)
    n = svc.get_news_by_slug(slug)
    return success_response(data=NewsResponse.model_validate(n).model_dump())


@news_router.post("")
def create_news(data: NewsCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = NewsService(db)
    n = svc.create_news(data.model_dump())
    return success_response(data=NewsResponse.model_validate(n).model_dump(), message="Tạo tin tức thành công")


@news_router.put("/{news_id}")
def update_news(news_id: int, data: NewsUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = NewsService(db)
    n = svc.update_news(news_id, data.model_dump(exclude_unset=True))
    return success_response(data=NewsResponse.model_validate(n).model_dump(), message="Cập nhật thành công")


@news_router.delete("/{news_id}")
def delete_news(news_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = NewsService(db)
    svc.delete_news(news_id)
    return success_response(message="Xóa thành công")
