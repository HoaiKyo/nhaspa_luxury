"""Marketing Service: Promotions, Banners, News."""
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from app.core.exceptions import NotFoundException, ConflictException
from app.infrastructure.persistence.models.marketing import KhuyenMai, Banner, TinTuc


class PromotionService:
    def __init__(self, db: Session):
        self.db = db

    def get_promotions(self, page=1, page_size=10, status=None) -> Tuple[List[KhuyenMai], int]:
        q = self.db.query(KhuyenMai)
        if status:
            q = q.filter(KhuyenMai.trang_thai == status)
        total = q.count()
        items = q.order_by(KhuyenMai.ngay_tao.desc()).offset((page-1)*page_size).limit(page_size).all()
        return items, total

    def create_promotion(self, data: dict) -> KhuyenMai:
        promo = KhuyenMai(**data)
        self.db.add(promo)
        self.db.commit()
        self.db.refresh(promo)
        return promo

    def update_promotion(self, promo_id: int, data: dict) -> KhuyenMai:
        promo = self.db.query(KhuyenMai).filter(KhuyenMai.ma_khuyen_mai == promo_id).first()
        if not promo:
            raise NotFoundException(message="Khuyến mãi không tồn tại")
        for k, v in data.items():
            if v is not None:
                setattr(promo, k, v)
        self.db.commit()
        self.db.refresh(promo)
        return promo

    def delete_promotion(self, promo_id: int):
        promo = self.db.query(KhuyenMai).filter(KhuyenMai.ma_khuyen_mai == promo_id).first()
        if not promo:
            raise NotFoundException(message="Khuyến mãi không tồn tại")
        promo.trang_thai = "INACTIVE"
        self.db.commit()


class BannerService:
    def __init__(self, db: Session):
        self.db = db

    def get_banners(self, active_only=False) -> List[Banner]:
        q = self.db.query(Banner)
        if active_only:
            q = q.filter(Banner.trang_thai == "ACTIVE")
        return q.order_by(Banner.thu_tu).all()

    def create_banner(self, data: dict) -> Banner:
        b = Banner(**data)
        self.db.add(b)
        self.db.commit()
        self.db.refresh(b)
        return b

    def update_banner(self, banner_id: int, data: dict) -> Banner:
        b = self.db.query(Banner).filter(Banner.ma_banner == banner_id).first()
        if not b:
            raise NotFoundException(message="Banner không tồn tại")
        for k, v in data.items():
            if v is not None:
                setattr(b, k, v)
        self.db.commit()
        self.db.refresh(b)
        return b

    def delete_banner(self, banner_id: int):
        b = self.db.query(Banner).filter(Banner.ma_banner == banner_id).first()
        if not b:
            raise NotFoundException(message="Banner không tồn tại")
        self.db.delete(b)
        self.db.commit()


class NewsService:
    def __init__(self, db: Session):
        self.db = db

    def get_news(self, page=1, page_size=10, category=None, status=None) -> Tuple[List[TinTuc], int]:
        q = self.db.query(TinTuc)
        if category:
            q = q.filter(TinTuc.danh_muc == category)
        if status:
            q = q.filter(TinTuc.trang_thai == status)
        total = q.count()
        items = q.order_by(TinTuc.ngay_tao.desc()).offset((page-1)*page_size).limit(page_size).all()
        return items, total

    def get_news_by_slug(self, slug: str) -> TinTuc:
        n = self.db.query(TinTuc).filter(TinTuc.slug == slug).first()
        if not n:
            raise NotFoundException(message="Tin tức không tồn tại")
        return n

    def create_news(self, data: dict) -> TinTuc:
        existing = self.db.query(TinTuc).filter(TinTuc.slug == data.get("slug")).first()
        if existing:
            raise ConflictException(message="Slug tin tức đã tồn tại")
        n = TinTuc(**data)
        self.db.add(n)
        self.db.commit()
        self.db.refresh(n)
        return n

    def update_news(self, news_id: int, data: dict) -> TinTuc:
        n = self.db.query(TinTuc).filter(TinTuc.ma_tin_tuc == news_id).first()
        if not n:
            raise NotFoundException(message="Tin tức không tồn tại")
        for k, v in data.items():
            if v is not None:
                setattr(n, k, v)
        self.db.commit()
        self.db.refresh(n)
        return n

    def delete_news(self, news_id: int):
        n = self.db.query(TinTuc).filter(TinTuc.ma_tin_tuc == news_id).first()
        if not n:
            raise NotFoundException(message="Tin tức không tồn tại")
        n.trang_thai = "ARCHIVED"
        self.db.commit()
