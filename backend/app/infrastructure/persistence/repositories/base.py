"""
Base repository with common CRUD operations.
"""
from typing import TypeVar, Generic, Type, Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.infrastructure.persistence.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic repository providing common database operations."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id_value: int, id_column: str = None) -> Optional[ModelType]:
        """Get a single record by primary key."""
        if id_column:
            col = getattr(self.model, id_column)
            return self.db.query(self.model).filter(col == id_value).first()
        # Auto-detect primary key
        pk = list(self.model.__table__.primary_key.columns)[0]
        return self.db.query(self.model).filter(pk == id_value).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 10,
        filters: Optional[List[Any]] = None,
        order_by: Optional[Any] = None,
    ) -> List[ModelType]:
        """Get all records with optional filtering, pagination, and ordering."""
        query = self.db.query(self.model)
        if filters:
            for f in filters:
                query = query.filter(f)
        if order_by is not None:
            query = query.order_by(order_by)
        return query.offset(skip).limit(limit).all()

    def count(self, filters: Optional[List[Any]] = None) -> int:
        """Count records with optional filtering."""
        query = self.db.query(func.count()).select_from(self.model)
        if filters:
            for f in filters:
                query = query.filter(f)
        return query.scalar() or 0

    def create(self, obj: ModelType) -> ModelType:
        """Create a new record."""
        self.db.add(obj)
        self.db.flush()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelType, data: dict) -> ModelType:
        """Update an existing record with given data dict."""
        for key, value in data.items():
            if value is not None and hasattr(obj, key):
                setattr(obj, key, value)
        self.db.flush()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelType) -> None:
        """Delete a record."""
        self.db.delete(obj)
        self.db.flush()
