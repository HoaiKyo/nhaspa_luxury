# PROMPT TRIỂN KHAI HỆ THỐNG FULLSTACK  
## Backend Python + Frontend React theo database có sẵn (SQL Server, clean architecture, scalable)

Bạn là **Senior Solution Architect + Senior Backend Python Engineer + Senior Frontend React Engineer**.  
Hãy xây dựng **toàn bộ hệ thống fullstack production-ready** cho tôi theo các yêu cầu dưới đây.

---

## 1) Bối cảnh dự án

Tôi đã có **giao diện React** trước đó.  
Nhiệm vụ của bạn là:

1. **Phân tích cấu trúc database hiện có**
2. **Thiết kế backend bằng Python**
3. **Tích hợp frontend React với backend**
4. Viết code theo **clean architecture / clean code / scalable**
5. Toàn bộ hệ thống phải dễ bảo trì, dễ test, dễ mở rộng module sau này
6. Database sử dụng **SQL Server**
7. Backend phải bám sát file thiết kế database, không tự ý làm lệch logic nghiệp vụ nếu chưa có lý do rõ ràng
8. Nếu phát hiện điểm chưa hợp lý trong thiết kế database thì:
   - **không tự ý phá cấu trúc gốc**
   - ghi rõ phần nào đang mơ hồ / thiếu / có rủi ro
   - đề xuất cách xử lý **an toàn, ít ảnh hưởng nhất**
   - vẫn phải code được theo thiết kế hiện tại

---

## 2) Công nghệ bắt buộc

### Backend
Sử dụng:
- **Python 3.12+**
- **FastAPI**
- **SQLAlchemy 2.x** hoặc **SQLModel** (ưu tiên cách làm rõ ràng, mạnh, dễ scale)
- **Pydantic v2**
- **Alembic** để migration
- **Microsoft SQL Server**
- Kết nối SQL Server qua driver phù hợp
- ORM mapping rõ ràng
- Repository pattern nếu hợp lý
- Service layer rõ ràng
- DTO / Schema tách biệt với ORM model
- API versioning (`/api/v1`)
- JWT Authentication
- RBAC (role-based access control)
- Logging chuẩn
- Config bằng `.env`
- Unit test / integration test ở mức cần thiết
- Seed data cơ bản
- OpenAPI docs đầy đủ

### Frontend
Sử dụng:
- **React**
- Tận dụng **UI hiện có**
- Không phá vỡ thiết kế giao diện hiện tại
- Tổ chức code frontend rõ ràng:
  - `pages`
  - `components`
  - `layouts`
  - `services/api`
  - `hooks`
  - `types`
  - `routes`
  - `utils`
- Kết nối backend bằng service layer rõ ràng
- Quản lý auth token hợp lý
- Validate form
- Xử lý loading / error / empty state đầy đủ
- Code dễ scale

---

## 3) Mục tiêu kiến trúc

Hãy triển khai hệ thống theo định hướng sau:

- **Clean Architecture**
- Tách lớp rõ ràng:
  - API / Controllers
  - Application / Use Cases
  - Domain / Entities / Business Rules
  - Infrastructure / ORM / DB / External Services
- Không viết code kiểu nhồi tất cả vào một chỗ
- Không để business logic nằm lung tung trong controller
- Dễ thay thế DB, dễ test, dễ thêm module mới
- Có phân chia module theo domain nghiệp vụ

Ví dụ định hướng thư mục backend:

```txt
backend/
  app/
    api/
      v1/
        endpoints/
    core/
      config.py
      security.py
      database.py
      exceptions.py
      logging.py
    domain/
      entities/
      enums/
      repositories/
    application/
      dto/
      services/
      use_cases/
    infrastructure/
      persistence/
        models/
        repositories/
        migrations/
      integrations/
    tests/
    main.py
```

Bạn có thể điều chỉnh cấu trúc thư mục tốt hơn nếu hợp lý, nhưng phải giữ tinh thần:
- rõ ràng
- tách lớp
- dễ scale
- dễ bảo trì

---

## 4) Database hiện có — bắt buộc bám sát

