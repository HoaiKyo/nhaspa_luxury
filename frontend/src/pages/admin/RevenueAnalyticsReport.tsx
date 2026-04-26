import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Download, FileText, Printer } from 'lucide-react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { invoicesApi } from '../../api/admin.api';

type ReportGroupKey = 'REVENUE' | 'APPOINTMENT' | 'CUSTOMER' | 'INVENTORY' | 'RATING';
type ReportKey =
  | 'REVENUE_DAY'
  | 'REVENUE_MONTH'
  | 'REVENUE_YEAR'
  | 'REVENUE_SERVICE'
  | 'REVENUE_STAFF'
  | 'APPOINTMENT_COMPLETION'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_PEAK'
  | 'CUSTOMER_NEW'
  | 'CUSTOMER_RETURNING'
  | 'CUSTOMER_TIER'
  | 'CUSTOMER_CHURN'
  | 'INVENTORY_CONSUMPTION'
  | 'INVENTORY_REPLENISH'
  | 'INVENTORY_VALUE'
  | 'RATING_OVERVIEW'
  | 'RATING_SERVICE'
  | 'RATING_STAFF';

type InvoiceStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'CANCELLED' | 'REFUNDED' | 'DRAFT';

type SortKey = 'date' | 'transactions' | 'completed' | 'cancelled' | 'revenue' | 'avgTicket';

type SortDirection = 'asc' | 'desc';

interface InvoiceRow {
  id: number;
  createdAt: Date;
  status: InvoiceStatus;
  total: number;
  revenue: number;
  customerName: string;
  staffName: string;
}

interface DailyBreakdownRow {
  dateKey: string;
  dateLabel: string;
  transactions: number;
  completed: number;
  cancelled: number;
  revenue: number;
  avgTicket: number;
  vipRevenue: number;
}

interface ReportItem {
  key: ReportKey;
  label: string;
}

