"""
Domain enums for the Spa management system.
All status/type enums used across the application.
Maps to trang_thai and loai columns in the database.
"""
import enum


class ProductType(str, enum.Enum):
    """Loại sản phẩm/dịch vụ - san_pham.loai"""
    SERVICE = "SERVICE"        # Dịch vụ
    PRODUCT = "PRODUCT"        # Sản phẩm bán lẻ
    PACKAGE = "PACKAGE"        # Combo/Gói dịch vụ


class AppointmentStatus(str, enum.Enum):
    """Trạng thái lịch hẹn - lich_hen.trang_thai"""
    PENDING = "PENDING"            # Chờ xác nhận
    CONFIRMED = "CONFIRMED"        # Đã xác nhận
    IN_PROGRESS = "IN_PROGRESS"    # Đang thực hiện
    COMPLETED = "COMPLETED"        # Hoàn thành
    CANCELLED = "CANCELLED"        # Đã hủy
    NO_SHOW = "NO_SHOW"            # Không đến


class InvoiceStatus(str, enum.Enum):
    """Trạng thái hóa đơn - hoa_don.trang_thai"""
    DRAFT = "DRAFT"                # Nháp
    PENDING = "PENDING"            # Chờ thanh toán
    PARTIAL = "PARTIAL"            # Thanh toán một phần
    PAID = "PAID"                  # Đã thanh toán
    CANCELLED = "CANCELLED"        # Đã hủy
    REFUNDED = "REFUNDED"          # Đã hoàn tiền


class PaymentMethod(str, enum.Enum):
    """Phương thức thanh toán - thanh_toan.phuong_thuc"""
    CASH = "CASH"              # Tiền mặt
    CARD = "CARD"              # Thẻ
    TRANSFER = "TRANSFER"      # Chuyển khoản
    EWALLET = "EWALLET"        # Ví điện tử


class PaymentStatus(str, enum.Enum):
    """Trạng thái thanh toán - thanh_toan.trang_thai"""
    SUCCESS = "SUCCESS"        # Thành công
    FAILED = "FAILED"          # Thất bại
    PENDING = "PENDING"        # Đang xử lý
    REFUNDED = "REFUNDED"      # Đã hoàn


class LeaveStatus(str, enum.Enum):
    """Trạng thái nghỉ phép - nghi_phep.trang_thai"""
    PENDING = "PENDING"        # Chờ duyệt
    APPROVED = "APPROVED"      # Đã duyệt
    REJECTED = "REJECTED"      # Từ chối


class LeaveType(str, enum.Enum):
    """Loại nghỉ phép - nghi_phep.loai_nghi"""
    ANNUAL = "ANNUAL"          # Phép năm
    SICK = "SICK"              # Nghỉ ốm
    UNPAID = "UNPAID"          # Nghỉ không lương
    MATERNITY = "MATERNITY"    # Thai sản


class ImportReceiptStatus(str, enum.Enum):
    """Trạng thái phiếu nhập - phieu_nhap.trang_thai"""
    DRAFT = "DRAFT"            # Nháp
    CONFIRMED = "CONFIRMED"    # Đã xác nhận
    CANCELLED = "CANCELLED"    # Đã hủy


class PromotionStatus(str, enum.Enum):
    """Trạng thái khuyến mãi - khuyen_mai.trang_thai"""
    ACTIVE = "ACTIVE"          # Đang hoạt động
    INACTIVE = "INACTIVE"      # Ngừng
    EXPIRED = "EXPIRED"        # Hết hạn


class BannerStatus(str, enum.Enum):
    """Trạng thái banner - banner.trang_thai"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class NewsStatus(str, enum.Enum):
    """Trạng thái tin tức - tin_tuc.trang_thai"""
    DRAFT = "DRAFT"            # Nháp
    PUBLISHED = "PUBLISHED"    # Đã xuất bản
    ARCHIVED = "ARCHIVED"      # Lưu trữ


class Gender(str, enum.Enum):
    """Giới tính"""
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class EInvoiceStatus(str, enum.Enum):
    """Trạng thái hóa đơn điện tử - hoa_don.trang_thai_hd_dien_tu"""
    NOT_ISSUED = "NOT_ISSUED"    # Chưa phát hành
    ISSUED = "ISSUED"            # Đã phát hành
    CANCELLED = "CANCELLED"      # Đã hủy