Hệ thống phải bám theo database hiện tại với các nhóm nghiệp vụ chính sau:

### 4.1 Người dùng và vai trò
- `nguoi_dung`
- `vai_tro`
- `nguoi_dung_vai_tro`

### 4.2 Nhân viên
- `nhan_vien`
- `ca_lam`
- `lich_lam_viec`
- `nghi_phep`

### 4.3 Danh mục và sản phẩm / dịch vụ / combo
- `danh_muc`
- `san_pham`
- `bang_gia`
- `nhan_vien_dich_vu`
- `chi_tiet_combo`
- `combo_khach_hang`

### 4.4 Đặt lịch
- `lich_hen`
- `khach_di_kem`
- `chi_tiet_lich_hen`

### 4.5 Hóa đơn
- `hoa_don`
- `chi_tiet_hoa_don`
- `thanh_toan`

### 4.6 Kho
- `ton_kho`
- `nha_cung_cap`
- `phieu_nhap`
- `chi_tiet_phieu_nhap`

### 4.7 Marketing
- `khuyen_mai`
- `banner`
- `tin_tuc`

---

## 5) Yêu cầu rất quan trọng khi mapping database

### 5.1 Không đổi tên nghiệp vụ bừa bãi
- Có thể đặt tên class Python theo convention dễ đọc hơn
- Nhưng phải giữ mapping rõ ràng với tên bảng / cột gốc trong DB
- Cần comment hoặc tài liệu mapping giữa:
  - tên bảng DB
  - tên model ORM
  - tên schema request/response
  - tên field frontend

### 5.2 Kiểu dữ liệu
Xử lý đúng với SQL Server:
- `nvarchar`
- `varchar`
- `text`
- `datetime`
- `date`
- `time`
- `decimal`
- `float`

### 5.3 Quan hệ
Triển khai đúng:
- one-to-one
- one-to-many
- many-to-many
- foreign key
- ràng buộc dữ liệu
- unique/index hợp lý

### 5.4 Các điểm cần kiểm tra và xử lý cẩn thận
Trong quá trình code, hãy phân tích kỹ những điểm sau:
- `nguoi_dung` và `nhan_vien` là quan hệ 1-1
- `nguoi_dung` và `vai_tro` đi qua bảng `nguoi_dung_vai_tro`
- `san_pham.loai` gồm nhiều loại như `SERVICE`, `PRODUCT`, `PACKAGE`
- `bang_gia` là lịch sử giá hay giá hiện tại? Nếu chưa đủ rõ thì đề xuất cách lấy “giá đang hiệu lực”
- `chi_tiet_combo` liên kết `ma_combo` và `ma_dich_vu`, cần xác định đều thuộc `san_pham`
- `combo_khach_hang` là combo khách đã mua và còn lượt sử dụng
- `chi_tiet_lich_hen` liên quan khách đi kèm, sản phẩm, nhân viên, combo khách hàng
- `hoa_don` có giảm giá, thuế, tích điểm, trạng thái hóa đơn điện tử
- `thanh_toan` có thể có nhiều lần thanh toán cho một hóa đơn
- `ton_kho` hiện đang 1-1 với `san_pham`, cần cẩn thận nếu sau này nhiều kho
- `phieu_nhap` và `chi_tiet_phieu_nhap` phải cập nhật tồn kho an toàn
- các field `trang_thai` cần chuẩn hóa thành enum nếu phù hợp

Nếu có điểm mơ hồ, hãy:
1. ghi chú assumption rõ ràng
2. code theo assumption an toàn nhất
3. tách chỗ đó thành nơi dễ sửa sau này

---

## 6) Yêu cầu nghiệp vụ backend phải hỗ trợ

### 6.1 Auth & Users
Làm đầy đủ:
- đăng nhập
- đăng xuất
- refresh token nếu cần
- lấy thông tin profile
- CRUD người dùng
- gán vai trò cho người dùng
- phân quyền theo vai trò
- mã hóa mật khẩu an toàn
- kiểm tra email trùng
- kiểm tra số điện thoại nếu cần

