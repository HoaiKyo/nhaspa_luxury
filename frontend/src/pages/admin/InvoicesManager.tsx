import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarRange,
  CircleDollarSign,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Landmark,
  Pencil,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';

import { invoicesApi, productsApi } from '../../api/admin.api';

type InvoiceStatus = 'PAID' | 'UNPAID' | 'REFUNDED';
type PaymentMethod = 'CASH' | 'BANK' | 'CARD';
type DataSource = 'api' | 'sample';

interface InvoiceItem {
  id: number;
  productId?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceRecord {
  id: number;
  apiInvoiceId?: number;
  promotionId?: number;
  pointsUsed?: number;
  code: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerAvatar: string;
  serviceSummary: string;
  staffName: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  notes: string;
  items: InvoiceItem[];
}

interface ProductOption {
  ma_san_pham: number;
  ten_san_pham: string;
  gia_mac_dinh: number;
}

interface PromotionOption {
  ma_khuyen_mai: number;
  ten_khuyen_mai: string;
  loai_giam: string;
  gia_tri_giam: number;
  giam_toi_da?: number | null;
  don_toi_thieu?: number | null;
}

interface EditableInvoiceDraft {
  ma_khuyen_mai?: number;
  diem_su_dung: number;
  ghi_chu: string;
  items: InvoiceItem[];
}

const GOLD = 'var(--admin-accent)';
const VAT_RATE = 0.08;

const STATUS_OPTIONS: Array<{ value: 'ALL' | InvoiceStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PAID', label: 'Đã TT' },
  { value: 'UNPAID', label: 'Chưa TT' },
  { value: 'REFUNDED', label: 'Hoàn tiền' },
];

const METHOD_OPTIONS: Array<{ value: 'ALL' | PaymentMethod; label: string }> = [
  { value: 'ALL', label: 'Tất cả phương thức' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK', label: 'Chuyển khoản' },
  { value: 'CARD', label: 'Thẻ' },
];

const STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
  PAID: { label: 'Đã thanh toán', className: 'admin-invoice-status-paid' },
  UNPAID: { label: 'Chưa thanh toán', className: 'admin-invoice-status-unpaid' },
  REFUNDED: { label: 'Hoàn tiền', className: 'admin-invoice-status-refunded' },
};

const PAYMENT_META: Record<PaymentMethod, { label: string; icon: any }> = {
  CASH: { label: 'Tiền mặt', icon: Wallet },
  BANK: { label: 'Chuyển khoản', icon: Landmark },
  CARD: { label: 'Thẻ', icon: CreditCard },
};

const CUSTOMER_POOL = [
  { name: 'Nguyễn Thu Trang', phone: '0908 112 233', address: '12 Lê Lợi, Q.1, TP.HCM' },
  { name: 'Lê Hoàng Minh', phone: '0913 887 522', address: '45 Trần Hưng Đạo, Q.5, TP.HCM' },
  { name: 'Trần Thanh Vy', phone: '0938 667 211', address: '99 Võ Thị Sáu, Q.3, TP.HCM' },
  { name: 'Phạm Quốc Dũng', phone: '0988 155 800', address: '7 Nguyễn Văn Cừ, Q.1, TP.HCM' },
  { name: 'Hoàng Mỹ Linh', phone: '0909 501 008', address: '22 Phan Xích Long, Q. Phú Nhuận' },
  { name: 'Đỗ Gia Hân', phone: '0945 721 191', address: '85 Điện Biên Phủ, Bình Thạnh' },
  { name: 'Vũ Khánh Huyền', phone: '0962 223 118', address: '31 Trương Định, Q.3, TP.HCM' },
  { name: 'Bùi Minh Khôi', phone: '0973 518 690', address: '64 Pasteur, Q.1, TP.HCM' },
];

const STAFF_POOL = ['Lê Thảo My', 'Võ Ngọc Linh', 'Phạm Huy Hoàng', 'Trần An Nhiên', 'Nguyễn Quỳnh Anh'];

const SERVICE_POOL = [
  { name: 'Massage thư giãn 90\'', basePrice: 850000 },
  { name: 'Gội đầu dưỡng sinh', basePrice: 450000 },
  { name: 'Chăm sóc da chuyên sâu', basePrice: 1200000 },
  { name: 'Liệu trình đá nóng', basePrice: 980000 },
  { name: 'Body scrub detox', basePrice: 690000 },
  { name: 'Combo hồi phục năng lượng', basePrice: 1450000 },
  { name: 'Nâng cơ mặt RF', basePrice: 1650000 },
  { name: 'Massage cổ vai gáy', basePrice: 550000 },
];

const SAMPLE_STATUS_SEQUENCE: InvoiceStatus[] = [
  'PAID', 'PAID', 'UNPAID', 'PAID', 'REFUNDED',
  'PAID', 'PAID', 'PAID', 'UNPAID', 'PAID',
  'REFUNDED', 'PAID', 'PAID', 'PAID', 'REFUNDED',
  'PAID', 'PAID', 'PAID', 'REFUNDED', 'REFUNDED',
];

const SAMPLE_METHOD_SEQUENCE: PaymentMethod[] = [
  'CASH', 'BANK', 'CARD', 'BANK', 'CARD',
  'CASH', 'BANK', 'CARD', 'CASH', 'BANK',
  'CARD', 'CASH', 'BANK', 'CARD', 'BANK',
  'CASH', 'CARD', 'BANK', 'CASH', 'CARD',
];

const roundToThousand = (value: number) => Math.round(value / 1000) * 1000;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'KH';

const formatMoney = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;

const formatDateTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
};

const normalizeStatus = (status: string | undefined): InvoiceStatus => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') return 'PAID';
  if (normalized === 'CANCELLED' || normalized === 'REFUNDED') return 'REFUNDED';
  return 'UNPAID';
};

const normalizePaymentMethod = (method: string | undefined): PaymentMethod => {
  const normalized = String(method || '').toUpperCase();
  if (normalized.includes('CARD') || normalized.includes('THE')) return 'CARD';
  if (normalized.includes('BANK') || normalized.includes('TRANSFER') || normalized.includes('QR')) return 'BANK';
  return 'CASH';
};

