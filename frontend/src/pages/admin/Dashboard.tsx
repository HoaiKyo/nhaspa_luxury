import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  appointmentsApi,
  invoicesApi,
  inventoryApi,
  leavesApi,
  productsApi,
  staffApi,
  usersApi,
} from '../../api/admin.api';

type AppointmentBucket = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const ACCENT = 'var(--admin-accent)';
const MUTED_TEXT = 'var(--admin-text-muted)';
const MAIN_TEXT = 'var(--admin-text)';
const HEADING_TEXT = 'var(--admin-text-heading)';

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--admin-card)',
  border: '1px solid var(--admin-border)',
  boxShadow: '0 8px 22px var(--admin-stat-shadow)',
};

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const STATUS_META: Record<AppointmentBucket, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: '#f59e0b' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#60a5fa' },
  COMPLETED: { label: 'Hoàn thành', color: '#34d399' },
  CANCELLED: { label: 'Đã hủy', color: '#f87171' },
};

type RevenuePoint = {
  label: string;
  thisWeek: number;
  lastWeek: number;
};

type StatusPoint = {
  key: AppointmentBucket;
  label: string;
  color: string;
  value: number;
};

type RecentAppointment = {
  id: number;
  customerName: string;
  customerAvatar: string;
  serviceName: string;
  date: string;
  time: string;
  status: AppointmentBucket;
};

type TopService = {
  name: string;
  bookings: number;
};

type StaffPerformance = {
  id: number | string;
  name: string;
  role: string;
  sessions: number;
  rating: number;
};

type StaffPerformanceFilter = 'DAY' | 'WEEK' | 'MONTH';

type SystemAlert = {
  id: string;
  type: 'inventory' | 'leave';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
};

