"""
NhĂ  Spa Management System - Configuration
Loads settings from .env file using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database - SQL Server
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server"
    DB_HOST: str = "localhost"
    DB_PORT: int = 1433
    DB_NAME: str = "spa_db"
    DB_USER: str = "sa"
    DB_PASSWORD: str = "YourStrong!Passw0rd"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # App
    APP_NAME: str = "NhĂ  Spa Management System"
    APP_VERSION: str = "1.0.0"
    APP_DEBUG: bool = True

    # VNPAY (test)
    VNPAY_TMN_CODE: str = "Z2DJP1I1"
    VNPAY_HASH_SECRET: str = "E8G33TSDTLR581YJ8BAW52691Y26R0R5"
    VNPAY_PAYMENT_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_RETURN_URL: str = "http://localhost:3000/receptionist/hoa-don"
    VNPAY_EXPIRE_MINUTES: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def database_url(self) -> str:
        """Build SQL Server connection string for SQLAlchemy + pyodbc."""
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return (
            f"mssql+pyodbc://{self.DB_USER}:{encoded_password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?driver={self.DB_DRIVER.replace(' ', '+')}"
            f"&TrustServerCertificate=yes"
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

