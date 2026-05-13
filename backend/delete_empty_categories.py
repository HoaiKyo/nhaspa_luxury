import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))

from app.infrastructure.persistence.database import SessionLocal
from app.infrastructure.persistence.models.product import DanhMuc, SanPham

def main():
    db = SessionLocal()
    try:
        categories = db.query(DanhMuc).all()
        deleted_count = 0
        for cat in categories:
            product_count = db.query(SanPham).filter(SanPham.ma_danh_muc == cat.ma_danh_muc).count()
            if product_count == 0:
                print(f"Deleting category: {cat.ten_danh_muc} (ID: {cat.ma_danh_muc})")
                db.delete(cat)
                deleted_count += 1
        
        db.commit()
        print(f"Deleted {deleted_count} empty categories successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