type DashboardSummary = {
  weeklyRevenue: number;
  weeklyRevenueChange: number;
  weeklyAppointments: number;
  bookingRate: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  vipCustomers: number;
  averageRating: number;
  reviewCount: number;
  revenueSeries: RevenuePoint[];
  statusSeries: StatusPoint[];
  completionRate: number;
  avgWaitMinutes: number;
  recentAppointments: RecentAppointment[];
  topServices: TopService[];
  staffPerformanceByPeriod: Record<StaffPerformanceFilter, StaffPerformance[]>;
  alerts: SystemAlert[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  weeklyRevenue: 0,
  weeklyRevenueChange: 0,
  weeklyAppointments: 0,
  bookingRate: 0,
  totalCustomers: 0,
  newCustomersThisMonth: 0,
  vipCustomers: 0,
  averageRating: 0,
  reviewCount: 0,
  revenueSeries: DAY_LABELS.map((label) => ({ label, thisWeek: 0, lastWeek: 0 })),
  statusSeries: Object.entries(STATUS_META).map(([key, meta]) => ({
    key: key as AppointmentBucket,
    label: meta.label,
    color: meta.color,
    value: 0,
  })),
  completionRate: 0,
  avgWaitMinutes: 0,
  recentAppointments: [],
  topServices: [],
  staffPerformanceByPeriod: {
    DAY: [],
    WEEK: [],
    MONTH: [],
  },
  alerts: [],
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').trim();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const combineDateTime = (dateValue: any, timeValue?: any): Date | null => {
  if (!dateValue) return null;
  const datePart = String(dateValue).slice(0, 10);
  const timePart = timeValue ? String(timeValue).slice(0, 8) : '00:00:00';
  return toDateSafe(`${datePart}T${timePart}`);
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeekMonday = (date: Date): Date => {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const isBetween = (date: Date | null, start: Date, end: Date): boolean => {
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

const dayIndexMonday = (date: Date): number => (date.getDay() + 6) % 7;

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number): string => new Intl.NumberFormat('vi-VN').format(value);

const formatDate = (value: any): string => {
  const d = toDateSafe(value);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN');
};

const formatTime = (value: any): string => {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 5);
  }
  const date = toDateSafe(value);
  return date
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
};

const initialsOf = (name: string): string =>
  (name || 'KH')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'KH';

const parseTimeMinutes = (value: any): number | null => {
  if (!value) return null;
  const parts = String(value).split(':');
  if (parts.length < 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const isVipTier = (tier: any): boolean => {
  if (!tier) return false;
  const normalized = String(tier).toLowerCase();
  return /vip|gold|diamond|platinum|elite|vàng|kim cương|bạch kim/.test(normalized);
};

const normalizeAppointmentStatus = (status: any): AppointmentBucket => {
  const key = String(status || '').toUpperCase();
  if (['IN_PROGRESS', 'PROCESSING', 'CONFIRMED'].includes(key)) return 'IN_PROGRESS';
  if (['COMPLETED', 'DONE', 'FINISHED', 'PAID'].includes(key)) return 'COMPLETED';
  if (['CANCELLED', 'CANCELED', 'NO_SHOW', 'REJECTED'].includes(key)) return 'CANCELLED';
  return 'PENDING';
};

const fetchAllPages = async (
  fetcher: (page: number, pageSize: number) => Promise<any>,
  pageSize = 100,
): Promise<any[]> => {
  const rows: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetcher(page, pageSize);
    if (!res?.success || !Array.isArray(res.data)) {
      break;
    }
    rows.push(...res.data);
    totalPages = res.meta?.total_pages || 1;
    page += 1;
  } while (page <= totalPages);

  return rows;
};

const toAbsoluteMediaUrl = (value: any): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildSummary = ({
  appointments,
  invoices,
  users,
  staffMembers,
  inventoryItems,
  approvedLeaves,
  products,
}: {
  appointments: any[];
  invoices: any[];
  users: any[];
  staffMembers: any[];
  inventoryItems: any[];
  approvedLeaves: any[];
  products: any[];
}): DashboardSummary => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = endOfDay(addDays(lastWeekStart, 6));
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const todayEnd = endOfDay(now);

  const productMap = new Map<number, any>();
  products.forEach((product) => {
    if (product?.ma_san_pham) {
      productMap.set(product.ma_san_pham, product);
    }
  });

  const revenueInvoices = invoices.filter((invoice) => String(invoice?.trang_thai || '').toUpperCase() === 'PAID');

  const revenueThisWeek = Array(7).fill(0);
  const revenueLastWeek = Array(7).fill(0);

  revenueInvoices.forEach((invoice) => {
    const invoiceDate = toDateSafe(invoice.ngay_tao);
    if (!invoiceDate) return;
    const value = toNumber(invoice.thanh_tien || invoice.tong_tien);
    const idx = dayIndexMonday(invoiceDate);

    if (isBetween(invoiceDate, weekStart, weekEnd)) {
      revenueThisWeek[idx] += value;
    } else if (isBetween(invoiceDate, lastWeekStart, lastWeekEnd)) {
      revenueLastWeek[idx] += value;
    }
  });

  const weeklyRevenue = revenueThisWeek.reduce((sum, value) => sum + value, 0);
  const lastWeekRevenue = revenueLastWeek.reduce((sum, value) => sum + value, 0);
  const weeklyRevenueChange =
    lastWeekRevenue <= 0 ? (weeklyRevenue > 0 ? 100 : 0) : ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;

  const weekAppointments = appointments.filter((appt) =>
    isBetween(toDateSafe(appt.ngay_hen), weekStart, weekEnd),
  );

  const monthlyAppointments = appointments.filter((appt) =>
    isBetween(toDateSafe(appt.ngay_hen), monthStart, monthEnd),
  );

  const statusCounts: Record<AppointmentBucket, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  weekAppointments.forEach((appt) => {
    statusCounts[normalizeAppointmentStatus(appt.trang_thai)] += 1;
  });

  const weeklyAppointments = weekAppointments.length;
  const convertedAppointments = statusCounts.IN_PROGRESS + statusCounts.COMPLETED;
  const bookingRate = weeklyAppointments > 0 ? (convertedAppointments / weeklyAppointments) * 100 : 0;
  const completionRate = weeklyAppointments > 0 ? (statusCounts.COMPLETED / weeklyAppointments) * 100 : 0;

  const waitTimes: number[] = [];
  weekAppointments.forEach((appt) => {
    const scheduled = parseTimeMinutes(appt.gio_bat_dau);
    if (scheduled === null) return;

    const detailTimes = Array.isArray(appt.chi_tiets)
      ? appt.chi_tiets
          .map((detail: any) => parseTimeMinutes(detail.gio_bat_dau))
          .filter((time: number | null): time is number => time !== null)
      : [];

    if (detailTimes.length === 0) return;
    const actualStart = Math.min(...detailTimes);
    const wait = actualStart - scheduled;
    if (wait >= 0 && wait <= 180) {
      waitTimes.push(wait);
    }
  });

  const avgWaitMinutes = waitTimes.length > 0 ? average(waitTimes) : 0;

  const statusSeries: StatusPoint[] = (Object.keys(STATUS_META) as AppointmentBucket[]).map((key) => ({
    key,
    label: STATUS_META[key].label,
    color: STATUS_META[key].color,
    value: statusCounts[key] || 0,
  }));

  const userRoleNames = (u: any): string[] =>
    Array.isArray(u?.vai_tros)
      ? u.vai_tros
          .map((role: any) => (typeof role === 'string' ? role : role?.ten_vai_tro))
          .filter(Boolean)
          .map((name: string) => name.toUpperCase())
      : [];

  let customerUsers = users.filter((u) => userRoleNames(u).includes('CUSTOMER'));
  if (customerUsers.length === 0) {
    customerUsers = users;
  }

  let totalCustomers = customerUsers.length;
  let newCustomersThisMonth = customerUsers.filter((u) => isBetween(toDateSafe(u.ngay_tao), monthStart, monthEnd)).length;
  let vipCustomers = customerUsers.filter((u) => isVipTier(u.hang_thanh_vien)).length;

  if (totalCustomers === 0) {
    const uniqueCustomers = new Set<number>();
    const newCustomers = new Set<number>();

    appointments.forEach((appt) => {
      if (!appt.ma_khach_hang) return;
      uniqueCustomers.add(appt.ma_khach_hang);
      const createdDate = toDateSafe(appt.ngay_tao) || toDateSafe(appt.ngay_hen);
      if (isBetween(createdDate, monthStart, monthEnd)) {
        newCustomers.add(appt.ma_khach_hang);
      }
    });

    totalCustomers = uniqueCustomers.size;
    newCustomersThisMonth = newCustomers.size;
    vipCustomers = 0;
  }

  const ratingValues = monthlyAppointments.flatMap((appt) => {
    const appointmentRating = toNumber((appt as any).diem_danh_gia);
    const inlineRatings = Array.isArray(appt.chi_tiets)
      ? appt.chi_tiets
          .map((detail: any) => toNumber(detail.diem_danh_gia))
          .filter((rating: number) => rating > 0)
      : [];

    if (appointmentRating > 0) {
      return [appointmentRating, ...inlineRatings];
    }

    return inlineRatings;
  });

  const reviewCount = ratingValues.length;
  const averageRating = reviewCount > 0 ? Number(average(ratingValues).toFixed(1)) : 0;

  const usersMap = new Map<number, any>();
  users.forEach((u) => {
    if (u?.ma_nguoi_dung) usersMap.set(u.ma_nguoi_dung, u);
  });

  const usersById = new Map<string, any>();
  users.forEach((u) => {
    const id = u?.ma_nguoi_dung;
    if (id !== undefined && id !== null) {
      usersById.set(String(id), u);
    }
  });

  const staffMap = new Map<string, any>();
  staffMembers.forEach((staff) => {
    const staffId = staff?.ma_nhan_vien;
    if (staffId !== undefined && staffId !== null) {
      staffMap.set(String(staffId), staff);
    }
  });

  const isCodeLikeName = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    return /^(nhân viên|nhan vien|staff)\s*#?\s*\d+$/.test(normalized);
  };

  const resolveStaffName = (staffId?: number | null, fallbackName?: string): string => {
    const directName = String(fallbackName || '').trim();
    if (directName && !isCodeLikeName(directName)) return directName;

    if (!staffId) return 'Nhân viên chưa cập nhật';

    const normalizedStaffId = String(staffId);
    const staff = staffMap.get(normalizedStaffId);

    const nameFromStaff = String(staff?.ho_ten || staff?.ten_nhan_vien || staff?.nguoi_dung?.ho_ten || '').trim();
    if (nameFromStaff) return nameFromStaff;

    const nameFromLinkedUser = String(
      staff?.ma_nguoi_dung ? usersById.get(String(staff.ma_nguoi_dung))?.ho_ten || '' : '',
    ).trim();
    if (nameFromLinkedUser) return nameFromLinkedUser;

    const nameFromDirectUserId = String(usersById.get(normalizedStaffId)?.ho_ten || '').trim();
    if (nameFromDirectUserId) return nameFromDirectUserId;

    return 'Nhân viên chưa cập nhật';
  };

  const recentAppointments: RecentAppointment[] = [...appointments]
    .map((appt) => ({ appt, dt: combineDateTime(appt.ngay_hen, appt.gio_bat_dau) }))
    .sort((a, b) => (b.dt?.getTime() || 0) - (a.dt?.getTime() || 0))
    .slice(0, 8)
    .map(({ appt }) => {
      const serviceNames = Array.isArray(appt.chi_tiets)
        ? appt.chi_tiets
            .map((detail: any) => {
              if (detail.ten_san_pham) return detail.ten_san_pham;
              if (detail.ma_san_pham) return productMap.get(detail.ma_san_pham)?.ten_san_pham || `Dịch vụ #${detail.ma_san_pham}`;
              return null;
            })
            .filter(Boolean)
        : [];

      const primaryService = serviceNames[0] || 'Chưa có dịch vụ';
      const serviceName = serviceNames.length > 1 ? `${primaryService} +${serviceNames.length - 1}` : primaryService;
      const customerName = appt.ho_ten_khach || `Khách #${appt.ma_khach_hang || '—'}`;
      const customerInfo = usersMap.get(appt.ma_khach_hang);

      return {
        id: appt.ma_lich_hen,
        customerName,
        customerAvatar: toAbsoluteMediaUrl(customerInfo?.anh_dai_dien),
        serviceName,
        date: formatDate(appt.ngay_hen),
        time: formatTime(appt.gio_bat_dau),
        status: normalizeAppointmentStatus(appt.trang_thai),
      };
    });

  const serviceCounter = new Map<string, number>();

  monthlyAppointments
    .filter((appt) => normalizeAppointmentStatus(appt.trang_thai) !== 'CANCELLED')
    .forEach((appt) => {
      if (!Array.isArray(appt.chi_tiets)) return;
      appt.chi_tiets.forEach((detail: any) => {
        const serviceName =
          detail.ten_san_pham ||
          (detail.ma_san_pham ? productMap.get(detail.ma_san_pham)?.ten_san_pham || `Dịch vụ #${detail.ma_san_pham}` : 'Dịch vụ chưa xác định');
        serviceCounter.set(serviceName, (serviceCounter.get(serviceName) || 0) + 1);
      });
    });

  const topServices: TopService[] = [...serviceCounter.entries()]
    .map(([name, bookings]) => ({ name, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  const collectStaffPerformance = (from: Date, to: Date): StaffPerformance[] => {
    const stats = new Map<
      number,
      { id: number; name: string; role: string; sessions: number; completed: number; ratings: number[] }
    >();

    appointments
      .filter((appt) => isBetween(toDateSafe(appt.ngay_hen), from, to))
      .filter((appt) => normalizeAppointmentStatus(appt.trang_thai) !== 'CANCELLED')
      .forEach((appt) => {
        if (!Array.isArray(appt.chi_tiets)) return;
        const normalizedStatus = normalizeAppointmentStatus(appt.trang_thai);

        appt.chi_tiets.forEach((detail: any) => {
          if (!detail.ma_nhan_vien) return;

          const current = stats.get(detail.ma_nhan_vien) || {
            id: detail.ma_nhan_vien,
            name: resolveStaffName(detail.ma_nhan_vien, detail.ho_ten_nhan_vien),
            role: staffMap.get(String(detail.ma_nhan_vien))?.chuc_vu || 'Kỹ thuật viên',
            sessions: 0,
            completed: 0,
            ratings: [],
          };

          current.sessions += 1;
          if (normalizedStatus === 'COMPLETED') current.completed += 1;

          const detailRating = toNumber(detail.diem_danh_gia);
          if (detailRating > 0) current.ratings.push(detailRating);

          stats.set(detail.ma_nhan_vien, current);
        });
      });

    let rows: StaffPerformance[] = [...stats.values()]
      .map((staff) => {
        const ratingFromReview = staff.ratings.length > 0 ? average(staff.ratings) : 0;
        const ratingFromCompletion = staff.sessions > 0 ? (staff.completed / staff.sessions) * 5 : 0;
        const rating = ratingFromReview > 0 ? ratingFromReview : ratingFromCompletion;

        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          sessions: staff.sessions,
          rating: Number(rating.toFixed(1)),
        };
      })
      .sort((a, b) => b.sessions - a.sessions);

    if (rows.length === 0) {
      rows = (staffMembers || []).map((staff: any) => ({
        id: staff.ma_nhan_vien,
        name: resolveStaffName(staff.ma_nhan_vien, staff.ho_ten),
        role: staff.chuc_vu || 'Kỹ thuật viên',
        sessions: 0,
        rating: 0,
      }));
    }

    return rows;
  };

  const staffPerformanceByPeriod: Record<StaffPerformanceFilter, StaffPerformance[]> = {
    DAY: collectStaffPerformance(todayStart, todayEnd),
    WEEK: collectStaffPerformance(weekStart, weekEnd),
    MONTH: collectStaffPerformance(monthStart, monthEnd),
  };

  const inventoryAlerts: SystemAlert[] = (inventoryItems || [])
    .filter((item: any) => {
      const min = toNumber(item.so_luong_toi_thieu);
      const qty = toNumber(item.so_luong);
      return min > 0 && qty <= min;
    })
    .sort((a: any, b: any) => toNumber(a.so_luong) - toNumber(b.so_luong))
    .slice(0, 6)
    .map((item: any) => {
      const qty = toNumber(item.so_luong);
      const min = toNumber(item.so_luong_toi_thieu);
      return {
        id: `inv-${item.ma_ton_kho}`,
        type: 'inventory',
        severity: qty <= 0 ? 'critical' : 'warning',
        title: item.ten_san_pham || `Vật tư #${item.ma_san_pham}`,
        detail: `Tồn kho ${formatNumber(qty)} ${item.don_vi || 'đơn vị'} (ngưỡng tối thiểu ${formatNumber(min)}).`,
      };
    });

  const leaveAlerts: SystemAlert[] = (approvedLeaves || [])
    .filter((leave: any) => {
      const end = toDateSafe(leave.ngay_ket_thuc);
      return end ? end >= todayStart : false;
    })
    .sort((a: any, b: any) => {
      const aStart = toDateSafe(a.ngay_bat_dau)?.getTime() || 0;
      const bStart = toDateSafe(b.ngay_bat_dau)?.getTime() || 0;
      return aStart - bStart;
    })
    .slice(0, 6)
    .map((leave: any) => ({
      id: `leave-${leave.ma_nghi_phep}`,
      type: 'leave',
      severity: 'info' as const,
      title: resolveStaffName(leave.ma_nhan_vien),
      detail: `Nghỉ phép đã duyệt: ${formatDate(leave.ngay_bat_dau)} - ${formatDate(leave.ngay_ket_thuc)}.`,
    }));

  const severityRank: Record<SystemAlert['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  const alerts = [...inventoryAlerts, ...leaveAlerts].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );

  return {
    weeklyRevenue,
    weeklyRevenueChange,
    weeklyAppointments,
    bookingRate,
    totalCustomers,
    newCustomersThisMonth,
    vipCustomers,
    averageRating,
    reviewCount,
    revenueSeries: DAY_LABELS.map((label, idx) => ({
      label,
      thisWeek: revenueThisWeek[idx],
      lastWeek: revenueLastWeek[idx],
    })),
    statusSeries,
    completionRate,
    avgWaitMinutes,
    recentAppointments,
    topServices,
    staffPerformanceByPeriod,
    alerts,
  };
};

const statusBadgeStyle = (status: AppointmentBucket): React.CSSProperties => {
  const color = STATUS_META[status]?.color || '#94a3b8';
  return {
    background: `${color}22`,
    border: `1px solid ${color}55`,
    color,
  };
};

const trendColor = (value: number): string => {
  if (value > 0) return '#22c55e';
  if (value < 0) return '#ef4444';
  return 'var(--admin-text-muted)';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [staffPeriodFilter, setStaffPeriodFilter] = useState<StaffPerformanceFilter>('MONTH');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [appointments, invoices, users, staffMembers, inventoryItems, products, approvedLeaves] =
          await Promise.all([
            fetchAllPages((page, pageSize) => appointmentsApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => invoicesApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => usersApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => staffApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => inventoryApi.list(page, pageSize), 120),
            fetchAllPages((page, pageSize) => productsApi.list(page, pageSize), 120),
            (async () => {
              const res = await leavesApi.list(undefined, 'APPROVED');
              return res?.success && Array.isArray(res.data) ? res.data : [];
            })(),
          ]);

        if (!mounted) return;

        setSummary(
          buildSummary({
            appointments,
            invoices,
            users,
            staffMembers,
            inventoryItems,
            approvedLeaves,
            products,
          }),
        );
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError('Không thể tải đầy đủ dữ liệu dashboard. Vui lòng kiểm tra kết nối API.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const maxRevenueValue = useMemo(() => {
    const values = summary.revenueSeries.flatMap((item) => [item.thisWeek, item.lastWeek]);
    return Math.max(...values, 1);
  }, [summary.revenueSeries]);

  const totalStatus = useMemo(
    () => summary.statusSeries.reduce((sum, item) => sum + item.value, 0),
    [summary.statusSeries],
  );

  const donutSegments = useMemo(() => {
    const radius = 78;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return summary.statusSeries.map((item) => {
      const ratio = totalStatus > 0 ? item.value / totalStatus : 0;
      const length = ratio * circumference;
      const segment = {
        ...item,
        radius,
        circumference,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      };
      offset += length;
      return segment;
    });
  }, [summary.statusSeries, totalStatus]);

  const topServiceMax = Math.max(...summary.topServices.map((item) => item.bookings), 1);
  const staffPerformanceRows = summary.staffPerformanceByPeriod[staffPeriodFilter] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent"
          style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="admin-animate-in space-y-5" style={{ color: MAIN_TEXT, fontFamily: 'inherit' }}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold" style={{ color: HEADING_TEXT }}>
          Tổng quan vận hành Spa
        </h1>
        <p className="text-sm" style={{ color: MUTED_TEXT }}>
          Xin chào {user?.ho_ten || 'quản trị viên'}, dữ liệu đang được tổng hợp trực tiếp từ hệ thống.
        </p>
        {error && (
          <div
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg w-fit"
            style={{
              background: 'rgba(248, 113, 113, 0.12)',
              border: '1px solid rgba(248, 113, 113, 0.32)',
              color: '#fca5a5',
            }}
          >
            <AlertTriangle size={16} /> {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold" style={{ color: HEADING_TEXT }}>
              Doanh thu tuần này
            </h2>
            <TrendingUp size={18} color={ACCENT} />
          </div>
          <p className="text-2xl font-semibold" style={{ color: HEADING_TEXT }}>
            {formatCurrency(summary.weeklyRevenue)}
          </p>
          <p className="text-sm mt-2" style={{ color: trendColor(summary.weeklyRevenueChange) }}>
            {summary.weeklyRevenueChange >= 0 ? '+' : ''}
            {summary.weeklyRevenueChange.toFixed(1)}% so với tuần trước
          </p>
        </div>

        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold" style={{ color: HEADING_TEXT }}>
              Lịch hẹn tuần này
            </h2>
            <CalendarDays size={18} color={ACCENT} />
          </div>
          <p className="text-2xl font-semibold" style={{ color: HEADING_TEXT }}>
            {formatNumber(summary.weeklyAppointments)}
          </p>
          <p className="text-sm mt-2" style={{ color: MUTED_TEXT }}>
            Tỷ lệ xử lý: <span style={{ color: ACCENT }}>{summary.bookingRate.toFixed(1)}%</span>
          </p>
        </div>

        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold" style={{ color: HEADING_TEXT }}>
              Khách hàng
            </h2>
            <Users size={18} color={ACCENT} />
          </div>
          <p className="text-2xl font-semibold" style={{ color: HEADING_TEXT }}>
            {formatNumber(summary.totalCustomers)}
          </p>
          <p className="text-sm mt-2" style={{ color: MUTED_TEXT }}>
            Mới tháng này: <span style={{ color: ACCENT }}>{formatNumber(summary.newCustomersThisMonth)}</span> • VIP:{' '}
            <span style={{ color: HEADING_TEXT }}>{formatNumber(summary.vipCustomers)}</span>
          </p>
        </div>

        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold" style={{ color: HEADING_TEXT }}>
              Đánh giá dịch vụ
            </h2>
            <Star size={18} color={ACCENT} />
          </div>
          <p className="text-2xl font-semibold" style={{ color: HEADING_TEXT }}>
            {summary.reviewCount > 0 ? `${summary.averageRating.toFixed(1)}/5` : '—'}
          </p>
          <p className="text-sm mt-2" style={{ color: MUTED_TEXT }}>
            {summary.reviewCount > 0
              ? `${formatNumber(summary.reviewCount)} lượt đánh giá`
              : 'Chưa có dữ liệu đánh giá trong DB'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold" style={{ color: HEADING_TEXT }}>
              Doanh thu: Tuần này vs Tuần trước
            </h2>
            <div className="flex items-center gap-3 text-xs" style={{ color: MUTED_TEXT }}>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: ACCENT }} />Tuần này
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(16, 185, 129, 0.35)' }} />Tuần trước
              </span>
            </div>
          </div>

          <div className="h-60 flex items-end gap-3">
            {summary.revenueSeries.map((item) => {
              const thisWeekHeight = item.thisWeek > 0 ? Math.max((item.thisWeek / maxRevenueValue) * 100, 7) : 0;
              const lastWeekHeight = item.lastWeek > 0 ? Math.max((item.lastWeek / maxRevenueValue) * 100, 7) : 0;

              return (
                <div key={item.label} className="flex-1 min-w-[40px] flex flex-col items-center gap-2">
                  <div
                    className="w-full h-48 flex items-end justify-center gap-1.5 rounded-md"
                    style={{ background: 'var(--admin-table-row-hover)' }}
                  >
                    <div
                      className="w-3 rounded-t-sm"
                      style={{
                        height: `${lastWeekHeight}%`,
                        background: 'rgba(16, 185, 129, 0.35)',
                      }}
                      title={`Tuần trước: ${formatCurrency(item.lastWeek)}`}
                    />
                    <div
                      className="w-3 rounded-t-sm"
                      style={{
                        height: `${thisWeekHeight}%`,
                        background: ACCENT,
                      }}
                      title={`Tuần này: ${formatCurrency(item.thisWeek)}`}
                    />
                  </div>
                  <span className="text-xs" style={{ color: MUTED_TEXT }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: HEADING_TEXT }}>
            Trạng thái lịch hẹn
          </h2>

          <div className="flex flex-col items-center">
            <div className="relative w-[220px] h-[220px]">
              <svg width="220" height="220" viewBox="0 0 220 220">
                <g transform="translate(110,110) rotate(-90)">
                  <circle r="78" cx="0" cy="0" fill="none" stroke="var(--admin-border)" strokeWidth="20" />
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.key}
                      r={segment.radius}
                      cx="0"
                      cy="0"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="20"
                      strokeLinecap="butt"
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.dashOffset}
                    />
                  ))}
                </g>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-semibold" style={{ color: HEADING_TEXT }}>
                  {summary.completionRate.toFixed(0)}%
                </p>
                <p className="text-xs" style={{ color: MUTED_TEXT }}>
                  hoàn thành
                </p>
              </div>
            </div>

            <div className="w-full mt-2 space-y-2">
              {summary.statusSeries.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <div className="inline-flex items-center gap-2" style={{ color: MAIN_TEXT }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    {item.label}
                  </div>
                  <span style={{ color: HEADING_TEXT }}>{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--admin-table-row-hover)', border: '1px solid var(--admin-border)' }}
              >
                <p className="text-xs" style={{ color: MUTED_TEXT }}>
                  Tỷ lệ hoàn thành
                </p>
                <p className="text-lg font-semibold" style={{ color: HEADING_TEXT }}>
                  {summary.completionRate.toFixed(1)}%
                </p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--admin-table-row-hover)', border: '1px solid var(--admin-border)' }}
              >
                <p className="text-xs" style={{ color: MUTED_TEXT }}>
                  Chờ trung bình
                </p>
                <p className="text-lg font-semibold" style={{ color: HEADING_TEXT }}>
                  {summary.avgWaitMinutes.toFixed(0)} phút
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: HEADING_TEXT }}>
              Lịch hẹn gần đây
            </h2>
            <span className="text-xs" style={{ color: MUTED_TEXT }}>
              Mới nhất
            </span>
          </div>

          {summary.recentAppointments.length === 0 ? (
            <div className="py-14 text-center text-sm" style={{ color: MUTED_TEXT }}>
              Không có lịch hẹn.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase" style={{ color: MUTED_TEXT }}>
                    <th className="pb-3 pr-3 font-medium">Khách hàng</th>
                    <th className="pb-3 pr-3 font-medium">Dịch vụ</th>
                    <th className="pb-3 pr-3 font-medium">Ngày</th>
                    <th className="pb-3 pr-3 font-medium">Giờ</th>
                    <th className="pb-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentAppointments.map((row) => (
                    <tr key={row.id} className="border-t" style={{ borderColor: 'var(--admin-border)' }}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          {row.customerAvatar ? (
                            <img
                              src={row.customerAvatar}
                              alt={row.customerName}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                              style={{ background: 'var(--admin-table-row-hover)', color: HEADING_TEXT }}
                            >
                              {initialsOf(row.customerName)}
                            </div>
                          )}
                          <span className="text-sm" style={{ color: MAIN_TEXT }}>
                            {row.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-sm" style={{ color: MAIN_TEXT }}>
                        {row.serviceName}
                      </td>
                      <td className="py-3 pr-3 text-sm" style={{ color: MAIN_TEXT }}>
                        {row.date}
                      </td>
                      <td className="py-3 pr-3 text-sm" style={{ color: MAIN_TEXT }}>
                        {row.time}
                      </td>
                      <td className="py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                          style={statusBadgeStyle(row.status)}
                        >
                          {STATUS_META[row.status]?.label || row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: HEADING_TEXT }}>
            Top 5 dịch vụ
          </h2>

          {summary.topServices.length === 0 ? (
            <div className="py-14 text-center text-sm" style={{ color: MUTED_TEXT }}>
              Không có dữ liệu dịch vụ trong tháng.
            </div>
          ) : (
            <div className="space-y-4">
              {summary.topServices.map((service) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span style={{ color: MAIN_TEXT }}>{service.name}</span>
                    <span style={{ color: ACCENT }}>{formatNumber(service.bookings)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--admin-table-row-hover)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(service.bookings / topServiceMax) * 100}%`,
                        background: ACCENT,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold" style={{ color: HEADING_TEXT }}>
              Hiệu suất nhân viên
            </h2>
            <div className="inline-flex items-center gap-1.5">
              {([
                { key: 'DAY', label: 'Ngày' },
                { key: 'WEEK', label: 'Tuần' },
                { key: 'MONTH', label: 'Tháng' },
              ] as Array<{ key: StaffPerformanceFilter; label: string }>).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setStaffPeriodFilter(option.key)}
                  className="px-2.5 py-1 rounded-md border text-xs font-medium"
                  style={
                    staffPeriodFilter === option.key
                      ? {
                          background: 'var(--admin-sidebar-link-active-bg)',
                          borderColor: 'rgba(16, 185, 129, 0.35)',
                          color: ACCENT,
                        }
                      : {
                          background: 'var(--admin-table-row-hover)',
                          borderColor: 'var(--admin-border)',
                          color: MUTED_TEXT,
                        }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {staffPerformanceRows.length === 0 ? (
            <div className="py-14 text-center text-sm" style={{ color: MUTED_TEXT }}>
              Không có dữ liệu hiệu suất.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {staffPerformanceRows.map((staff) => (
                <div
                  key={staff.id}
                  className="rounded-lg p-3 flex items-center justify-between"
                  style={{ background: 'var(--admin-table-row-hover)', border: '1px solid var(--admin-border)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: HEADING_TEXT }}>
                      {staff.name}
                    </p>
                    <p className="text-xs" style={{ color: MUTED_TEXT }}>
                      {staff.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: MAIN_TEXT }}>
                      {formatNumber(staff.sessions)} lượt
                    </p>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-5" style={PANEL_STYLE}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: HEADING_TEXT }}>
            Cảnh báo hệ thống
          </h2>

          {summary.alerts.length === 0 ? (
            <div className="py-14 text-center text-sm" style={{ color: MUTED_TEXT }}>
              Không có cảnh báo tồn kho hoặc nghỉ phép.
            </div>
          ) : (
            <div className="space-y-3">
              {summary.alerts.slice(0, 8).map((alert) => {
                const accent =
                  alert.severity === 'critical'
                    ? '#ef4444'
                    : alert.severity === 'warning'
                      ? '#f59e0b'
                      : '#60a5fa';
                return (
                  <div
                    key={alert.id}
                    className="rounded-lg p-3"
                    style={{
                      background: 'var(--admin-table-row-hover)',
                      border: `1px solid ${accent}55`,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {alert.type === 'inventory' ? (
                        <AlertTriangle size={16} color={accent} />
                      ) : (
                        <CalendarDays size={16} color={accent} />
                      )}
                      <div>
                        <p className="text-sm font-medium" style={{ color: HEADING_TEXT }}>
                          {alert.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: MUTED_TEXT }}>
                          {alert.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
