# BAO CAO KIEM TRA DU AN NHA SPA

Ngay kiem tra: 19-04-2026

## 0) Cap nhat bo sung sau khi dong bo frontend/backend (19-04-2026)

- Da ra soat lai cac trang public, admin, receptionist tren frontend theo API response hien tai.
- Frontend hien tai build/typecheck PASS:
  - `frontend`: `npm run lint` => PASS
  - `frontend`: `npm run build` => PASS
- Da sua cac diem lech contract du lieu tren trang Tin tuc:
  - Doi field `loai` -> `danh_muc` tai danh sach/chi tiet tin tuc.
  - Bo sung fallback ngay hien thi: `ngay_dang` -> `ngay_tao` neu can.
- Da bo sung lay du lieu day du qua nhieu trang (khong bi gioi han `page_size` co dinh) cho cac man can hien thi het du lieu:
  - Public services (`Services`, `ServiceCategory`, `BookingModal`) dung ham gom du lieu qua toan bo trang phan trang.
  - Receptionist `getServiceProducts()` cung gom day du du lieu phan trang.
- Da canh chinh `ServiceDetail` de map dung category khi route dung `slug` hoac `ma_danh_muc`.

### Tep da cap nhat trong dot bo sung nay
- `frontend/src/api/public.api.ts`
- `frontend/src/modules/receptionist/services/receptionist.api.ts`
- `frontend/src/pages/Services.tsx`
- `frontend/src/pages/ServiceCategory.tsx`
- `frontend/src/components/BookingModal.tsx`
- `frontend/src/pages/News.tsx`
- `frontend/src/pages/NewsDetail.tsx`
- `frontend/src/pages/ServiceDetail.tsx`

Luu y: cac muc ben duoi la bao cao snapshot truoc khi cap nhat bo sung; uu tien tham chieu muc 0 cho trang thai moi nhat.

## 1) Nhung gi da kiem tra trong dot nay

- Quet cau truc du an `backend`, `frontend`, `database`.
- Doi chieu API contract giua frontend va backend theo endpoint thuc te.
- Chay kiem tra ky thuat:
  - `frontend`: `npm run lint`
  - `frontend`: `npm run build`
  - `backend`: `./venv/bin/pytest -q`
  - `backend`: `./venv/bin/python -m compileall app`
  - `backend`: `./venv/bin/python -c "from app.main import app; print(app.title)"`

## 2) Tong quan nhung gi du an da lam duoc

- Backend FastAPI da co day du module nghiep vu chinh:
  - Auth + JWT + profile: `backend/app/api/v1/endpoints/auth.py`
  - Users/Roles: `backend/app/api/v1/endpoints/users.py`
  - Staff/Shifts/Schedules/Leaves: `backend/app/api/v1/endpoints/staff.py`
  - Categories/Products/Pricing: `backend/app/api/v1/endpoints/products.py`
  - Appointments: `backend/app/api/v1/endpoints/appointments.py`
  - Invoices/Payments: `backend/app/api/v1/endpoints/invoices.py`
  - Inventory/Suppliers/Import Receipts/BOM: `backend/app/api/v1/endpoints/inventory.py`
  - Promotions/Banners/News: `backend/app/api/v1/endpoints/marketing.py`
  - Upload file: `backend/app/api/v1/endpoints/upload.py`
- Frontend React da co:
  - Public pages: Home, Services, Service detail, News, Profile, Locations, About.
  - Admin pages: dashboard + cac trang CRUD quan ly.
  - Receptionist module: danh sach/chi tiet/tao lich hen, nghi phep, hoa don.
- Database da co script tao bang + seed du lieu:
  - `database/01_create_tables.sql` den `database/06_update_images_mock.sql`.
- Build frontend thanh cong (`npm run build` pass), backend import app thanh cong.

## 3) Ket qua kiem tra tu dong