const buildInvoiceCode = (invoiceId: number, createdAt: Date) => `#SPA-${createdAt.getFullYear()}-${String(invoiceId).padStart(4, '0')}`;

const buildSampleInvoices = (): InvoiceRecord[] => {
  const now = new Date();

  return SAMPLE_STATUS_SEQUENCE.map((status, index) => {
    const customer = CUSTOMER_POOL[index % CUSTOMER_POOL.length];
    const staffName = STAFF_POOL[index % STAFF_POOL.length];
    const method = SAMPLE_METHOD_SEQUENCE[index % SAMPLE_METHOD_SEQUENCE.length];

    const rawItemCount = (index % 3) + 1;
    const rawItems = Array.from({ length: rawItemCount }, (_, itemIndex) => {
      const service = SERVICE_POOL[(index + itemIndex) % SERVICE_POOL.length];
      const quantity = ((index + itemIndex) % 2) + 1;
      const unitPrice = roundToThousand(service.basePrice * (1 + ((index + itemIndex) % 3) * 0.12));
      return {
        name: service.name,
        quantity,
        unitPrice,
        total: unitPrice * quantity,
      };
    });

    let subtotal = rawItems.reduce((sum, item) => sum + item.total, 0);
    let scale = 1;
    if (subtotal < 350000) scale = 350000 / subtotal;
    if (subtotal > 3500000) scale = 3500000 / subtotal;

    const recalcTotals = (lineItems: InvoiceItem[]) => {
      const lineSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const lineDiscount = roundToThousand((index % 4 === 0 ? 0.11 : index % 3 === 0 ? 0.07 : 0.04) * lineSubtotal);
      const lineVat = roundToThousand(Math.max(lineSubtotal - lineDiscount, 0) * VAT_RATE);
      const lineTotal = Math.max(0, lineSubtotal - lineDiscount + lineVat);
      return {
        subtotal: lineSubtotal,
        discount: lineDiscount,
        vat: lineVat,
        total: lineTotal,
      };
    };

    let items = rawItems.map((item, itemIndex) => {
      const unitPrice = roundToThousand(item.unitPrice * scale);
      const total = unitPrice * item.quantity;
      return {
        id: index * 10 + itemIndex + 1,
        productId: undefined,
        name: item.name,
        quantity: item.quantity,
        unitPrice,
        total,
      };
    });

    let { subtotal: computedSubtotal, discount, vat, total } = recalcTotals(items);

    if (total < 350000 || total > 3500000) {
      const totalScale = total < 350000 ? 350000 / Math.max(total, 1) : 3500000 / total;
      items = items.map((item) => {
        const unitPrice = Math.max(1000, roundToThousand(item.unitPrice * totalScale));
        return {
          ...item,
          unitPrice,
          total: unitPrice * item.quantity,
        };
      });
      ({ subtotal: computedSubtotal, discount, vat, total } = recalcTotals(items));
    }

    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - index * 2);
    createdAt.setHours(9 + (index % 7), 10 * (index % 6), 0, 0);

    const invoiceId = 87 + index;

    return {
      id: invoiceId,
      code: buildInvoiceCode(invoiceId, createdAt),
      promotionId: undefined,
      pointsUsed: 0,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerAvatar: initialsOf(customer.name),
      serviceSummary: items[0]?.name || 'Liệu trình spa',
      staffName,
      createdAt: createdAt.toISOString(),
      paymentMethod: method,
      status,
      subtotal: computedSubtotal,
      discount,
      vat,
      total,
      notes:
        status === 'REFUNDED'
          ? 'Khách đổi lịch, hoàn tiền theo chính sách trong 24h.'
          : 'Khách hàng đồng ý liệu trình và xác nhận trước khi thanh toán.',
      items,
    };
  });
};

const SAMPLE_INVOICES = buildSampleInvoices();

const mapApiInvoice = (raw: any, index: number): InvoiceRecord => {
  const createdAtDate = raw?.ngay_tao ? new Date(raw.ngay_tao) : new Date();
  const invoiceId = Number(raw?.ma_hoa_don || index + 1);

  const itemsFromApi: InvoiceItem[] = Array.isArray(raw?.chi_tiets) && raw.chi_tiets.length > 0
    ? raw.chi_tiets.map((item: any, itemIndex: number) => {
        const quantity = Math.max(1, toNumber(item.so_luong));
        const unitPrice = toNumber(item.don_gia);
        const lineTotal = toNumber(item.thanh_tien) || unitPrice * quantity;
        return {
          id: Number(item.ma_chi_tiet || itemIndex + 1),
          productId: Number(item.ma_san_pham || 0) || undefined,
          name: item.ten_san_pham || `Dịch vụ #${item.ma_san_pham || itemIndex + 1}`,
          quantity,
          unitPrice,
          total: lineTotal,
        };
      })
    : [
        {
          id: invoiceId,
          productId: undefined,
          name: 'Liệu trình Spa tổng hợp',
          quantity: 1,
          unitPrice: toNumber(raw?.thanh_tien || 0),
          total: toNumber(raw?.thanh_tien || 0),
        },
      ];

  const subtotal = toNumber(raw?.tong_tien || raw?.thanh_tien || 0);
  const discount = toNumber(raw?.giam_gia || 0) + toNumber(raw?.gia_tri_diem || 0);
  const vat = toNumber(raw?.thue || 0);
  const total = toNumber(raw?.thanh_tien || subtotal - discount + vat);

  const successfulPayment = Array.isArray(raw?.thanh_toans)
    ? [...raw.thanh_toans].reverse().find((payment: any) =>
        String(payment?.trang_thai || 'SUCCESS').toUpperCase() === 'SUCCESS',
      )
    : undefined;

  const customerName = raw?.ho_ten_khach || `Khách #${raw?.ma_khach_hang || index + 1}`;

  return {
    id: invoiceId,
    apiInvoiceId: invoiceId,
    code: buildInvoiceCode(invoiceId, createdAtDate),
    promotionId: raw?.ma_khuyen_mai ? Number(raw.ma_khuyen_mai) : undefined,
    pointsUsed: toNumber(raw?.diem_su_dung || 0),
    customerName,
    customerPhone: raw?.so_dien_thoai_khach || `09${String(raw?.ma_khach_hang || index + 10000000).padStart(8, '0').slice(-8)}`,
    customerAddress: raw?.dia_chi_khach || 'TP. Hồ Chí Minh',
    customerAvatar: initialsOf(customerName),
    serviceSummary: itemsFromApi[0]?.name || 'Liệu trình Spa',
    staffName: raw?.ho_ten_nhan_vien || (raw?.ma_nhan_vien ? `Nhân viên #${raw.ma_nhan_vien}` : 'Chưa gán'),
    createdAt: createdAtDate.toISOString(),
    paymentMethod: normalizePaymentMethod(successfulPayment?.phuong_thuc),
    status: normalizeStatus(raw?.trang_thai),
    subtotal,
    discount,
    vat,
    total,
    notes: raw?.ghi_chu || 'Không có ghi chú thêm.',
    items: itemsFromApi,
  };
};

