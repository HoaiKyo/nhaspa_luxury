import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from app.infrastructure.persistence.models.base import Base

# Import the new model specifically so it gets registered on Base.metadata
from app.infrastructure.persistence.models.product import SanPham
from app.infrastructure.persistence.models.inventory import TonKho, DinhMucVatTu

def upgrade_db():
    print("Creating DinhMucVatTu table...")
    Base.metadata.create_all(bind=engine, tables=[DinhMucVatTu.__table__])
    print("Success")

if __name__ == "__main__":
    upgrade_db()
