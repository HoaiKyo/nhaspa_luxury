import sys
from sqlalchemy import create_url
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.application.services.invoice_service import InvoiceService
from app.api.v1.endpoints.invoices import _serialize_invoice
import json

def debug_invoices():
    db = SessionLocal()
    try:
        svc = InvoiceService(db)
        invoices, total = svc.get_invoices(1, 10)
        print(f"Total invoices in DB: {total}")
        for inv in invoices:
            try:
                data = _serialize_invoice(inv)
                # print(json.dumps(data, indent=2, default=str))
                print(f"Serialized OK: Invoice #{inv.ma_hoa_don}")
            except Exception as e:
                print(f"ERROR serializing invoice #{inv.ma_hoa_don}: {str(e)}")
    except Exception as e:
        print(f"GLOBAL ERROR: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_invoices()