### 6.2 Nhân viên
- CRUD nhân viên
- liên kết nhân viên với người dùng
- phân công dịch vụ nhân viên làm được
- quản lý ca làm
- quản lý lịch làm việc
- quản lý nghỉ phép
- duyệt / từ chối nghỉ phép nếu có vai trò quản lý

### 6.3 Danh mục / Sản phẩm / Giá
- CRUD danh mục
- CRUD sản phẩm
- hỗ trợ phân loại:
  - dịch vụ
  - sản phẩm
  - combo/package
- quản lý bảng giá
- lấy giá hiện tại
- lịch sử thay đổi giá nếu phù hợp
- upload / lưu đường dẫn hình ảnh nếu cần

### 6.4 Combo
- CRUD combo
- cấu hình chi tiết combo
- khách hàng mua combo
- theo dõi tổng số lượng và số lượng còn lại
- trừ lượt sử dụng combo khi dùng trong lịch hẹn / hóa đơn theo rule hợp lý

### 6.5 Đặt lịch
- tạo lịch hẹn
- cập nhật lịch hẹn
- hủy lịch hẹn
- thêm khách đi kèm
- thêm nhiều dịch vụ trong một lịch hẹn
- phân công nhân viên cho từng dịch vụ
- hỗ trợ dùng combo khách hàng nếu có
- tính thời gian bắt đầu / kết thúc
- kiểm tra trùng lịch nhân viên
- kiểm tra trạng thái lịch
- query lịch theo:
  - ngày
  - tuần
  - nhân viên
  - khách hàng
  - trạng thái

### 6.6 Hóa đơn & thanh toán
- tạo hóa đơn từ lịch hẹn
- sinh chi tiết hóa đơn
- áp dụng khuyến mãi
- tính thuế
- tính tổng tiền
- dùng điểm tích lũy
- cộng điểm sau thanh toán
- nhiều giao dịch thanh toán cho một hóa đơn nếu cần
- cập nhật trạng thái thanh toán
- chuẩn bị chỗ mở rộng cho hóa đơn điện tử

### 6.7 Kho
- quản lý tồn kho
- quản lý nhà cung cấp
- tạo phiếu nhập
- chi tiết phiếu nhập
- cập nhật tồn kho sau nhập
- đảm bảo transaction an toàn

### 6.8 Marketing
- CRUD khuyến mãi
- CRUD banner
- CRUD tin tức
- lọc theo trạng thái
- lọc theo thời gian hiệu lực

---

## 7) Chuẩn API bắt buộc

Thiết kế API rõ ràng, RESTful, nhất quán:

Ví dụ:
- `POST /api/v1/auth/login`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/staff`
- `POST /api/v1/appointments`
- `POST /api/v1/invoices`
- `POST /api/v1/payments`

Yêu cầu:
- response format thống nhất
- error response thống nhất
- hỗ trợ pagination, search, filter, sort
- validate request body kỹ
- dùng status code đúng
- mô tả Swagger/OpenAPI đầy đủ

Ví dụ response chuẩn:

```json
{
  "success": true,
  "message": "Lấy danh sách thành công",
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 10,
    "total": 100
  }
}
```

Ví dụ error chuẩn:

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": {
    "email": ["Email đã tồn tại"]
  }
}
```

---

## 8) Yêu cầu transaction và integrity

Phần này cực kỳ quan trọng.  
Hãy triển khai transaction an toàn cho các luồng như:

- tạo lịch hẹn + chi tiết lịch hẹn
- tạo hóa đơn + chi tiết hóa đơn + thanh toán
- mua combo khách hàng
- dùng combo khách hàng
- tạo phiếu nhập + cập nhật tồn kho
- duyệt nghỉ phép
- gán role cho user

Phải tránh:
- tạo dữ liệu nửa chừng
- lệch tồn kho
- lệch lượt combo
- lệch tổng hóa đơn
- trùng lịch nhân viên

---

## 9) Validation và business rules

Phải có validation rõ ràng:
- email đúng định dạng
- mật khẩu đủ mạnh
- số điện thoại đúng định dạng nếu áp dụng
- ngày sinh hợp lệ
- số lượng > 0
- giá >= 0
- ngày kết thúc >= ngày bắt đầu
- không cho đặt lịch trong quá khứ nếu rule yêu cầu
- không cho nhân viên bị trùng lịch
- không cho dùng combo đã hết hạn / hết lượt
- không cho tạo thanh toán vượt quá số tiền còn lại nếu rule yêu cầu