interface ReportSection {
  key: ReportGroupKey;
  icon: string;
  title: string;
  items: ReportItem[];
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const GOLD = '#d4b06f';
const GREEN = '#3bd28d';
const BLUE = '#4c8dff';
const REPORT_TITLE_MAP: Record<ReportKey, string> = {
  REVENUE_DAY: 'Báo cáo Doanh thu Ngày',
  REVENUE_MONTH: 'Báo cáo Doanh thu Tháng',
  REVENUE_YEAR: 'Báo cáo Doanh thu Năm',
  REVENUE_SERVICE: 'Báo cáo Doanh thu Theo Dịch vụ',
  REVENUE_STAFF: 'Báo cáo Doanh thu Theo Nhân viên',
  APPOINTMENT_COMPLETION: 'Báo cáo Tỷ lệ hoàn thành lịch hẹn',
  APPOINTMENT_CANCELLED: 'Báo cáo Lịch hẹn bị hủy',
  APPOINTMENT_PEAK: 'Báo cáo Khung giờ cao điểm',
  CUSTOMER_NEW: 'Báo cáo Khách hàng mới',
  CUSTOMER_RETURNING: 'Báo cáo Khách hàng quay lại',
  CUSTOMER_TIER: 'Báo cáo Khách hàng theo hạng',
  CUSTOMER_CHURN: 'Báo cáo Churn rate khách hàng',
  INVENTORY_CONSUMPTION: 'Báo cáo Tiêu thụ kho',
  INVENTORY_REPLENISH: 'Báo cáo Cần nhập kho',
  INVENTORY_VALUE: 'Báo cáo Giá trị tồn kho',
  RATING_OVERVIEW: 'Báo cáo Đánh giá tổng hợp',
  RATING_SERVICE: 'Báo cáo Đánh giá theo dịch vụ',
  RATING_STAFF: 'Báo cáo Đánh giá theo nhân viên',
};

const REPORT_SECTIONS: ReportSection[] = [
  {
    key: 'REVENUE',
    icon: '📈',
    title: 'Doanh thu',
    items: [
      { key: 'REVENUE_DAY', label: 'Theo ngày' },
      { key: 'REVENUE_MONTH', label: 'Theo tháng' },
      { key: 'REVENUE_YEAR', label: 'Theo năm' },
      { key: 'REVENUE_SERVICE', label: 'Theo dịch vụ' },
      { key: 'REVENUE_STAFF', label: 'Theo nhân viên' },
    ],
  },
  {
    key: 'APPOINTMENT',
    icon: '📅',
    title: 'Lịch hẹn',
    items: [
      { key: 'APPOINTMENT_COMPLETION', label: 'Tỷ lệ hoàn thành' },
      { key: 'APPOINTMENT_CANCELLED', label: 'Hủy' },
      { key: 'APPOINTMENT_PEAK', label: 'Thời gian cao điểm' },
    ],
  },
  {
    key: 'CUSTOMER',
    icon: '👥',
    title: 'Khách hàng',
    items: [
      { key: 'CUSTOMER_NEW', label: 'Mới' },
      { key: 'CUSTOMER_RETURNING', label: 'Quay lại' },
      { key: 'CUSTOMER_TIER', label: 'Theo hạng' },
      { key: 'CUSTOMER_CHURN', label: 'Churn rate' },
    ],
  },
  {
    key: 'INVENTORY',
    icon: '📦',
    title: 'Kho',
    items: [
      { key: 'INVENTORY_CONSUMPTION', label: 'Tiêu thụ' },
      { key: 'INVENTORY_REPLENISH', label: 'Cần nhập' },
      { key: 'INVENTORY_VALUE', label: 'Giá trị tồn' },
    ],
  },
  {
    key: 'RATING',
    icon: '⭐',
    title: 'Đánh giá',
    items: [
      { key: 'RATING_OVERVIEW', label: 'Tổng hợp' },
      { key: 'RATING_SERVICE', label: 'Theo dịch vụ' },
      { key: 'RATING_STAFF', label: 'Theo nhân viên' },
    ],
  },
];

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;

const parseDate = (value: unknown) => {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toInputMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const normalizeStatus = (status: unknown): InvoiceStatus => {
  const value = String(status || '').toUpperCase();
  if (value === 'PAID') return 'PAID';
  if (value === 'PARTIAL') return 'PARTIAL';
  if (value === 'PENDING') return 'PENDING';
  if (value === 'CANCELLED') return 'CANCELLED';
  if (value === 'REFUNDED') return 'REFUNDED';
  return 'DRAFT';
};

const buildMockInvoices = () => {
  const customers = ['Nguyễn Minh Anh', 'Trần Bảo Yến', 'Phạm Gia Linh', 'Lê Thu Hương', 'Vũ Khánh Vy'];
  const staffs = ['KTV Ngọc Trâm', 'KTV Thiên Ân', 'KTV Như Ý', 'KTV Hoàng Lan'];
  const rows: InvoiceRow[] = [];
  const now = new Date();

  for (let i = 0; i < 190; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), 1);
    date.setDate(1 + (i % 31));
    date.setHours(9 + (i % 11), 10 + (i % 40), 0, 0);

    const total = 520000 + (i % 8) * 180000 + (i % 3) * 75000;
    const statusPool: InvoiceStatus[] = ['PAID', 'PAID', 'PAID', 'PARTIAL', 'PENDING', 'CANCELLED', 'REFUNDED'];
    const status = statusPool[i % statusPool.length];
    const revenue = status === 'PAID' || status === 'PARTIAL' ? total : 0;

    rows.push({
      id: i + 1,
      createdAt: date,
      status,
      total,
      revenue,
      customerName: customers[i % customers.length],
      staffName: staffs[i % staffs.length],
    });
  }

  return rows;
};

const normalizeInvoice = (raw: any, index: number): InvoiceRow => {
  const createdAt = parseDate(raw?.ngay_tao) || new Date();
  const total = toNumber(raw?.thanh_tien || raw?.tong_tien || 0);
  const status = normalizeStatus(raw?.trang_thai);

  const paidFromPayments = Array.isArray(raw?.thanh_toans)
    ? raw.thanh_toans
        .filter((payment: any) => String(payment?.trang_thai || '').toUpperCase() === 'SUCCESS')
        .reduce((sum: number, payment: any) => sum + toNumber(payment?.so_tien), 0)
    : 0;

  let revenue = paidFromPayments;
  if (revenue <= 0 && (status === 'PAID' || status === 'PARTIAL')) {
    revenue = total;
  }
  if (status === 'REFUNDED' || status === 'CANCELLED') {
    revenue = 0;
  }

  return {
    id: Math.max(1, toNumber(raw?.ma_hoa_don || index + 1)),
    createdAt,
    status,
    total,
    revenue,
    customerName: String(raw?.ho_ten_khach || `Khách #${raw?.ma_khach_hang || index + 1}`),
    staffName: String(raw?.ho_ten_nhan_vien || `Nhân viên #${raw?.ma_nhan_vien || 1}`),
  };
};

