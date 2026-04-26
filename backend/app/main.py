"""
Nhà Spa Management System — FastAPI Application Entry Point
"""
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging_config import setup_logging, get_logger
from app.core.response import error_response
from app.api.v1.router import api_router

# Import all models so SQLAlchemy knows about them
from app.infrastructure.persistence.models import base  # noqa
from app.infrastructure.persistence.models import user  # noqa
from app.infrastructure.persistence.models import staff  # noqa
from app.infrastructure.persistence.models import product  # noqa
from app.infrastructure.persistence.models import combo  # noqa
from app.infrastructure.persistence.models import appointment  # noqa
from app.infrastructure.persistence.models import invoice  # noqa
from app.infrastructure.persistence.models import loyalty  # noqa
from app.infrastructure.persistence.models import inventory  # noqa
from app.infrastructure.persistence.models import marketing  # noqa

# Setup logging
setup_logging(debug=settings.APP_DEBUG)
logger = get_logger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Hệ thống quản lý Nhà Spa — Backend API",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(message=exc.message, errors=exc.errors),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_exception", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=500,
            content=error_response(message="Lỗi hệ thống, vui lòng thử lại sau"),
        )

    # Static files (uploaded images)
    uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    # Routes
    app.include_router(api_router)

    @app.get("/", tags=["Health"])
    def health_check():
        return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

    return app


app = create_app()