- `npm run lint` (frontend) **that bai** voi 4 loi TypeScript:
  - `src/api/client.ts(6,34): Property 'env' does not exist on type 'ImportMeta'.`
  - `src/modules/receptionist/pages/AppointmentCreatePage.tsx(30,32): Property 'data' does not exist on type 'unknown'.`
  - `src/modules/receptionist/pages/AppointmentCreatePage.tsx(94,52): Property 'ma_lich_hen' does not exist on type 'unknown'.`
  - `src/pages/admin/ProductsManager.tsx(113,38): Property 'length' does not exist on type 'unknown'.`
- `npm run build` (frontend) **thanh cong**, co canh bao chunk JS lon (`~617 kB`).
- `pytest -q` (backend): **khong co test nao duoc chay** (`no tests ran`).
- `compileall` backend: pass.

## 4) Thieu sot quan trong (uu tien cao)

### 4.1 Mismatch API giua frontend va backend (co the gay loi runtime)

1. Cap nhat hoa don sai endpoint.
- Frontend goi `PUT /invoices/{id}`: `frontend/src/api/admin.api.ts:108`.
- Backend chi co `PUT /invoices/{id}/status`: `backend/app/api/v1/endpoints/invoices.py:58`.

2. Lay payment sai endpoint.
- Frontend goi `GET /payments?invoice_id=...`: `frontend/src/api/admin.api.ts:115-117`.
- Backend la `GET /payments/invoice/{inv_id}`: `backend/app/api/v1/endpoints/invoices.py:72`.

3. Import receipts sai endpoint.
- Frontend goi `/imports`: `frontend/src/api/admin.api.ts:164-166`.
- Backend la `/import-receipts`: `backend/app/api/v1/endpoints/inventory.py:15`, `:61`, `:68`.

4. Upload API khong khop.
- Frontend goi `/upload/banner`, `/upload/news`, `/upload/product`: `frontend/src/api/admin.api.ts:174`, `:179`, `:184`.
- Backend yeu cau co ID: `/upload/banner/{banner_id}`, `/upload/news/{news_id}`, `/upload/product/{product_id}`: `backend/app/api/v1/endpoints/upload.py:87`, `:108`, `:129`.
- Frontend doc `res.data.file_path`: `frontend/src/pages/admin/BannersManager.tsx:25`, `frontend/src/pages/admin/NewsManager.tsx:26`.
- Backend tra `hinh_anh`/`url`, khong co `file_path`: `backend/app/api/v1/endpoints/upload.py:82-83`, `:103-104`, `:124-125`, `:145-146`.

5. Receptionist cancel appointment sai endpoint.
- Frontend goi `PUT /appointments/{id}/status`: `frontend/src/modules/receptionist/services/receptionist.api.ts:15`.
- Backend chi co `POST /appointments/{id}/cancel`: `backend/app/api/v1/endpoints/appointments.py:95`.

6. Receptionist loc lich hen sai query param.
- Frontend truyen `date`: `frontend/src/modules/receptionist/services/receptionist.api.ts:8`.
- Backend nhan `from_date`/`to_date`: `backend/app/api/v1/endpoints/appointments.py:19`.

7. Receptionist lay service products sai query key.
- Frontend truyen `type=SERVICE`: `frontend/src/modules/receptionist/services/receptionist.api.ts:31`.
- Backend dung `loai`: `backend/app/api/v1/endpoints/products.py:47`.

8. Receptionist lay danh sach customer se bi 403.
- Frontend goi `/users?page_size=100`: `frontend/src/modules/receptionist/services/receptionist.api.ts:30`.
- Backend endpoint `/users` yeu cau `require_admin`: `backend/app/api/v1/endpoints/users.py:17`.

### 4.2 Contract du lieu Appointment cua receptionist khong khop schema backend

1. Payload tao lich hen sai cau truc.
- Frontend gui `thoi_gian_hen`, `dich_vu_chi_tiet`, `ho_ten`, `so_dien_thoai`: `frontend/src/modules/receptionist/pages/AppointmentCreatePage.tsx:76-88`.
- Backend schema can `ngay_hen`, `gio_bat_dau`, `chi_tiets`: `backend/app/application/schemas/appointment.py:36-43`.