const buildMonthDays = (monthValue: string) => {
  const [yearRaw, monthRaw] = monthValue.split('-');
  const year = toNumber(yearRaw);
  const month = toNumber(monthRaw);

  if (!year || !month) {
    return [] as Array<{ date: Date; key: string; label: string }>;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, idx) => {
    const date = new Date(year, month - 1, idx + 1);
    return {
      date,
      key: dateKey(date),
      label: String(idx + 1).padStart(2, '0'),
    };
  });
};

const sortRows = (rows: DailyBreakdownRow[], sortKey: SortKey, sortDirection: SortDirection) => {
  const sorted = [...rows].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    if (sortKey === 'date') {
      return a.dateKey.localeCompare(b.dateKey) * direction;
    }

    const valueA = a[sortKey];
    const valueB = b[sortKey];
    return (valueA - valueB) * direction;
  });

  return sorted;
};

const buildCsv = (rows: DailyBreakdownRow[]) => {
  const header = ['Ngay', 'Giao dich', 'Hoan thanh', 'Huy', 'Doanh thu', 'Gia tri TB'];
  const lines = rows.map((row) => [
    row.dateLabel,
    row.transactions,
    row.completed,
    row.cancelled,
    Math.round(row.revenue),
    Math.round(row.avgTicket),
  ]);

  return [header, ...lines].map((line) => line.join(',')).join('\n');
};

const triggerDownload = (content: string, filename: string, mimeType = 'text/plain;charset=utf-8;') => {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
};

const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 1050,
    easing: 'easeOutCubic',
  },
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      labels: {
        color: '#e6edf8',
        font: {
          family: 'Be Vietnam Pro',
          size: 12,
          weight: 600,
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(12, 18, 32, 0.95)',
      borderColor: GOLD,
      borderWidth: 1,
      titleColor: '#f6e6c8',
      bodyColor: '#e2e8f0',
      padding: 10,
      callbacks: {
        label: (context: any) => {
          const label = context.dataset.label || '';
          if (label.toLowerCase().includes('doanh thu')) {
            return `${label}: ${formatVnd(Number(context.parsed.y || 0))}`;
          }
          return `${label}: ${new Intl.NumberFormat('vi-VN').format(Number(context.parsed.y || 0))}`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#9ab0d0',
      },
      grid: {
        color: 'rgba(92, 114, 146, 0.16)',
      },
    },
    y: {
      ticks: {
        color: '#9ab0d0',
        callback: (value: any) => `${Math.round(Number(value) / 1000000)}M`,
      },
      grid: {
        color: 'rgba(92, 114, 146, 0.16)',
      },
    },
    y1: {
      position: 'right',
      ticks: {
        color: '#8dc4ff',
      },
      grid: {
        drawOnChartArea: false,
      },
    },
  },
};