const toDateValue = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const escapeCsvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const subtotalFromItems = (items: Array<{ quantity: number; unitPrice: number }>) =>
  items.reduce((sum, item) => sum + Math.max(0, toNumber(item.quantity)) * Math.max(0, toNumber(item.unitPrice)), 0);

const promotionLabel = (promo: PromotionOption) => {
  const value = String(promo.loai_giam || '').toUpperCase() === 'PERCENT'
    ? `${promo.gia_tri_giam}%`
    : formatMoney(promo.gia_tri_giam);
  return `${promo.ten_khuyen_mai} (${value})`;
};

export default function InvoicesManager() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [promotionOptions, setPromotionOptions] = useState<PromotionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>('api');

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDraft, setEditDraft] = useState<EditableInvoiceDraft | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [createDraft, setCreateDraft] = useState<{
    ma_khach_hang: number;
    ma_khuyen_mai?: number;
    diem_su_dung: number;
    ghi_chu: string;
    items: Array<{ id: string; productId?: number; quantity: number; unitPrice: number }>;
  }>({
    ma_khach_hang: 0,
    ma_khuyen_mai: undefined,
    diem_su_dung: 0,
    ghi_chu: '',
    items: [{ id: 'new-1', productId: undefined, quantity: 1, unitPrice: 0 }],
  });

  const createSubtotal = useMemo(
    () => subtotalFromItems(createDraft.items),
    [createDraft.items],
  );
  const editSubtotal = useMemo(
    () => (editDraft ? subtotalFromItems(editDraft.items) : 0),
    [editDraft],
  );

  useEffect(() => {
    loadInvoices();
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const rows: any[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await productsApi.list(page, 100, undefined, undefined, 'SERVICE');
        if (!res.success) throw new Error(res.message || 'Không thể tải danh sách dịch vụ');
        if (Array.isArray(res.data)) rows.push(...res.data);
        totalPages = res.meta?.total_pages || 1;
        page += 1;
      } while (page <= totalPages);

      const mapped = rows.map((item: any) => ({
        ma_san_pham: Number(item.ma_san_pham),
        ten_san_pham: item.ten_san_pham || `Dịch vụ #${item.ma_san_pham}`,
        gia_mac_dinh: toNumber(item?.bang_gias?.[0]?.gia || 0),
      }));
      setProductOptions(mapped);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách dịch vụ');
    }
  };

  const loadPromotionOptions = async (orderValue: number) => {
    try {
      const res = await invoicesApi.activePromotions(orderValue);
      if (!res.success || !Array.isArray(res.data)) {
        setPromotionOptions([]);
        return;
      }
      const rows: PromotionOption[] = (res.data as any[]).map((row) => ({
        ma_khuyen_mai: Number(row.ma_khuyen_mai),
        ten_khuyen_mai: row.ten_khuyen_mai || `KM #${row.ma_khuyen_mai}`,
        loai_giam: row.loai_giam || 'AMOUNT',
        gia_tri_giam: toNumber(row.gia_tri_giam),
        giam_toi_da: row.giam_toi_da != null ? toNumber(row.giam_toi_da) : null,
        don_toi_thieu: row.don_toi_thieu != null ? toNumber(row.don_toi_thieu) : null,
      }));
      setPromotionOptions(rows);
    } catch {
      setPromotionOptions([]);
    }
  };

  useEffect(() => {
    if (showCreateModal) {
      void loadPromotionOptions(createSubtotal);
    }
  }, [showCreateModal, createSubtotal]);

  useEffect(() => {
    if (selectedInvoice && editDraft) {
      void loadPromotionOptions(editSubtotal);
    }
  }, [selectedInvoice, editDraft, editSubtotal]);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const fetchApiRows = async () => {
        const listRes = await invoicesApi.list(1, 200);
        if (!listRes.success) {
          throw new Error(listRes.message || 'Không thể tải danh sách hóa đơn');
        }
        return Array.isArray(listRes.data) ? listRes.data : [];
      };

      let apiRows = await fetchApiRows();
      if (apiRows.length === 0) {
        const seedRes = await invoicesApi.seedSample(20, false);
        if (!seedRes.success) {
          throw new Error(seedRes.message || 'Không thể seed dữ liệu hóa đơn');
        }
        apiRows = await fetchApiRows();
      }

      if (apiRows.length === 0) {
        setInvoices(SAMPLE_INVOICES);
        setDataSource('sample');
        setError('DB chưa có hóa đơn sau seed, đang hiển thị tạm dữ liệu mẫu.');
        return;
      }

      setInvoices(apiRows.map((row: any, index: number) => mapApiInvoice(row, index)));
      setDataSource('api');
    } catch (err: any) {
      setInvoices(SAMPLE_INVOICES);
      setDataSource('sample');
      setError((err?.message || 'Lỗi tải dữ liệu hóa đơn') + '. Đang chuyển sang dữ liệu mẫu tạm thời.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const fromDateObj = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const toDateObj = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return invoices.filter((invoice) => {
      const createdAt = toDateValue(invoice.createdAt);
      if (!createdAt) return false;

      if (fromDateObj && createdAt < fromDateObj) return false;
      if (toDateObj && createdAt > toDateObj) return false;

      if (statusFilter !== 'ALL' && invoice.status !== statusFilter) return false;
      if (methodFilter !== 'ALL' && invoice.paymentMethod !== methodFilter) return false;

      if (!keyword) return true;

      const haystack = [
        invoice.code,
        invoice.customerName,
        invoice.serviceSummary,
        ...invoice.items.map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [invoices, search, fromDate, toDate, statusFilter, methodFilter]);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = prevMonthDate.getMonth();
    const previousYear = prevMonthDate.getFullYear();

    const thisMonthInvoices = invoices.filter((invoice) => {
      const d = new Date(invoice.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthInvoices = invoices.filter((invoice) => {
      const d = new Date(invoice.createdAt);
      return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
    });

    const revenueThisMonth = thisMonthInvoices
      .filter((invoice) => invoice.status === 'PAID')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const revenueLastMonth = lastMonthInvoices
      .filter((invoice) => invoice.status === 'PAID')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const revenueTrend =
      revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;

    const totalInvoicesThisMonth = thisMonthInvoices.length;
    const paidInvoicesThisMonth = thisMonthInvoices.filter((invoice) => invoice.status === 'PAID').length;
    const unpaidInvoicesThisMonth = thisMonthInvoices.filter((invoice) => invoice.status === 'UNPAID').length;
    const refundedInvoicesThisMonth = thisMonthInvoices.filter((invoice) => invoice.status === 'REFUNDED').length;

    const avgThisMonth = totalInvoicesThisMonth > 0 ? revenueThisMonth / totalInvoicesThisMonth : 0;
    const avgLastMonth = lastMonthInvoices.length > 0 ? revenueLastMonth / lastMonthInvoices.length : 0;
    const avgTrend = avgLastMonth > 0 ? ((avgThisMonth - avgLastMonth) / avgLastMonth) * 100 : 0;

    const collectibleThisMonth = thisMonthInvoices
      .filter((invoice) => invoice.status !== 'REFUNDED')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const paidValueThisMonth = thisMonthInvoices
      .filter((invoice) => invoice.status === 'PAID')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const paymentRate = collectibleThisMonth > 0 ? Math.round((paidValueThisMonth / collectibleThisMonth) * 100) : 0;

    return {
      revenueThisMonth,
      revenueTrend,
      totalInvoicesThisMonth,
      paidInvoicesThisMonth,
      unpaidInvoicesThisMonth,
      refundedInvoicesThisMonth,
      avgThisMonth,
      avgTrend,
      paymentRate,
    };
  }, [invoices]);

  const paymentRateDisplay = dataSource === 'sample' ? 87 : Math.max(0, Math.min(100, metrics.paymentRate));
  const progressRadius = 34;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset = progressCircumference * (1 - paymentRateDisplay / 100);

  const toEditableDraft = (invoice: InvoiceRecord): EditableInvoiceDraft => ({
    ma_khuyen_mai: invoice.promotionId,
    diem_su_dung: Math.max(0, Math.floor(toNumber(invoice.pointsUsed || 0))),
    ghi_chu: invoice.notes || '',
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Math.max(1, toNumber(item.quantity)),
      unitPrice: Math.max(0, toNumber(item.unitPrice)),
      total: Math.max(0, toNumber(item.quantity)) * Math.max(0, toNumber(item.unitPrice)),
    })),
  });

  const resetCreateDraft = () => {
    setCreateDraft({
      ma_khach_hang: 0,
      ma_khuyen_mai: undefined,
      diem_su_dung: 0,
      ghi_chu: '',
      items: [{ id: `new-${Date.now()}`, productId: undefined, quantity: 1, unitPrice: 0 }],
    });
  };

  const openInvoiceDetail = async (invoice: InvoiceRecord) => {
    setSelectedInvoice(invoice);
    setEditDraft(invoice.status === 'UNPAID' ? toEditableDraft(invoice) : null);

    if (!invoice.apiInvoiceId) return;

    try {
      const res = await invoicesApi.get(invoice.apiInvoiceId);
      if (!res.success || !res.data) return;

      const updatedInvoice = mapApiInvoice(res.data, 0);
      setInvoices((prev) => prev.map((item) => (item.id === invoice.id ? updatedInvoice : item)));
      setSelectedInvoice(updatedInvoice);
      setEditDraft(updatedInvoice.status === 'UNPAID' ? toEditableDraft(updatedInvoice) : null);
    } catch {
      // Keep optimistic row data in panel if detail API fails.
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice || selectedInvoice.status === 'PAID') return;

    setMarkingPaid(true);
    try {
      if (selectedInvoice.apiInvoiceId) {
        const res = await invoicesApi.update(selectedInvoice.apiInvoiceId, { trang_thai: 'PAID' });
        if (!res.success) {
          throw new Error(res.message || 'Không thể cập nhật trạng thái thanh toán');
        }
      }

      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === selectedInvoice.id
            ? {
                ...invoice,
                status: 'PAID',
              }
            : invoice,
        ),
      );

      setSelectedInvoice((prev) => (prev ? { ...prev, status: 'PAID' } : prev));
      setEditDraft(null);
    } catch (err: any) {
      setError(err?.message || 'Không cập nhật được trạng thái hóa đơn.');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleSavePendingInvoice = async () => {
    if (!selectedInvoice || !selectedInvoice.apiInvoiceId || !editDraft) return;
    if (selectedInvoice.status !== 'UNPAID') return;

    const invalidItem = editDraft.items.find(
      (item) => !item.productId || toNumber(item.quantity) <= 0 || toNumber(item.unitPrice) < 0,
    );
    if (invalidItem) {
      setError('Dòng dịch vụ không hợp lệ. Vui lòng kiểm tra sản phẩm/số lượng/đơn giá.');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        ma_khuyen_mai: editDraft.ma_khuyen_mai || undefined,
        diem_su_dung: Math.max(0, Math.floor(toNumber(editDraft.diem_su_dung))),
        ghi_chu: editDraft.ghi_chu || undefined,
        chi_tiets: editDraft.items.map((item) => ({
          ma_san_pham: Number(item.productId),
          so_luong: Math.max(1, Math.floor(toNumber(item.quantity))),
          don_gia: Math.max(0, toNumber(item.unitPrice)),
          ghi_chu: undefined,
        })),
      };

      const res = await invoicesApi.updatePending(selectedInvoice.apiInvoiceId, payload);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể cập nhật hóa đơn');
      }

      const updated = mapApiInvoice(res.data, 0);
      setInvoices((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedInvoice(updated);
      setEditDraft(updated.status === 'UNPAID' ? toEditableDraft(updated) : null);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật hóa đơn');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (toNumber(createDraft.ma_khach_hang) <= 0) {
      setError('Vui lòng nhập mã khách hàng hợp lệ để tạo hóa đơn.');
      return;
    }
    if (createDraft.items.length === 0) {
      setError('Hóa đơn phải có ít nhất 1 dòng dịch vụ.');
      return;
    }

    const invalidItem = createDraft.items.find(
      (item) => !item.productId || toNumber(item.quantity) <= 0 || toNumber(item.unitPrice) < 0,
    );
    if (invalidItem) {
      setError('Dòng dịch vụ mới không hợp lệ. Vui lòng chọn dịch vụ và kiểm tra số lượng/đơn giá.');
      return;
    }

    setCreatingInvoice(true);
    try {
      const payload = {
        ma_khach_hang: Math.floor(toNumber(createDraft.ma_khach_hang)),
        ma_khuyen_mai: createDraft.ma_khuyen_mai || undefined,
        diem_su_dung: Math.max(0, Math.floor(toNumber(createDraft.diem_su_dung))),
        ghi_chu: createDraft.ghi_chu || undefined,
        chi_tiets: createDraft.items.map((item) => ({
          ma_san_pham: Number(item.productId),
          so_luong: Math.max(1, Math.floor(toNumber(item.quantity))),
          don_gia: Math.max(0, toNumber(item.unitPrice)),
          ghi_chu: undefined,
        })),
      };

      const res = await invoicesApi.create(payload);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Tạo hóa đơn thất bại');
      }

      const created = mapApiInvoice(res.data, 0);
      setInvoices((prev) => [created, ...prev]);
      setShowCreateModal(false);
      resetCreateDraft();
      setError('');
      openInvoiceDetail(created);
    } catch (err: any) {
      setError(err?.message || 'Tạo hóa đơn thất bại');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const printInvoice = (invoice: InvoiceRecord) => {
    const lineRows = invoice.items
      .map(
        (item, idx) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${idx + 1}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${item.name}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${formatMoney(item.unitPrice)}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${formatMoney(item.total)}</td>
          </tr>
        `,
      )
      .join('');

    const popup = window.open('', '_blank', 'width=920,height=760');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.code}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
            .title { font-size:26px; font-weight:700; margin:0; }
            .sub { color:#555; margin:4px 0 0; }
            table { width:100%; border-collapse:collapse; margin-top:12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Nhà Spa - Hóa Đơn</h1>
              <p class="sub">Mã: ${invoice.code} | Khách: ${invoice.customerName}</p>
            </div>
            <img src="/logo.png" alt="logo" style="height:52px;" />
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #333;">STT</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #333;">Dịch vụ</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #333;">Đơn giá</th>
                <th style="text-align:center;padding:8px;border-bottom:2px solid #333;">SL</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #333;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>
          <p style="margin-top:20px;text-align:right;"><strong>Tổng cộng: ${formatMoney(invoice.total)}</strong></p>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  const exportExcel = () => {
    const headers = [
      'Mã hóa đơn',
      'Khách hàng',
      'Dịch vụ',
      'Nhân viên',
      'Ngày lập',
      'Phương thức TT',
      'Tổng tiền',
      'Trạng thái',
    ];

    const rows = filteredInvoices.map((invoice) => [
      invoice.code,
      invoice.customerName,
      `${invoice.serviceSummary} (${invoice.items.length} items)`,
      invoice.staffName,
      formatDateTime(invoice.createdAt),
      PAYMENT_META[invoice.paymentMethod].label,
      Math.round(invoice.total),
      STATUS_META[invoice.status].label,
    ]);

    const csv = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ].join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoa-don-spa-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const popup = window.open('', '_blank', 'width=1024,height=768');
    if (!popup) return;

    const rows = filteredInvoices
      .map(
        (invoice) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${invoice.code}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${invoice.customerName}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${invoice.serviceSummary}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${invoice.staffName}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${formatDateTime(invoice.createdAt)}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${formatMoney(invoice.total)}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${STATUS_META[invoice.status].label}</td>
          </tr>
        `,
      )
      .join('');

    popup.document.write(`
      <html>
        <head>
          <title>Báo cáo hóa đơn</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            thead th { text-align:left; padding: 8px; border-bottom: 2px solid #333; }
          </style>
        </head>
        <body>
          <h1>Báo cáo hóa đơn Spa</h1>
          <p>Tổng số hóa đơn: ${filteredInvoices.length}</p>
          <table>
            <thead>
              <tr>
                <th>Mã HĐ</th><th>Khách hàng</th><th>Dịch vụ</th><th>Nhân viên</th><th>Ngày lập</th><th>Tổng tiền</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  const canEditSelectedInvoice = Boolean(
    selectedInvoice &&
    selectedInvoice.status === 'UNPAID' &&
    selectedInvoice.apiInvoiceId &&
    editDraft,
  );

  const selectedItemsForView = canEditSelectedInvoice && editDraft
    ? editDraft.items.map((item) => ({
        ...item,
        total: Math.max(0, toNumber(item.quantity)) * Math.max(0, toNumber(item.unitPrice)),
      }))
    : (selectedInvoice?.items || []);

  const selectedSubtotalForView = canEditSelectedInvoice && editDraft
    ? subtotalFromItems(editDraft.items)
    : (selectedInvoice?.subtotal || 0);

  return (
    <div className="admin-animate-in space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-invoice-heading text-3xl leading-tight">Quản Lý Hóa Đơn</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {filteredInvoices.length} hóa đơn hiển thị • Nguồn dữ liệu: {dataSource === 'api' ? 'API thực tế' : 'Mẫu 20 hóa đơn'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetCreateDraft();
              setShowCreateModal(true);
            }}
            className="admin-btn admin-btn-primary"
          >
            <ReceiptText size={16} /> Tạo hóa đơn
          </button>
          <button onClick={loadInvoices} className="admin-btn admin-btn-secondary">
            <TrendingUp size={16} /> Làm mới dữ liệu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="admin-invoice-kpi">
          <div className="admin-invoice-kpi-icon">
            <CircleDollarSign size={20} />
          </div>
          <div>
            <p className="admin-invoice-kpi-label">Tổng doanh thu tháng này</p>
            <p className="admin-invoice-kpi-value">{formatMoney(metrics.revenueThisMonth)}</p>
            <p className="admin-invoice-kpi-trend admin-invoice-positive-text">
              <ArrowUpRight size={14} /> {Math.abs(metrics.revenueTrend).toFixed(1)}% so tháng trước
            </p>
          </div>
        </div>

        <div className="admin-invoice-kpi">
          <div className="admin-invoice-kpi-icon">
            <ReceiptText size={20} />
          </div>
          <div>
            <p className="admin-invoice-kpi-label">Số hóa đơn</p>
            <p className="admin-invoice-kpi-value">{metrics.totalInvoicesThisMonth}</p>
            <p className="admin-invoice-kpi-subtext">
              Đã TT: <span className="admin-invoice-positive-text">{metrics.paidInvoicesThisMonth}</span> • Chưa TT:{' '}
              <span className="admin-invoice-danger-text">{metrics.unpaidInvoicesThisMonth}</span>
            </p>
          </div>
        </div>

        <div className="admin-invoice-kpi">
          <div className="admin-invoice-kpi-icon">
            <FileText size={20} />
          </div>
          <div>
            <p className="admin-invoice-kpi-label">Giá trị trung bình / hóa đơn</p>
            <p className="admin-invoice-kpi-value">{formatMoney(metrics.avgThisMonth)}</p>
            <p className="admin-invoice-kpi-trend admin-invoice-positive-text">
              <ArrowUpRight size={14} /> {Math.abs(metrics.avgTrend).toFixed(1)}% trend
            </p>
          </div>
        </div>

        <div className="admin-invoice-kpi justify-between">
          <div>
            <p className="admin-invoice-kpi-label">Tỷ lệ thanh toán</p>
            <p className="admin-invoice-kpi-value">{paymentRateDisplay}%</p>
            <p className="admin-invoice-kpi-subtext">
              Hoàn tiền: <span className="admin-invoice-warning-text">{metrics.refundedInvoicesThisMonth}</span>
            </p>
          </div>
          <div className="admin-invoice-progress-wrap">
            <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
              <circle cx="44" cy="44" r={progressRadius} fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="8" />
              <circle
                cx="44"
                cy="44"
                r={progressRadius}
                fill="none"
                stroke={GOLD}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 44 44)"
              />
              <text x="44" y="48" textAnchor="middle" fontSize="16" fontWeight="700" fill={GOLD}>
                {paymentRateDisplay}%
              </text>
            </svg>
          </div>
        </div>
      </div>

      <div className="admin-card admin-invoice-filter-panel">
        <div className="admin-invoice-filter-grid">
          <div className="admin-invoice-search">
            <Search size={16} className="admin-invoice-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search theo mã HĐ / tên KH / dịch vụ"
              className="admin-input pl-9"
            />
          </div>

          <div className="admin-invoice-date-range">
            <CalendarRange size={15} />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="admin-input" />
            <span>—</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="admin-input" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InvoiceStatus)}
            className="admin-select admin-invoice-filter-select"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'ALL' | PaymentMethod)}
            className="admin-select admin-invoice-filter-select"
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="admin-invoice-filter-actions flex items-center gap-2 justify-end">
            <button onClick={exportPdf} className="admin-btn admin-btn-secondary">
              <Download size={15} /> Xuất PDF
            </button>
            <button onClick={exportExcel} className="admin-btn admin-btn-secondary">
              <FileSpreadsheet size={15} /> Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>}

      <div className="admin-card">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="admin-empty">
            <FileText className="admin-empty-icon" />
            <p>Không có hóa đơn nào khớp bộ lọc</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table admin-invoice-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Khách hàng</th>
                  <th>Dịch vụ</th>
                  <th>Nhân viên</th>
                  <th>Ngày lập</th>
                  <th>Phương thức TT</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const PaymentIcon = PAYMENT_META[invoice.paymentMethod].icon;
                  return (
                    <tr
                      key={invoice.id}
                      className={invoice.status === 'UNPAID' ? 'admin-invoice-row-unpaid' : ''}
                      onClick={() => openInvoiceDetail(invoice)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="font-mono text-xs font-semibold" style={{ color: GOLD }}>
                        {invoice.code}
                      </td>

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="admin-invoice-avatar">{invoice.customerAvatar}</div>
                          <div>
                            <p className="font-medium">{invoice.customerName}</p>
                            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                              {invoice.customerPhone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <p className="font-medium">{invoice.serviceSummary}</p>
                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {invoice.items.length} item
                        </p>
                      </td>

                      <td>{invoice.staffName}</td>
                      <td>{formatDateTime(invoice.createdAt)}</td>

                      <td>
                        <div className="inline-flex items-center gap-2">
                          <PaymentIcon size={14} style={{ color: GOLD }} />
                          <span>{PAYMENT_META[invoice.paymentMethod].label}</span>
                        </div>
                      </td>

                      <td className="font-semibold" style={{ color: GOLD }}>
                        {formatMoney(invoice.total)}
                      </td>

                      <td>
                        <span className={`admin-invoice-status ${STATUS_META[invoice.status].className}`}>
                          {STATUS_META[invoice.status].label}
                        </span>
                      </td>

                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            className="admin-btn-icon"
                            title="Xem"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvoiceDetail(invoice);
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="admin-btn-icon"
                            title="In"
                            onClick={(e) => {
                              e.stopPropagation();
                              printInvoice(invoice);
                            }}
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            className="admin-btn-icon"
                            title="Sửa"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvoiceDetail(invoice);
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="admin-invoice-slide-overlay" onClick={() => setShowCreateModal(false)}>
          <aside className="admin-invoice-slide-panel admin-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="admin-invoice-slide-header">
              <div>
                <h3 className="admin-invoice-heading text-xl">Tạo hóa đơn mới</h3>
                <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  Có thể áp dụng khuyến mãi đang chạy và dùng điểm trực tiếp.
                </p>
              </div>
              <button className="admin-btn-icon" onClick={() => setShowCreateModal(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            <div className="admin-invoice-slide-body space-y-4">
              <section className="admin-invoice-section grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="admin-invoice-muted block mb-1">Mã khách hàng *</label>
                  <input
                    type="number"
                    min={1}
                    className="admin-input w-full"
                    value={createDraft.ma_khach_hang || ''}
                    onChange={(e) =>
                      setCreateDraft((prev) => ({
                        ...prev,
                        ma_khach_hang: Math.max(0, Math.floor(toNumber(e.target.value))),
                      }))
                    }
                    placeholder="Nhập mã khách hàng"
                  />
                </div>
                <div>
                  <label className="admin-invoice-muted block mb-1">Điểm sử dụng</label>
                  <input
                    type="number"
                    min={0}
                    className="admin-input w-full"
                    value={createDraft.diem_su_dung}
                    onChange={(e) =>
                      setCreateDraft((prev) => ({
                        ...prev,
                        diem_su_dung: Math.max(0, Math.floor(toNumber(e.target.value))),
                      }))
                    }
                    placeholder="Tối thiểu 100 điểm"
                  />
                </div>
                <div>
                  <label className="admin-invoice-muted block mb-1">Khuyến mãi</label>
                  <select
                    className="admin-select w-full"
                    value={createDraft.ma_khuyen_mai || 0}
                    onChange={(e) =>
                      setCreateDraft((prev) => ({
                        ...prev,
                        ma_khuyen_mai: Number(e.target.value) || undefined,
                      }))
                    }
                  >
                    <option value={0}>Không áp dụng</option>
                    {promotionOptions.map((promo) => (
                      <option key={`promo-create-${promo.ma_khuyen_mai}`} value={promo.ma_khuyen_mai}>
                        {promotionLabel(promo)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="admin-invoice-muted block mb-1">Ghi chú</label>
                  <textarea
                    className="admin-input w-full"
                    rows={2}
                    value={createDraft.ghi_chu}
                    onChange={(e) =>
                      setCreateDraft((prev) => ({
                        ...prev,
                        ghi_chu: e.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="admin-invoice-section">
                <h4>Bảng dịch vụ</h4>
                <div className="overflow-x-auto">
                  <table className="admin-table admin-invoice-detail-table">
                    <thead>
                      <tr>
                        <th>Dịch vụ</th>
                        <th className="text-right">Đơn giá</th>
                        <th className="text-center">Số lượng</th>
                        <th className="text-right">Thành tiền</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {createDraft.items.map((item) => {
                        const lineTotal = Math.max(0, toNumber(item.unitPrice)) * Math.max(1, toNumber(item.quantity));
                        return (
                          <tr key={item.id}>
                            <td>
                              <select
                                className="admin-select w-full"
                                value={item.productId || 0}
                                onChange={(e) => {
                                  const productId = Number(e.target.value) || undefined;
                                  const product = productOptions.find((p) => p.ma_san_pham === productId);
                                  setCreateDraft((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row) =>
                                      row.id === item.id
                                        ? {
                                            ...row,
                                            productId,
                                            unitPrice: product ? product.gia_mac_dinh : row.unitPrice,
                                          }
                                        : row,
                                    ),
                                  }));
                                }}
                              >
                                <option value={0}>Chọn dịch vụ</option>
                                {productOptions.map((product) => (
                                  <option key={`create-product-${product.ma_san_pham}`} value={product.ma_san_pham}>
                                    {product.ten_san_pham}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                min={0}
                                className="admin-input text-right"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const value = Math.max(0, toNumber(e.target.value));
                                  setCreateDraft((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row) =>
                                      row.id === item.id ? { ...row, unitPrice: value } : row,
                                    ),
                                  }));
                                }}
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="number"
                                min={1}
                                className="admin-input text-center"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = Math.max(1, Math.floor(toNumber(e.target.value)));
                                  setCreateDraft((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row) =>
                                      row.id === item.id ? { ...row, quantity: value } : row,
                                    ),
                                  }));
                                }}
                              />
                            </td>
                            <td className="text-right font-semibold">{formatMoney(lineTotal)}</td>
                            <td className="text-right">
                              <button
                                className="admin-btn-icon"
                                onClick={() =>
                                  setCreateDraft((prev) => ({
                                    ...prev,
                                    items: prev.items.filter((row) => row.id !== item.id),
                                  }))
                                }
                                disabled={createDraft.items.length <= 1}
                                title="Xóa dòng"
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() =>
                      setCreateDraft((prev) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          { id: `new-${Date.now()}`, productId: undefined, quantity: 1, unitPrice: 0 },
                        ],
                      }))
                    }
                  >
                    + Thêm dòng dịch vụ
                  </button>
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Tạm tính: <strong>{formatMoney(createSubtotal)}</strong>
                  </p>
                </div>
              </section>
            </div>

            <div className="admin-invoice-slide-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowCreateModal(false)}>
                Đóng
              </button>
              <button className="admin-btn admin-btn-primary" onClick={handleCreateInvoice} disabled={creatingInvoice}>
                {creatingInvoice ? 'Đang tạo...' : 'Tạo hóa đơn'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {selectedInvoice && (
        <div
          className="admin-invoice-slide-overlay"
          onClick={() => {
            setSelectedInvoice(null);
            setEditDraft(null);
          }}
        >
          <aside className="admin-invoice-slide-panel admin-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="admin-invoice-slide-header">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Nhà Spa" className="h-10 w-10 rounded-md bg-white p-1" />
                <div>
                  <h3 className="admin-invoice-heading text-xl">Chi tiết hóa đơn</h3>
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {selectedInvoice.code}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="admin-invoice-qr">
                  <QrCode size={34} />
                </div>
                <button
                  className="admin-btn-icon"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setEditDraft(null);
                  }}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="admin-invoice-slide-body">
              <section className="admin-invoice-section">
                <h4>Thông tin khách hàng</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p>
                    <span className="admin-invoice-muted">Họ tên:</span> {selectedInvoice.customerName}
                  </p>
                  <p>
                    <span className="admin-invoice-muted">Số điện thoại:</span> {selectedInvoice.customerPhone}
                  </p>
                  <p className="md:col-span-2">
                    <span className="admin-invoice-muted">Địa chỉ:</span> {selectedInvoice.customerAddress}
                  </p>
                </div>
              </section>

              <section className="admin-invoice-section">
                <h4>Bảng dịch vụ</h4>
                <div className="overflow-x-auto">
                  <table className="admin-table admin-invoice-detail-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Tên dịch vụ</th>
                        <th className="text-right">Đơn giá</th>
                        <th className="text-center">Số lượng</th>
                        <th className="text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItemsForView.map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td>
                            {canEditSelectedInvoice ? (
                              <select
                                className="admin-select w-full"
                                value={item.productId || 0}
                                onChange={(e) => {
                                  if (!editDraft) return;
                                  const productId = Number(e.target.value) || undefined;
                                  const product = productOptions.find((p) => p.ma_san_pham === productId);
                                  setEditDraft({
                                    ...editDraft,
                                    items: editDraft.items.map((row) =>
                                      row.id === item.id
                                        ? {
                                            ...row,
                                            productId,
                                            name: product?.ten_san_pham || row.name,
                                            unitPrice: product ? product.gia_mac_dinh : row.unitPrice,
                                          }
                                        : row,
                                    ),
                                  });
                                }}
                              >
                                <option value={0}>Chọn dịch vụ</option>
                                {productOptions.map((product) => (
                                  <option key={`edit-product-${product.ma_san_pham}`} value={product.ma_san_pham}>
                                    {product.ten_san_pham}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              item.name
                            )}
                          </td>
                          <td className="text-right">
                            {canEditSelectedInvoice ? (
                              <input
                                type="number"
                                min={0}
                                className="admin-input text-right"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  if (!editDraft) return;
                                  const value = Math.max(0, toNumber(e.target.value));
                                  setEditDraft({
                                    ...editDraft,
                                    items: editDraft.items.map((row) =>
                                      row.id === item.id ? { ...row, unitPrice: value } : row,
                                    ),
                                  });
                                }}
                              />
                            ) : (
                              formatMoney(item.unitPrice)
                            )}
                          </td>
                          <td className="text-center">
                            {canEditSelectedInvoice ? (
                              <input
                                type="number"
                                min={1}
                                className="admin-input text-center"
                                value={item.quantity}
                                onChange={(e) => {
                                  if (!editDraft) return;
                                  const value = Math.max(1, Math.floor(toNumber(e.target.value)));
                                  setEditDraft({
                                    ...editDraft,
                                    items: editDraft.items.map((row) =>
                                      row.id === item.id ? { ...row, quantity: value } : row,
                                    ),
                                  });
                                }}
                              />
                            ) : (
                              item.quantity
                            )}
                          </td>
                          <td className="text-right font-semibold">{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canEditSelectedInvoice && (
                  <div className="mt-3 flex justify-end">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        if (!editDraft) return;
                        setEditDraft({
                          ...editDraft,
                          items: [
                            ...editDraft.items,
                            {
                              id: Date.now(),
                              productId: undefined,
                              name: '',
                              quantity: 1,
                              unitPrice: 0,
                              total: 0,
                            },
                          ],
                        });
                      }}
                    >
                      Thêm dòng dịch vụ
                    </button>
                  </div>
                )}
              </section>

              <section className="admin-invoice-section">
                <div className="admin-invoice-summary-row">
                  <span>Subtotal</span>
                  <strong>{formatMoney(selectedSubtotalForView)}</strong>
                </div>
                <div className="admin-invoice-summary-row">
                  <span>Discount</span>
                  <strong>- {formatMoney(selectedInvoice.discount)}</strong>
                </div>
                <div className="admin-invoice-summary-row">
                  <span>VAT (8%)</span>
                  <strong>{formatMoney(selectedInvoice.vat)}</strong>
                </div>
                <div className="admin-invoice-summary-row is-total">
                  <span>Tổng cộng</span>
                  <strong>{formatMoney(selectedInvoice.total)}</strong>
                </div>
                {canEditSelectedInvoice && (
                  <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>
                    Tổng tiền/thuế sau cùng sẽ được backend tính lại khi lưu.
                  </p>
                )}
              </section>

              <section className="admin-invoice-section grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="admin-invoice-muted">Phương thức thanh toán:</span>{' '}
                  {PAYMENT_META[selectedInvoice.paymentMethod].label}
                </p>
                <p>
                  <span className="admin-invoice-muted">Trạng thái:</span> {STATUS_META[selectedInvoice.status].label}
                </p>
                {canEditSelectedInvoice && editDraft ? (
                  <>
                    <div>
                      <label className="admin-invoice-muted block mb-1">Khuyến mãi</label>
                      <select
                        className="admin-select w-full"
                        value={editDraft.ma_khuyen_mai || 0}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            ma_khuyen_mai: Number(e.target.value) || undefined,
                          })
                        }
                      >
                        <option value={0}>Không áp dụng</option>
                        {promotionOptions.map((promo) => (
                          <option key={`promo-edit-${promo.ma_khuyen_mai}`} value={promo.ma_khuyen_mai}>
                            {promotionLabel(promo)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="admin-invoice-muted block mb-1">Điểm sử dụng</label>
                      <input
                        type="number"
                        min={0}
                        className="admin-input w-full"
                        value={editDraft.diem_su_dung}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            diem_su_dung: Math.max(0, Math.floor(toNumber(e.target.value))),
                          })
                        }
                        placeholder="Tối thiểu 100 điểm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="admin-invoice-muted block mb-1">Ghi chú</label>
                      <textarea
                        className="admin-input w-full"
                        rows={3}
                        value={editDraft.ghi_chu}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            ghi_chu: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <p className="md:col-span-2">
                    <span className="admin-invoice-muted">Ghi chú:</span> {selectedInvoice.notes || 'Không có ghi chú'}
                  </p>
                )}
              </section>
            </div>

            <div className="admin-invoice-slide-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => printInvoice(selectedInvoice)}>
                <Printer size={15} /> In hóa đơn
              </button>
              {canEditSelectedInvoice && (
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={handleSavePendingInvoice}
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
                </button>
              )}
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleMarkAsPaid}
                disabled={selectedInvoice.status === 'PAID' || markingPaid}
              >
                {markingPaid ? 'Đang cập nhật...' : 'Đánh dấu đã TT'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
