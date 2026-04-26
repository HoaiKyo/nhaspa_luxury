"""API v1 Router - Aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as user_router, role_router
from app.api.v1.endpoints.products import cat_router, prod_router
from app.api.v1.endpoints.staff import router as staff_router, shift_router, schedule_router, leave_router
from app.api.v1.endpoints.appointments import router as appt_router
from app.api.v1.endpoints.invoices import invoice_router, payment_router
from app.api.v1.endpoints.combos import router as combo_router
from app.api.v1.endpoints.inventory import inv_router, supplier_router, import_router, bom_router
from app.api.v1.endpoints.marketing import promo_router, banner_router, news_router
from app.api.v1.endpoints.upload import router as upload_router

api_router = APIRouter(prefix="/api/v1")

# Auth & Users
api_router.include_router(auth_router)
api_router.include_router(user_router)
api_router.include_router(role_router)

# Staff
api_router.include_router(staff_router)
api_router.include_router(shift_router)
api_router.include_router(schedule_router)
api_router.include_router(leave_router)

# Products
api_router.include_router(cat_router)
api_router.include_router(prod_router)

# Combos
api_router.include_router(combo_router)

# Appointments
api_router.include_router(appt_router)

# Invoices & Payments
api_router.include_router(invoice_router)
api_router.include_router(payment_router)

# Inventory
api_router.include_router(inv_router)
api_router.include_router(supplier_router)
api_router.include_router(import_router)
api_router.include_router(bom_router)

# Marketing
api_router.include_router(promo_router)
api_router.include_router(banner_router)
api_router.include_router(news_router)

# File Upload
api_router.include_router(upload_router)