Ngoài ra cần gom business rules vào service/use case, không nhét hết vào controller.

---

## 10) Bảo mật

Bắt buộc triển khai:
- hash password bằng thư viện phù hợp
- JWT access token
- refresh token nếu chọn triển khai
- RBAC
- ẩn các field nhạy cảm
- CORS cấu hình đúng
- không hardcode secret
- config qua `.env`
- rate limit nếu phù hợp
- audit log cơ bản nếu cần

---

## 11) Logging, exception, monitoring

Cần có:
- centralized exception handling
- custom business exception
- validation exception rõ ràng
- logging có cấu trúc
- phân biệt log info / warning / error
- log transaction quan trọng
- không log lộ mật khẩu / token

---

## 12) Testing

Phải viết test ở mức đủ dùng cho các luồng quan trọng:
- auth
- CRUD user
- appointment creation
- invoice calculation
- payment
- inventory update
- combo usage

Ưu tiên:
- unit test cho service/use case
- integration test cho API quan trọng

---

## 13) Frontend React integration

Tôi đã có giao diện React, bạn cần:

1. Tổ chức lại hoặc đề xuất cấu trúc kết nối API chuẩn
2. Tạo:
   - `api client`
   - `auth service`
   - `module service`
   - `hooks`
   - `route guard`
   - `state` nếu cần
3. Mapping dữ liệu từ backend sang UI hiện có
4. Không phá layout / style đang có
5. Tạo các file mẫu đầy đủ để frontend gọi được API thật
6. Quản lý:
   - login state
   - token
   - refresh token nếu có
   - loading
   - error
   - pagination
   - form submit
7. Sử dụng TypeScript nếu frontend hiện tại đang dùng TS; nếu chưa thì vẫn tổ chức type rõ ràng nhất có thể

Ví dụ cấu trúc:

```txt
frontend/
  src/
    api/
      client.ts
      auth.api.ts
      users.api.ts
      appointments.api.ts
    hooks/
    pages/
    components/
    routes/
    types/
    utils/
```

---

## 14) Yêu cầu output của bạn

Tôi muốn bạn làm việc theo thứ tự sau và **không được bỏ qua bước**:

### Bước 1 — Phân tích database
- Đọc toàn bộ database design
- Liệt kê tất cả bảng
- Phân tích quan hệ
- Chỉ ra điểm tốt
- Chỉ ra điểm mơ hồ / rủi ro / thiếu constraint
- Đưa ra assumption rõ ràng

### Bước 2 — Đề xuất kiến trúc tổng thể
- tech stack chi tiết
- cấu trúc thư mục backend
- cấu trúc thư mục frontend
- luồng auth
- luồng transaction chính
- chiến lược phân quyền
- chiến lược migration
- chiến lược logging/testing

### Bước 3 — Thiết kế backend chi tiết
- models ORM
- enums
- schemas request/response
- repository/service/use case
- API endpoints
- dependency injection
- exception handling
- database session management
- transaction management

### Bước 4 — Sinh code backend hoàn chỉnh
Hãy tạo code hoàn chỉnh cho:
- config
- database connection
- base model
- auth module
- user/role module
- staff module
- category/product/pricing module
- combo module
- appointment module
- invoice/payment module
- inventory module
- marketing module
- seed data
- migration khởi tạo
- test mẫu

### Bước 5 — Tích hợp frontend React
- tạo lớp gọi API
- tạo type/interface
- tạo auth flow
- ví dụ trang list/create/edit cho vài module chính
- route protection
- form submit mẫu
- xử lý error/loading chuẩn

### Bước 6 — Hướng dẫn chạy project
- cách cài dependencies backend
- cách cấu hình `.env`
- cách tạo database
- cách chạy migration
- cách chạy seed
- cách chạy backend
- cách chạy frontend
- cách test API

---

## 15) Chuẩn code bắt buộc

