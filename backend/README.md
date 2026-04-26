# Nhà Spa Management System — Backend

## Tech Stack
- **Python 3.12+** / **FastAPI** / **SQLAlchemy 2.x** / **Pydantic v2**
- **SQL Server** via pyodbc
- **JWT** authentication with RBAC
- **Alembic** for database migrations

## Setup

### 1. Prerequisites
- Python 3.12+
- SQL Server (local or Docker)
- ODBC Driver 17 for SQL Server

### 2. Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your SQL Server credentials
```

### 5. Create Database
```sql
-- In SQL Server Management Studio or sqlcmd:
CREATE DATABASE spa_db;
```

### 6. Create Tables (Option A: Direct)
```bash
python -c "
from app.core.database import engine
from app.infrastructure.persistence.models.base import Base
from app.infrastructure.persistence.models import user, staff, product, combo, appointment, invoice, loyalty, inventory, marketing
Base.metadata.create_all(bind=engine)
print('Tables created!')
"
```

### 6. Create Tables (Option B: Alembic)
```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

### 7. Seed Data
```bash
python -m app.seeds.seed_data
```

### 7b. Sync Staff Roles & Seed Staff Accounts (Optional)
Use when `Nhân viên` page is empty or staff accounts are missing proper role mappings.
```bash
python -m app.seeds.seed_staff_permissions
```

### 8. Run Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 9. Access API
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/

## Default Admin Account
- Email: `admin@nhaspa.com`
- Password: `admin123`

## API Endpoints Summary

| Module | Endpoints |
|--------|-----------|
| Auth | POST /auth/login, /register, /refresh, /change-password; GET /profile |
| Users | GET/POST /users, GET/PUT/DELETE /users/{id}, POST /users/{id}/roles |
| Roles | GET/POST /roles, PUT/DELETE /roles/{id} |
| Staff | GET/POST /staff, GET/PUT /staff/{id} |
| Shifts | GET/POST /shifts |
| Schedules | GET/POST /schedules |
| Leave | GET/POST /leaves, PUT /leaves/{id}/approve |
| Categories | GET/POST /categories, PUT/DELETE /categories/{id} |
| Products | GET/POST /products, GET/PUT/DELETE /products/{id}, POST/GET /products/{id}/prices |
| Combos | GET /combos/{id}/details, POST /combos/details, GET /combos/customer/{id}, POST /combos/purchase |
| Appointments | GET/POST /appointments, PUT /appointments/{id}, POST /appointments/{id}/cancel |
| Invoices | GET/POST /invoices, PUT /invoices/{id}, PUT /invoices/{id}/status, GET /invoices/active-promotions, GET /invoices/point-history |
| Payments | POST /payments, GET /payments/invoice/{id} |
| Inventory | GET/PUT /inventory |
| Suppliers | GET/POST /suppliers, PUT /suppliers/{id} |
| Import Receipts | GET/POST /import-receipts |
| Promotions | GET/POST /promotions, PUT/DELETE /promotions/{id} |
| Banners | GET/POST /banners, PUT/DELETE /banners/{id} |
| News | GET/POST /news, GET /news/slug/{slug}, PUT/DELETE /news/{id} |

All endpoints prefixed with `/api/v1`.