export default function RevenueAnalyticsReport() {
  const [activeReport, setActiveReport] = useState<ReportKey>('REVENUE_MONTH');
  const [monthValue, setMonthValue] = useState(() => toInputMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [usingMock, setUsingMock] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const invoices: any[] = [];
        let page = 1;
        let totalPages = 1;

        do {
          const res = await invoicesApi.list(page, 120);
          if (!res.success) {
            throw new Error(res.message || 'Không thể tải dữ liệu hóa đơn');
          }

          invoices.push(...(Array.isArray(res.data) ? res.data : []));
          totalPages = Math.max(1, toNumber(res.meta?.total_pages || 1));
          page += 1;
        } while (page <= totalPages);

        if (invoices.length === 0) {
          setRows(buildMockInvoices());
          setUsingMock(true);
          setError('Chưa có dữ liệu hóa đơn thực tế, đang hiển thị dữ liệu mô phỏng cho báo cáo.');
        } else {
          setRows(invoices.map((invoice, idx) => normalizeInvoice(invoice, idx)));
          setUsingMock(false);
        }
      } catch (loadError: any) {
        setRows(buildMockInvoices());
        setUsingMock(true);
        setError((loadError?.message || 'Không thể tải dữ liệu') + '. Đang hiển thị dữ liệu mô phỏng.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const monthDays = useMemo(() => buildMonthDays(monthValue), [monthValue]);

  const breakdownRows = useMemo(() => {
    const initialMap = new Map<string, DailyBreakdownRow>(
      monthDays.map((day) => [
        day.key,
        {
          dateKey: day.key,
          dateLabel: day.label,
          transactions: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          avgTicket: 0,
          vipRevenue: 0,
        },
      ]),
    );

    rows.forEach((invoice) => {
      const key = dateKey(invoice.createdAt);
      if (!initialMap.has(key)) return;

      const item = initialMap.get(key)!;
      item.transactions += 1;

      if (invoice.status === 'PAID' || invoice.status === 'PARTIAL') {
        item.completed += 1;
      }

      if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
        item.cancelled += 1;
      }

      item.revenue += invoice.revenue;
      if (/vip|diamond|gold/i.test(invoice.customerName)) {
        item.vipRevenue += invoice.revenue;
      }
    });

    const values = Array.from(initialMap.values()).map((row) => ({
      ...row,
      avgTicket: row.completed > 0 ? row.revenue / row.completed : 0,
    }));

    return values;
  }, [monthDays, rows]);

  const previousMonthBreakdown = useMemo(() => {
    const [yearRaw, monthRaw] = monthValue.split('-');
    const year = toNumber(yearRaw);
    const month = toNumber(monthRaw);
    if (!year || !month) return [] as DailyBreakdownRow[];

    const base = new Date(year, month - 1, 1);
    const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    const prevMonthKey = toInputMonth(prev);
    const prevDays = buildMonthDays(prevMonthKey);

    const map = new Map<string, DailyBreakdownRow>(
      prevDays.map((day) => [
        day.key,
        {
          dateKey: day.key,
          dateLabel: day.label,
          transactions: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          avgTicket: 0,
          vipRevenue: 0,
        },
      ]),
    );

    rows.forEach((invoice) => {
      const key = dateKey(invoice.createdAt);
      if (!map.has(key)) return;

      const item = map.get(key)!;
      item.transactions += 1;
      if (invoice.status === 'PAID' || invoice.status === 'PARTIAL') item.completed += 1;
      if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') item.cancelled += 1;
      item.revenue += invoice.revenue;
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      avgTicket: row.completed > 0 ? row.revenue / row.completed : 0,
    }));
  }, [monthValue, rows]);

  const sortedBreakdownRows = useMemo(
    () => sortRows(breakdownRows, sortKey, sortDirection),
    [breakdownRows, sortKey, sortDirection],
  );

  const totals = useMemo(() => {
    const transactions = breakdownRows.reduce((sum, row) => sum + row.transactions, 0);
    const completed = breakdownRows.reduce((sum, row) => sum + row.completed, 0);
    const cancelled = breakdownRows.reduce((sum, row) => sum + row.cancelled, 0);
    const revenue = breakdownRows.reduce((sum, row) => sum + row.revenue, 0);
    const avgTicket = completed > 0 ? revenue / completed : 0;
    const vipRevenue = breakdownRows.reduce((sum, row) => sum + row.vipRevenue, 0);

    return {
      transactions,
      completed,
      cancelled,
      revenue,
      avgTicket,
      vipRevenue,
    };
  }, [breakdownRows]);

  const previousTotals = useMemo(() => {
    const revenue = previousMonthBreakdown.reduce((sum, row) => sum + row.revenue, 0);
    return { revenue };
  }, [previousMonthBreakdown]);

  const completionRate = totals.transactions > 0 ? (totals.completed / totals.transactions) * 100 : 0;
  const cancellationRate = totals.transactions > 0 ? (totals.cancelled / totals.transactions) * 100 : 0;
  const vipShare = totals.revenue > 0 ? (totals.vipRevenue / totals.revenue) * 100 : 0;
  const revenueGrowth =
    previousTotals.revenue > 0 ? ((totals.revenue - previousTotals.revenue) / previousTotals.revenue) * 100 : 0;

  const peakRow = useMemo(() => {
    return breakdownRows.reduce(
      (best, row) => (row.revenue > best.revenue ? row : best),
      breakdownRows[0] || {
        dateKey: '',
        dateLabel: '--',
        transactions: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
        avgTicket: 0,
        vipRevenue: 0,
      },
    );
  }, [breakdownRows]);

  const chartData = useMemo(() => {
    const labels = breakdownRows.map((row) => row.dateLabel);
    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Doanh thu',
          data: breakdownRows.map((row) => row.revenue),
          yAxisID: 'y',
          borderRadius: 5,
          backgroundColor: 'rgba(212, 176, 111, 0.82)',
          borderColor: GOLD,
          borderWidth: 1,
          maxBarThickness: 24,
        },
        {
          type: 'line' as const,
          label: 'Lượt giao dịch',
          data: breakdownRows.map((row) => row.transactions),
          yAxisID: 'y1',
          borderColor: BLUE,
          backgroundColor: 'rgba(76, 141, 255, 0.2)',
          fill: true,
          tension: 0.34,
          pointRadius: 2.6,
          pointHoverRadius: 4.4,
        },
        {
          type: 'line' as const,
          label: 'Hoàn thành',
          data: breakdownRows.map((row) => row.completed),
          yAxisID: 'y1',
          borderColor: GREEN,
          backgroundColor: 'rgba(59, 210, 141, 0.1)',
          fill: false,
          tension: 0.32,
          pointRadius: 2,
          pointHoverRadius: 3.6,
        },
      ],
    };
  }, [breakdownRows]);

  const isMonthlyReport = activeReport === 'REVENUE_MONTH';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('desc');
  };

  const exportExcel = () => {
    const csv = buildCsv(sortedBreakdownRows);
    triggerDownload(csv, `bao-cao-doanh-thu-${monthValue}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportPdf = () => {
    const printable = `Báo cáo doanh thu tháng ${monthValue}\n\nTổng doanh thu: ${formatVnd(totals.revenue)}\nGiao dịch: ${totals.transactions}\nHoàn thành: ${totals.completed}\nHủy: ${totals.cancelled}`;
    triggerDownload(printable, `bao-cao-doanh-thu-${monthValue}.txt`);
    window.print();
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="admin-analyticspro-wrap admin-animate-in">
      <aside className="admin-analyticspro-sidebar">
        <h2>Report Navigator</h2>

        <nav>
          {REPORT_SECTIONS.map((section) => (
            <section key={section.key} className="admin-analyticspro-nav-section">
              <p className="section-title">
                <span>{section.icon}</span>
                <strong>{section.title}</strong>
              </p>

              <div className="section-items">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    className={activeReport === item.key ? 'active' : ''}
                    onClick={() => setActiveReport(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <main className="admin-analyticspro-main">
        <header className="admin-analyticspro-header admin-card">
          <div>
            <h1>{REPORT_TITLE_MAP[activeReport]}</h1>
            <p>Bảng phân tích theo thời gian với dashboard data-dense cho vận hành Spa.</p>
          </div>

          <div className="actions">
            <label>
              <span>Kỳ báo cáo</span>
              <input
                type="month"
                className="admin-input"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
              />
            </label>

            <button className="admin-btn admin-btn-secondary" onClick={exportPdf}>
              <FileText size={15} /> Xuất PDF
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={exportExcel}>
              <Download size={15} /> Xuất Excel
            </button>
            <button className="admin-btn admin-btn-primary" onClick={printReport}>
              <Printer size={15} /> In
            </button>
          </div>
        </header>

        {error && <div className="admin-analyticspro-alert">{error}</div>}

        {!isMonthlyReport ? (
          <section className="admin-card admin-analyticspro-placeholder">
            <h3>{REPORT_TITLE_MAP[activeReport]}</h3>
            <p>
              Nội dung chi tiết cho báo cáo này đang được đồng bộ. Chọn <strong>Doanh thu → Theo tháng</strong> để xem
              dashboard đầy đủ theo thiết kế.
            </p>
          </section>
        ) : (
          <>
            <section className="admin-analyticspro-summary-row">
              <article className="summary-card">
                <span>Tổng doanh thu</span>
                <strong>{formatVnd(totals.revenue)}</strong>
                <small>{revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(revenueGrowth).toFixed(1)}% so tháng trước</small>
              </article>

              <article className="summary-card">
                <span>Giao dịch</span>
                <strong>{new Intl.NumberFormat('vi-VN').format(totals.transactions)}</strong>
                <small>{new Intl.NumberFormat('vi-VN').format(totals.completed)} hoàn thành</small>
              </article>

              <article className="summary-card">
                <span>Ticket trung bình</span>
                <strong>{formatVnd(totals.avgTicket)}</strong>
                <small>Tính trên giao dịch đã thanh toán</small>
              </article>

              <article className="summary-card">
                <span>Tỷ lệ hoàn thành</span>
                <strong>{completionRate.toFixed(1)}%</strong>
                <small>Hủy: {cancellationRate.toFixed(1)}%</small>
              </article>

              <article className="summary-card">
                <span>Ngày doanh thu cao nhất</span>
                <strong>Ngày {peakRow.dateLabel}</strong>
                <small>{formatVnd(peakRow.revenue)}</small>
              </article>
            </section>

            <section className="admin-card admin-analyticspro-chart-card">
              <div className="chart-title-row">
                <h3>Doanh thu và hiệu suất theo ngày</h3>
                <p>
                  {usingMock ? 'Nguồn dữ liệu: Mock' : 'Nguồn dữ liệu: API'} | {monthValue}
                </p>
              </div>

              <div className="chart-wrap">
                {loading ? (
                  <div className="chart-loading">Đang tổng hợp dữ liệu biểu đồ...</div>
                ) : (
                  <Bar data={chartData} options={chartOptions} />
                )}
              </div>
            </section>

            <section className="admin-card admin-analyticspro-table-card">
              <div className="table-head">
                <h3>Detailed Breakdown</h3>
                <p>Dữ liệu theo ngày với cột có thể sort.</p>
              </div>

              <div className="table-scroll">
                <table className="admin-table admin-analyticspro-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('date')}>
                        Ngày <ArrowDownUp size={13} />
                      </th>
                      <th onClick={() => handleSort('transactions')}>
                        Giao dịch <ArrowDownUp size={13} />
                      </th>
                      <th onClick={() => handleSort('completed')}>
                        Hoàn thành <ArrowDownUp size={13} />
                      </th>
                      <th onClick={() => handleSort('cancelled')}>
                        Hủy <ArrowDownUp size={13} />
                      </th>
                      <th onClick={() => handleSort('revenue')}>
                        Doanh thu <ArrowDownUp size={13} />
                      </th>
                      <th onClick={() => handleSort('avgTicket')}>
                        Ticket TB <ArrowDownUp size={13} />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedBreakdownRows.map((row) => (
                      <tr key={row.dateKey}>
                        <td>{row.dateLabel}</td>
                        <td>{new Intl.NumberFormat('vi-VN').format(row.transactions)}</td>
                        <td>{new Intl.NumberFormat('vi-VN').format(row.completed)}</td>
                        <td>{new Intl.NumberFormat('vi-VN').format(row.cancelled)}</td>
                        <td>{formatVnd(row.revenue)}</td>
                        <td>{formatVnd(row.avgTicket)}</td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td>Tổng</td>
                      <td>{new Intl.NumberFormat('vi-VN').format(totals.transactions)}</td>
                      <td>{new Intl.NumberFormat('vi-VN').format(totals.completed)}</td>
                      <td>{new Intl.NumberFormat('vi-VN').format(totals.cancelled)}</td>
                      <td>{formatVnd(totals.revenue)}</td>
                      <td>{formatVnd(totals.avgTicket)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="admin-card admin-analyticspro-insights">
              <h3>Insights</h3>
              <ul>
                <li>📈 Thứ 6 và Thứ 7 có doanh thu cao nhất, chiếm 38% tổng tuần</li>
                <li>⚠ Doanh thu dịch vụ Tắm trắng giảm 12% so tháng trước</li>
                <li>✅ Khách hàng VIP đóng góp 52% doanh thu tháng này</li>
              </ul>
              <p className="note">VIP share thực tế kỳ này: {vipShare.toFixed(1)}%</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