Code phải:
- sạch
- rõ ràng
- có type hint
- chia module hợp lý
- hạn chế lặp code
- dễ đọc
- dễ test
- không viết kiểu demo sơ sài
- không bỏ qua import
- không bỏ qua dependency
- không viết pseudocode khi tôi yêu cầu code thật
- nơi nào chưa rõ thì ghi TODO hoặc assumption rõ ràng
- comment ngắn gọn ở phần khó

---

## 16) Quy định khi sinh code

Khi sinh code:
- phải sinh **code thật, chạy được**
- không viết “tự triển khai thêm”
- không bỏ trống file quan trọng
- mỗi file phải có nội dung đầy đủ
- nếu code dài, chia theo nhiều phần nhưng phải đầy đủ
- luôn ghi rõ đường dẫn file trước khi đưa code

Ví dụ:
```txt
backend/app/main.py
backend/app/core/config.py
backend/app/modules/auth/router.py
...
```

---

## 17) Ưu tiên module triển khai trước

Nếu cần triển khai theo phase, hãy ưu tiên:
1. auth + user + role
2. category + product + pricing
3. staff + schedule
4. appointment
5. invoice + payment
6. combo
7. inventory
8. marketing

Nhưng vẫn phải thiết kế từ đầu để không bị đập đi làm lại.

---

## 18) Các assumption an toàn nên áp dụng nếu database chưa nói rõ

Nếu file thiết kế chưa mô tả hết rule nghiệp vụ, hãy dùng assumption an toàn như sau:
- `trang_thai` dùng enum
- `ngay_tao` default current timestamp
- email là unique
- role name là unique
- mỗi nhân viên gắn với đúng một người dùng
- một lịch hẹn có nhiều chi tiết dịch vụ
- một hóa đơn có thể có nhiều thanh toán
- bảng giá lưu lịch sử, lấy bản ghi mới nhất làm giá hiện tại nếu chưa có cột hiệu lực
- combo khách hàng bị trừ lượt khi dịch vụ thực sự được sử dụng
- cập nhật tồn kho phải nằm trong transaction
- soft delete chỉ thêm nếu thực sự cần và phải nhất quán toàn hệ thống

---

## 19) Dữ liệu từ thiết kế database hiện tại

Bạn phải bám sát mô hình dữ liệu có các bảng sau:

- nguoi_dung
- vai_tro
- nguoi_dung_vai_tro
- nhan_vien
- ca_lam
- lich_lam_viec
- nghi_phep
- danh_muc
- san_pham
- bang_gia
- nhan_vien_dich_vu
- chi_tiet_combo
- combo_khach_hang
- lich_hen
- khach_di_kem
- chi_tiet_lich_hen
- hoa_don
- chi_tiet_hoa_don
- thanh_toan
- ton_kho
- nha_cung_cap
- phieu_nhap
- chi_tiet_phieu_nhap
- khuyen_mai
- banner
- tin_tuc

---

## 20) Điều tôi muốn bạn trả ra

Tôi không muốn câu trả lời chung chung.  
Tôi muốn bạn trả ra theo format sau:

1. **Phân tích database hiện tại**
2. **Các vấn đề / assumption**
3. **Kiến trúc đề xuất**
4. **Cấu trúc thư mục backend**
5. **Cấu trúc thư mục frontend**
6. **Danh sách API endpoints**
7. **Code backend đầy đủ theo từng file**
8. **Code frontend tích hợp theo từng file**
9. **Migration / seed**
10. **Hướng dẫn chạy**
11. **Các cải tiến nên làm ở phase 2**

---

## 21) Lưu ý cuối cùng

- Không được trả lời hời hợt
- Không được chỉ đưa skeleton
- Không được bỏ qua SQL Server
- Không được làm sai clean architecture
- Không được bỏ qua transaction
- Không được bỏ qua RBAC
- Không được bỏ qua validation
- Không được bỏ qua frontend integration
- Phải viết như một kiến trúc sư phần mềm senior đang build dự án thật

Bắt đầu từ **Bước 1: Phân tích database hiện tại**, sau đó triển khai dần toàn bộ hệ thống.