2. UI receptionist doc field khong ton tai trong response backend.
- Frontend list/doc chi tiet dung `thoi_gian_hen`, `dich_vu_chi_tiet`, `ho_ten`, `so_dien_thoai`: `frontend/src/modules/receptionist/pages/AppointmentListPage.tsx:113-124`, `frontend/src/modules/receptionist/pages/AppointmentDetailPage.tsx:81-95`, `:114-120`.
- Backend response la `ho_ten_khach`, `ngay_hen`, `gio_bat_dau`, `chi_tiets`: `backend/app/application/schemas/appointment.py:78-89`, `backend/app/api/v1/endpoints/appointments.py:25-27`.

### 4.3 Lint TypeScript dang fail

- Thay hien qua `npm run lint` fail.
- Diem lien quan:
  - `frontend/src/api/client.ts:6`
  - `frontend/tsconfig.json:1-25`
  - `frontend/src/modules/receptionist/pages/AppointmentCreatePage.tsx:30`, `:94`
  - `frontend/src/pages/admin/ProductsManager.tsx:113`

## 5) Thieu sot muc cao/trung binh

1. Trang Profile map sai field user.
- Dang dung `user.name`, `user.tier`, `user.points`: `frontend/src/pages/Profile.tsx:41`, `:44`, `:54`.
- Interface thuc te la `ho_ten`, `hang_thanh_vien`, `diem_tich_luy`: `frontend/src/api/auth.api.ts:24-34`.

2. Rủi ro logic khi gan role CUSTOMER luc dang ky.
- Dung `user.ma_nguoi_dung` truoc khi co flush id: `backend/app/application/services/auth_service.py:50-53`.
- Can bo sung `flush()` hoac gan qua relationship de tranh loi FK/PK.

3. Tai lieu frontend dang sai ngữ canh du an.
- README hien la mau AI Studio/Gemini: `frontend/README.md:5-20`.
- `.env.example` frontend cung la mau Gemini: `frontend/.env.example:1-9`.

4. Migration Alembic chua duoc version hoa.
- Thu muc versions chi co `.gitkeep`: `backend/alembic/versions/.gitkeep`.

5. Chua co bo test.
- `pytest -q` tra ve `no tests ran`.
- Khong tim thay thu muc test backend/frontend trong code cua du an.

6. Gioi han kich thuoc file upload chua duoc enforce.
- `MAX_FILE_SIZE` duoc khai bao nhung chua dung: `backend/app/api/v1/endpoints/upload.py:29`.

7. Frontend build can toi uu chunk.
- Co canh bao chunk JS lon sau build (`dist/assets/index-*.js ~617 kB`).

## 6) De xuat thu tu xu ly

1. Chot lai API contract chung (OpenAPI/Swagger la nguon su that), sau do sua toan bo API client frontend cho khop endpoint va response.
2. Sua module receptionist theo schema appointment backend (payload + field hien thi), test end-to-end luong tao/huy/xem lich.
3. Sua upload flow:
   - Hoac dung `/upload/image` (tra `url`) roi gan vao form.
   - Hoac tao truoc entity (banner/news/product) roi upload qua endpoint co `{id}`.
4. Sua TypeScript errors de `npm run lint` pass.
5. Sua Profile page map dung field `ho_ten`, `hang_thanh_vien`, `diem_tich_luy`.
6. Bo sung test toi thieu:
   - Backend: auth login/register, appointment create/cancel, invoice update status.
   - Frontend: smoke test route chinh + API adapter test.
7. Chuan hoa tai lieu:
   - Viet lai `frontend/README.md` + `.env.example` theo thuc te du an.
   - Cap nhat backend README theo endpoint thuc te.
8. Tao migration Alembic chinh thuc (`init`) va commit bo migration.

## 7) Ket luan

Du an da co khung chuc nang lon kha day du (backend + frontend + SQL scripts), nhung hien tai co nhieu diem mismatch contract frontend-backend o cac luong quan trong. Uu tien cao nhat la dong bo endpoint/payload/response va sua module receptionist de he thong chay on dinh trong thuc te.
